"use strict";
// DUVERO calculator UI. Shares authenticated API/session with admin.js.
let calcDefs=[],calcSuppliers=[],calcFactors={air:1000/6,road:1000/3,rail:1000/3,sea:1000},calcItems=[],calcService="air";
const calcBasis={flat:"Flat",gross:"Per gross kg",cw:"Per chargeable kg",cbm:"Per m³",rt:"Per RT"};
const calcNum=v=>Math.max(0,Number(v)||0);
const calcFmt=n=>Number(n||0).toLocaleString("en-GB",{maximumFractionDigits:2,minimumFractionDigits:2});
const calcOption=(value,label,selectedValue)=>'<option value="'+esc(value)+'"'+(String(value)===String(selectedValue)?" selected":"")+'>'+esc(label)+'</option>';
async function calcLoadMasters(){
 const results=await Promise.all(["suppliers","charge-definitions","conversion-factors"].map(x=>api("/admin/"+x)));
 calcSuppliers=results[0].items||[];calcDefs=results[1].items||[];
 for(const f of results[2].items||[])calcFactors[f.name]=Number(f.value);
}
function calcCargo(d){
 let gross=0,cbm=0;
 if(d.noDimensions){gross=calcNum(d.totalWeight);cbm=calcNum(d.totalCbm)}
 else for(const c of Array.isArray(d.cargo)?d.cargo:[]){const qty=calcNum(c.qty);gross+=qty*calcNum(c.weight);cbm+=qty*calcNum(c.length)*calcNum(c.width)*calcNum(c.height)/1e6}
 return {gross,cbm};
}
function calcWeight(){
 const gross=calcNum($("calcGross").value),cbm=calcNum($("calcCbm").value);
 const automaticCW=Math.max(gross,cbm*(calcFactors[calcService]||1000/6));
 const manual=$("calcManual").value.trim(),cw=manual===""?automaticCW:calcNum(manual);
 return {gross,cbm,automaticCW,cw,rt:Math.max(cbm,gross/1000)};
}
function calcCompute(){
 const w=calcWeight();$("calcAuto").value=calcFmt(w.automaticCW);
 let net=0,sale=0;
 for(const x of calcItems){const qty={flat:1,gross:w.gross,cw:w.cw,cbm:w.cbm,rt:w.rt}[x.basis]||0;x.quantity=qty;x.netTotal=Math.round(qty*calcNum(x.netRate)*100)/100;x.saleTotal=Math.round(qty*calcNum(x.saleRate)*100)/100;net+=x.netTotal;sale+=x.saleTotal}
 $("calcSummary").textContent="CW: "+calcFmt(w.cw)+" kg | Net: "+calcFmt(net)+" | Sale: "+calcFmt(sale)+" | Profit: "+calcFmt(sale-net)+" "+$("currency").value;
 document.querySelectorAll("[data-calc-total]").forEach(el=>{const x=calcItems[Number(el.dataset.calcTotal)];if(x)el.textContent="Qty "+calcFmt(x.quantity)+" · Net "+calcFmt(x.netTotal)+" · Sale "+calcFmt(x.saleTotal)});
}
function calcDraw(){
 $("calcRows").innerHTML=["Origin","Destination"].map(section=>'<h4>'+section+'</h4>'+calcItems.map((x,i)=>x.section!==section?"":'<div class="panel" style="padding:12px;margin:8px 0"><div class="grid"><div><label>Charge line</label><select data-ci="'+i+'" data-ck="definition">'+calcOption("","Select / custom",x.definition)+calcDefs.filter(d=>d.active!==0).map(d=>calcOption(d.id,d.name,x.definition)).join("")+'</select><input style="margin-top:6px" data-ci="'+i+'" data-ck="description" value="'+esc(x.description)+'" placeholder="Description"></div><div><label>Supplier (internal)</label><select data-ci="'+i+'" data-ck="supplier">'+calcOption("","No supplier",x.supplier)+calcSuppliers.filter(d=>d.active!==0).map(d=>calcOption(d.name,d.name,x.supplier)).join("")+'</select></div><div><label>Basis</label><select data-ci="'+i+'" data-ck="basis">'+Object.entries(calcBasis).map(([k,v])=>calcOption(k,v,x.basis)).join("")+'</select></div><div><label>Section</label><select data-ci="'+i+'" data-ck="section">'+["Origin","Destination"].map(k=>calcOption(k,k,x.section)).join("")+'</select></div><div><label>Net rate</label><input type="number" min="0" step="0.0001" data-ci="'+i+'" data-ck="netRate" value="'+esc(x.netRate)+'"></div><div><label>Sale rate</label><input type="number" min="0" step="0.0001" data-ci="'+i+'" data-ck="saleRate" value="'+esc(x.saleRate)+'"></div></div><div class="bar"><small data-calc-total="'+i+'"></small><button class="secondary" type="button" data-calc-remove="'+i+'">Remove</button></div></div>').join("")) .join("");
 calcCompute();
}
$("calcRows").addEventListener("input",calcEdit);
$("calcRows").addEventListener("change",calcEdit);
function calcEdit(e){
 const i=e.target.dataset.ci,key=e.target.dataset.ck;if(i===undefined||!key)return;
 const x=calcItems[Number(i)];if(!x)return;
 if(key==="definition"){const d=calcDefs.find(z=>String(z.id)===e.target.value);if(d){x.definition=d.id;x.description=d.name;x.basis=d.basis;x.section=d.section}else x.definition=""}
 else x[key]=e.target.value;
 if(["definition","section"].includes(key))calcDraw();else calcCompute();
}
$("calcRows").addEventListener("click",e=>{const i=e.target.dataset.calcRemove;if(i!==undefined){calcItems.splice(Number(i),1);calcDraw()}});
$("calcAdd").onclick=()=>{calcItems.push({description:"",basis:"flat",section:"Origin",supplier:"",netRate:"",saleRate:""});calcDraw()};
for(const id of ["calcGross","calcCbm","calcManual"])$(id).addEventListener("input",calcCompute);
const oldOpen=open;
open=function(x){oldOpen(x);calcService=String(x.service||"air").toLowerCase();const d=x.payload||{},cargo=calcCargo(d),saved=x.calculation_data||{};
 $("calcGross").value=saved.grossKg??cargo.gross;$("calcCbm").value=saved.cbm??cargo.cbm;$("calcManual").value=saved.manualCW??"";
 calcItems=Array.isArray(saved.lines)&&saved.lines.length?saved.lines.map(y=>({...y,netRate:y.netRate??0,saleRate:y.saleRate??0})):Array.isArray(x.price_lines)&&x.price_lines.length?x.price_lines.map((y,i)=>({description:y.description,basis:"flat",section:"Origin",netRate:x.cost_lines?.[i]?.amount||0,saleRate:y.amount||0,supplier:x.cost_lines?.[i]?.supplier||""})):calcDefs.filter(z=>z.active!==0).map(z=>({definition:z.id,description:z.name,basis:z.basis,section:z.section,supplier:"",netRate:"",saleRate:""}));
 calcDraw();calcLoadMasters().then(()=>{if(!calcItems.length)calcItems=calcDefs.filter(z=>z.active!==0).map(z=>({definition:z.id,description:z.name,basis:z.basis,section:z.section,supplier:"",netRate:"",saleRate:""}));calcDraw()}).catch(e=>message("Calculator setup unavailable: "+e.message));
 $("details").insertAdjacentHTML("beforeend",'<details><summary>Full RFQ details</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(JSON.stringify(d,null,2))+'</pre></details>');
};
$("calcSave").onclick=async()=>{
 if(!selected)return;
 if(selected.status==="Quoted"){message("This quotation was sent. Use the existing Revise sale price workflow to create a revised draft before recalculating.");return}
 if(calcItems.some(x=>!String(x.description||"").trim())){message("Every charge line needs a description.");return}
 try{
  const w=calcWeight();const result=await api("/admin/enquiries/"+selected.id+"/calculation",{method:"PUT",body:JSON.stringify({grossKg:w.gross,cbm:w.cbm,manualCW:$("calcManual").value,lines:calcItems})});
  selected=result.enquiry;
  lines=selected.price_lines.map((p,i)=>({...p,net:selected.cost_lines?.[i]?.amount||0}));
  costLines=selected.cost_lines;drawLines();drawFinance();message("Calculated quotation saved. Customer PDF shows sale prices only.");
 }catch(e){message("Could not save calculation: "+e.message)}
};
function calcShowSetup(kind){
 $("list").classList.add("hidden");$("setupPanel").classList.remove("hidden");$("setupTitle").textContent={suppliers:"Suppliers",charges:"Charge Lines",factors:"Conversion Factors"}[kind];
 const items=$("setupItems"),form=$("setupForm");items.textContent="Loading...";
 calcLoadMasters().then(()=>{
 if(kind==="suppliers"){
  items.innerHTML='<label for="supplierSearch">Find existing supplier</label><input id="supplierSearch" type="search" placeholder="Search company name or email"><p class="muted" id="supplierCount"></p><div id="supplierResults"></div>';const supplierRender=()=>{const q=$("supplierSearch").value.trim().toLocaleLowerCase(),found=calcSuppliers.filter(x=>[x.name,x.email].some(v=>String(v||"").toLocaleLowerCase().includes(q)));$("supplierCount").textContent=found.length+" suppliers";$("supplierResults").innerHTML=found.map(x=>'<div class="item" data-edit-supplier="'+x.id+'"><strong>'+esc(x.name)+'</strong> · '+esc(x.email||"")+' · '+esc((x.categories||[]).join(", "))+'</div>').join("")||"No suppliers found";};supplierRender();$("supplierSearch").addEventListener("input",supplierRender);
  form.innerHTML='<h3>Add supplier</h3><label>Name</label><input id="newSupplierName"><label>Email (optional)</label><input id="newSupplierEmail"><label>Service categories (comma separated)</label><input id="newSupplierCategories" placeholder="Air freight, THC, Delivery"><p id="supplierDuplicate" class="muted"></p><div class="actions"><button id="createSupplier">Save supplier</button></div>';
  $("newSupplierName").addEventListener("input",()=>{const n=$("newSupplierName").value.trim().toLocaleLowerCase().replace(/[^a-z0-9]/g,"");const existing=calcSuppliers.find(x=>x.name.toLocaleLowerCase().replace(/[^a-z0-9]/g,"")===n);$("supplierDuplicate").textContent=existing?"Already registered: "+existing.name+". Select it in the list instead of creating a duplicate.":"";});
  $("createSupplier").onclick=()=>{const name=$("newSupplierName").value.trim(),norm=name.toLocaleLowerCase().replace(/[^a-z0-9]/g,"");if(calcSuppliers.some(x=>x.name.toLocaleLowerCase().replace(/[^a-z0-9]/g,"")===norm)){message("Supplier already exists. Select the existing company.");return}calcCreate(kind,{name,email:$("newSupplierEmail").value,categories:$("newSupplierCategories").value.split(",").map(x=>x.trim()).filter(Boolean)})};
 }else if(kind==="charges"){
  items.innerHTML=calcDefs.map(x=>'<div class="item" data-edit-charge="'+x.id+'"><strong>'+esc(x.name)+'</strong> · '+esc(x.section)+' · '+esc(calcBasis[x.basis]||x.basis)+'</div>').join("")||"No charge lines";
  form.innerHTML='<h3>Add charge line</h3><label>Name</label><input id="newChargeName"><label>Section</label><select id="newChargeSection"><option>Origin</option><option>Destination</option></select><label>Calculation basis</label><select id="newChargeBasis">'+Object.entries(calcBasis).map(([k,v])=>calcOption(k,v,"flat")).join("")+'</select><div class="actions"><button id="createCharge">Save charge line</button></div>';
  $("createCharge").onclick=()=>calcCreate(kind,{name:$("newChargeName").value,section:$("newChargeSection").value,basis:$("newChargeBasis").value});
 }else{
  items.innerHTML=Object.entries(calcFactors).map(([k,v])=>'<div class="item">'+esc(k.toUpperCase())+' · '+calcFmt(v)+' kg per m³</div>').join("");
  form.innerHTML='<h3>Change conversion factor</h3><label>Transport mode</label><select id="factorMode">'+["air","road","rail","sea"].map(x=>calcOption(x,x.toUpperCase(),x)).join("")+'</select><label>kg per m³</label><input id="factorValue" type="number" min="0.01" step="0.0001" value="'+calcFactors.air+'"><div class="actions"><button id="saveFactor">Save factor</button></div>';
  $("factorMode").onchange=()=>{$("factorValue").value=calcFactors[$("factorMode").value]};
  $("saveFactor").onclick=()=>calcCreate(kind,{name:$("factorMode").value,value:Number($("factorValue").value)});
 }
 }).catch(e=>items.textContent="Unable to load setup: "+e.message);
}
async function calcCreate(kind,data){try{await api("/admin/"+({suppliers:"suppliers",charges:"charge-definitions",factors:"conversion-factors"}[kind]),{method:"POST",body:JSON.stringify(data)});calcShowSetup(kind);message("Saved")}catch(e){message("Could not save: "+e.message)}}
$("viewSuppliers").onclick=()=>calcShowSetup("suppliers");
$("viewCharges").onclick=()=>calcShowSetup("charges");
$("viewFactors").onclick=()=>calcShowSetup("factors");
$("setupBack").onclick=()=>{$("setupPanel").classList.add("hidden");$("list").classList.remove("hidden")};

const calcOriginalQuotes=$("viewQuotes").onclick,calcOriginalCustomers=$("viewCustomers").onclick,calcOriginalArchive=$("viewArchive").onclick;
$("viewQuotes").onclick=()=>{$("setupPanel").classList.add("hidden");calcOriginalQuotes()};
$("viewCustomers").onclick=()=>{$("setupPanel").classList.add("hidden");calcOriginalCustomers()};
$("viewArchive").onclick=()=>{$("setupPanel").classList.add("hidden");calcOriginalArchive()};
$("setupItems").addEventListener("click",e=>{
 const id=e.target.closest("[data-edit-supplier]")?.dataset.editSupplier;
 if(id){const x=calcSuppliers.find(s=>String(s.id)===id);if(!x)return;$("newSupplierName").value=x.name;$("newSupplierEmail").value=x.email||"";$("newSupplierCategories").value=(x.categories||[]).join(", ");$("createSupplier").textContent="Update supplier";$("createSupplier").onclick=()=>calcUpdate("suppliers",{id:x.id,name:$("newSupplierName").value,email:$("newSupplierEmail").value,categories:$("newSupplierCategories").value.split(",").map(s=>s.trim()).filter(Boolean),active:true});}
 const cid=e.target.closest("[data-edit-charge]")?.dataset.editCharge;
 if(cid){const x=calcDefs.find(s=>String(s.id)===cid);if(!x)return;$("newChargeName").value=x.name;$("newChargeSection").value=x.section;$("newChargeBasis").value=x.basis;$("createCharge").textContent="Update charge line";$("createCharge").onclick=()=>calcUpdate("charges",{id:x.id,name:$("newChargeName").value,section:$("newChargeSection").value,basis:$("newChargeBasis").value,active:true});}
});
async function calcUpdate(kind,data){try{await api("/admin/"+(kind==="suppliers"?"suppliers":"charge-definitions"),{method:"PUT",body:JSON.stringify(data)});calcShowSetup(kind);message("Updated")}catch(e){message("Update failed: "+e.message)}}

function calcGoTop(id){$("setupPanel").classList.add("hidden");$("editor").classList.add("hidden");$("finance").classList.add("hidden");$("sendPanel").classList.add("hidden");$("list").classList.remove("hidden");$(id).click()}
for(const [top,old] of [["topQuotes","viewQuotes"],["topCustomers","viewCustomers"],["topArchive","viewArchive"],["topSuppliers","viewSuppliers"],["topCharges","viewCharges"],["topFactors","viewFactors"]])$(top).onclick=()=>calcGoTop(old);
const calcNavSync=()=>{$("topNav").classList.toggle("hidden",!sessionToken)};
const calcLoginButton=$("loginButton");calcLoginButton.addEventListener("click",()=>setTimeout(calcNavSync,500));
$("refresh").addEventListener("click",()=>setTimeout(calcNavSync,500));
calcNavSync();

function calcSetNav(view){
 const names={quotes:"Enquiries",customers:"Customers",archive:"Archive",suppliers:"Suppliers",charges:"Charge Lines",factors:"Conversion Factors"};
 const title=names[view]||"Enquiries";
 const h=document.querySelector("main h1");if(h)h.textContent=title;
 const subtitle=document.querySelector("main > .bar .muted");if(subtitle)subtitle.textContent=({quotes:"Active freight enquiries and quotations",customers:"Customers grouped by company, with their RFQs",archive:"Archived enquiries only",suppliers:"Manage suppliers",charges:"Manage predefined charge lines",factors:"Configure volumetric weight factors"})[view]||"";
 const listTitle=document.querySelector("#list h2");if(listTitle)listTitle.textContent=title;
 for(const [key,id] of Object.entries({quotes:"topQuotes",customers:"topCustomers",archive:"topArchive",suppliers:"topSuppliers",charges:"topCharges",factors:"topFactors"})){
  const el=$(id);if(el){el.setAttribute("aria-current",key===view?"page":"false");el.style.outline=key===view?"2px solid #55d6cf":""}
 }
 const isCustomer=view==="customers",isArchive=view==="archive";
 $("statusFilter").closest(".grid").classList.toggle("hidden",isCustomer||isArchive);
 $("searchEnquiries").placeholder=isCustomer?"Search customers or email...":isArchive?"Search archived enquiries...":"Search company, quote number, email, route...";
 if(isArchive&&!records.some(x=>Number(x.archived)===1))$("enquiries").textContent="No archived enquiries yet. Archive an RFQ to see it here.";
}
for(const [id,view] of [["topQuotes","quotes"],["topCustomers","customers"],["topArchive","archive"],["topSuppliers","suppliers"],["topCharges","charges"],["topFactors","factors"]]){
 $(id).onclick=()=>{calcGoTop(({quotes:"viewQuotes",customers:"viewCustomers",archive:"viewArchive",suppliers:"viewSuppliers",charges:"viewCharges",factors:"viewFactors"})[view]);calcSetNav(view)};
}
calcSetNav("quotes");
