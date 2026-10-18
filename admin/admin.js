"use strict";
const API="https://duvero-quote-api.rskovn.workers.dev";
let records=[],selected=null,lines=[],costLines=[],invoiceLines=[],sessionToken="",pricingSuppliers=[];
const $=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>Number(n||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});
async function api(path,opts={}){const r=await fetch(API+path,{...opts,headers:{"Content-Type":"application/json",...(sessionToken?{"Authorization":"Bearer "+sessionToken}:{}),...(opts.headers||{})}});if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||"Request failed ("+r.status+")");return r.json()}
function message(s){$("status").textContent=s}
function showQuotationStatus(x){
 const el=$("sendStatus");if(!el)return;
 if(x?.sent_at){
  const raw=String(x.sent_at).trim();
  const date=/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}/.test(raw)?new Date(raw.replace(" ","T")+"Z"):new Date(raw);
  const formatted=Number.isNaN(date.getTime())?raw:new Intl.DateTimeFormat("da-DK",{timeZone:"Europe/Copenhagen",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);
  el.textContent="Quoted · "+formatted;el.style.color="#08715f";
 }else{el.textContent="Not sent";el.style.color="#617987"}
}

const personalDomains=new Set(["gmail.com","googlemail.com","hotmail.com","hotmail.dk","outlook.com","outlook.dk","live.com","live.dk","msn.com","yahoo.com","icloud.com","me.com","mail.com","aol.com","proton.me","protonmail.com"]);
function customerName(x){const domain=String(x.email||"").toLowerCase().split("@")[1]||"";if(!domain)return "Unknown customer";if(personalDomains.has(domain))return "Kontantkunder";return domain.replace(/\.[^.]+$/,"")}
let adminView="quotes";
function renderEnquiries(){
 const q=$("searchEnquiries").value.trim().toLocaleLowerCase(),status=$("statusFilter").value,archive=$("archiveFilter").value;
 const filtered=records.filter(x=>{
 const text=[customerName(x),x.company,x.person,x.email,x.quote_number,x.service,x.origin,x.destination].join(" ").toLocaleLowerCase();
 return (!q||text.includes(q))&&(status==="all"||x.status===status)&&(archive==="all"||(archive==="archived"?Number(x.archived)===1:Number(x.archived)!==1));
 });
 if(adminView==="customers"){const groups=new Map();for(const x of filtered){const name=customerName(x);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(x)}$("resultCount").textContent=groups.size+" customers · "+filtered.length+" RFQs";$("enquiries").innerHTML=[...groups].sort((a,b)=>a[0].localeCompare(b[0])).map(([name,items])=>'<div class="item" data-customer="'+esc(name)+'"><strong>'+esc(name)+'</strong> · '+items.length+' RFQs<br><small>'+esc([...new Set(items.map(x=>x.email))].join(", ")) +'</small></div>').join("")||"No customers";return}
 $("resultCount").textContent=filtered.length+" enquiries";
 $("enquiries").innerHTML=filtered.length?filtered.map(x=>'<div class="item" data-id="'+esc(x.id)+'"><div class="bar"><div><strong>'+esc(customerName(x))+'</strong> · '+esc(x.company)+' <small class="muted">'+esc(x.quote_number)+'</small><br><small>'+esc(x.service)+' · '+esc(x.origin)+' → '+esc(x.destination)+'</small><br><small>'+esc(x.email)+' · '+esc(x.created_at||"")+(x.followup_date?' · Follow up: '+esc(x.followup_date):"")+'</small></div><span class="pill">'+esc(x.status)+(Number(x.archived)?" · Archived":"")+'</span></div></div>').join(""):"No enquiries match your filters";
}
async function load(){if(!sessionToken)return;try{const data=await api("/admin/enquiries");records=data.enquiries||[];renderEnquiries();message("Connected to DUVERO Admin");$("login").classList.add("hidden");$("list").classList.remove("hidden");}catch(e){message("Admin not connected: "+e.message+". Check Worker deployment and database migration.");$("enquiries").textContent="Unable to load enquiries."}}
$("viewQuotes").onclick=()=>{adminView="quotes";$("archiveFilter").value="active";renderEnquiries()};
$("viewCustomers").onclick=()=>{adminView="customers";$("archiveFilter").value="all";renderEnquiries()};
$("viewArchive").onclick=()=>{adminView="quotes";$("archiveFilter").value="archived";renderEnquiries()};
$("enquiries").addEventListener("click",e=>{const card=e.target.closest("[data-customer]");if(!card)return;adminView="quotes";$("searchEnquiries").value=card.dataset.customer;$("archiveFilter").value="all";renderEnquiries()});
for(const id of ["searchEnquiries","statusFilter","archiveFilter"])$(id).addEventListener(id==="searchEnquiries"?"input":"change",renderEnquiries);

function addLine(description="",amount="",net=""){lines.push({description,amount,net});drawLines()}
function priceTotals(){const net=lines.reduce((n,x)=>n+(Number(x.net)||0),0),sale=lines.reduce((n,x)=>n+(Number(x.amount)||0),0);$("total").textContent="Kost: "+$("currency").value+" "+money(net)+"  |  Salg: "+money(sale)+"  |  Fortjeneste: "+money(sale-net)}
async function loadPricingSuppliers(){try{const r=await api("/admin/suppliers");pricingSuppliers=(r.items||[]).filter(x=>x.active!==0).map(x=>x.name);drawLines()}catch(e){message("Supplier list unavailable: "+e.message)}}
function drawLines(){
 const options=(selectedName)=>'<option value="">Vælg leverandør</option>'+pricingSuppliers.map(n=>'<option value="'+esc(n)+'"'+(n===selectedName?' selected':'')+'>'+esc(n)+'</option>').join('');
 $("lines").innerHTML='<div class="price-head"><strong>Charge line</strong><strong>Leverandør (internt)</strong><strong>Kostpris</strong><strong>Salgspris</strong><span></span></div>'+lines.map((x,i)=>'<div class="price-row"><input data-line="'+i+'" data-key="description" placeholder="F.eks. Luftfragt" value="'+esc(x.description)+'"><select data-line="'+i+'" data-key="supplier">'+options(x.supplier||"")+'</select><input type="number" step="0.01" min="0" data-line="'+i+'" data-key="net" placeholder="0.00" value="'+esc(x.net??"")+'"><input type="number" step="0.01" min="0" data-line="'+i+'" data-key="amount" placeholder="0.00" value="'+esc(x.amount??"")+'"><button type="button" class="secondary" data-remove="'+i+'">×</button></div>').join("");
 priceTotals();
}
function renderCustomerRfq(x){
 const d=x.payload||{};
 const fields=[["Company",x.company],["Contact",x.person],["Email",x.email],["Phone",x.phone],["Registration no.",d.registrationNumber],["Company address",[d.companyAddress,d.companyPostcode,d.companyCity,d.companyCountry].filter(Boolean).join(", ")],["Service",x.service],["Direction",d.direction],["Incoterm",d.incoterm],["Transport type",d.scope],["Origin",[d.originParty,d.originAddress,d.originPostcode,d.originCity,d.originCountry].filter(Boolean).join(", ")],["Destination",[d.destParty,d.destAddress,d.destPostcode,d.destCity,d.destCountry].filter(Boolean).join(", ")],["Goods",d.commodity],["Ready date",d.ready],["Dangerous goods",d.danger],["UN number",d.un],["Tail lift",d.tailLift?"Yes":"No"],["Remarks",d.details]];
 const cargo=Array.isArray(d.cargo)?d.cargo:[];
 const goods=cargo.length?'<h4>Goods details</h4><div class="rfq-cargo">'+cargo.map((c,i)=>'<div><b>Line '+(i+1)+'</b> · '+esc(c.qty||"—")+' '+esc(c.type||c.size||"units")+' · '+esc([c.length,c.width,c.height].filter(Boolean).join(" × ")||"Dimensions not specified")+' cm · '+esc(c.weight||"—")+' kg per unit · '+esc(c.stack||"")+'</div>').join("")+'</div>':'';
 const totals=cargo.reduce((a,c)=>{const q=Math.max(0,Number(c.qty)||0);a.pieces+=q;a.kg+=q*(Number(c.weight)||0);a.cbm+=q*(Number(c.length)||0)*(Number(c.width)||0)*(Number(c.height)||0)/1000000;return a},{pieces:0,kg:0,cbm:0});
 if(d.noDimensions||!cargo.length){totals.pieces=Number(d.totalPieces)||totals.pieces;totals.kg=Number(d.totalWeight)||totals.kg;totals.cbm=Number(d.totalCbm)||totals.cbm}
 const mode=String(x.service||"").toLowerCase(),scope=String(d.scope||"").toLowerCase();
 let chargeLabel="",chargeValue="";
 if(mode==="air"){chargeLabel="Chargeable Weight";chargeValue=Math.ceil(Math.max(totals.kg,totals.cbm*167))+" kg"}
 else if((mode==="sea"||mode==="rail")&&!scope.includes("fcl")){chargeLabel="Revenue Tons (W/M)";chargeValue=Math.max(totals.kg/1000,totals.cbm).toFixed(3)+" RT"}
 else if(mode==="road"){chargeLabel="Chargeable Weight";chargeValue=Math.ceil(Math.max(totals.kg,totals.cbm*333))+" kg"}
 const summary=(cargo.length||d.noDimensions)?'<div style="margin-top:14px;padding:13px 15px;background:#eaf4f6;border-radius:7px;font-weight:700">Total: '+esc(totals.pieces)+' kolli · '+esc(money(totals.kg))+' kg · '+esc(totals.cbm.toFixed(3))+' m³'+(chargeLabel?' · '+esc(chargeLabel)+': '+esc(chargeValue):'')+'</div>':'';
 return '<div class="rfq-info">'+fields.filter(x=>x[1]!==undefined&&x[1]!==null&&x[1]!=="").map(([k,v])=>'<div><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>').join("")+'</div>'+goods+summary;
}

function open(x){selected=x;const d=x.payload||{};$("heading").textContent=x.quote_number+" · "+x.service;$("details").innerHTML=renderCustomerRfq(x);$("currency").value=x.currency||"EUR";$("transit").value=x.transit||"";$("validity").value=x.validity||7;$("incoterm").value=x.incoterm||d.incoterm||"";$("remarks").value=x.remarks||"";lines=Array.isArray(x.price_lines)?x.price_lines.map((a,i)=>({...a,net:x.cost_lines?.[i]?.amount??"",supplier:x.cost_lines?.[i]?.supplier||""})):[];if(!lines.length)lines=[{description:"",supplier:"",net:"",amount:""}];drawLines();costLines=x.cost_lines||[];invoiceLines=x.invoice_lines||[];$("actualPieces").value=x.shipment_actual?.pieces||"";$("actualWeight").value=x.shipment_actual?.weight||"";$("actualCbm").value=x.shipment_actual?.cbm||"";drawFinance();$("trackingStatus").value=x.status==="Revised draft"?"Revised draft":x.status;$("followupDate").value=x.followup_date||"";$("internalNotes").value=x.internal_notes||"";$("archiveQuote").checked=Number(x.archived)===1;drawFinance();$("finance").classList.remove("hidden");$("list").classList.add("hidden");$("editor").classList.remove("hidden");$("sendPanel").classList.add("hidden");showQuotationStatus(x);loadEmails();loadPricingSuppliers()}
async function loadEmails(){if(!selected)return;const id=selected.id;try{const data=await api("/admin/enquiries/"+id+"/emails");if(!selected||selected.id!==id)return;$("savedEmails").innerHTML=(data.emails||[]).map(m=>'<details class="item"><summary><strong>'+esc(m.subject||"Email")+'</strong> · '+esc(m.email_date||m.created_at||"")+'</summary><small>From: '+esc(m.sender)+' · To: '+esc(m.recipient)+'</small><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit">'+esc(m.body)+'</pre></details>').join("")||'<p class="muted">No emails saved yet.</p>'}catch(e){$("savedEmails").textContent="Could not load emails: "+e.message}}
$("saveEmail").onclick=async()=>{if(!selected)return;try{await api("/admin/enquiries/"+selected.id+"/emails",{method:"POST",body:JSON.stringify({sender:$("emailFrom").value,recipient:$("emailTo").value,subject:$("emailSubject").value,email_date:$("emailDate").value,body:$("emailBody").value})});$("emailBody").value="";$("emailSubject").value="";await loadEmails();message("Email saved on RFQ")}catch(e){message("Could not save email: "+e.message)}};
function payload(){return {currency:$("currency").value,transit:$("transit").value,validity:Number($("validity").value),incoterm:$("incoterm").value,remarks:$("remarks").value,price_lines:lines.map(x=>({description:x.description,amount:Number(x.amount)||0}))}}
async function saveNetCosts(){const costs=lines.filter(x=>x.description.trim()).map(x=>({description:x.description,amount:Number(x.net)||0,supplier:x.supplier||""}));const result=await api("/admin/enquiries/"+selected.id+"/finance",{method:"PUT",body:JSON.stringify({cost_lines:costs,invoice_lines:invoiceLines,shipment_actual:selected.shipment_actual||{},revise_sale:false})});selected=result.enquiry;costLines=costs;}
async function save(){if(!selected)return;const updated=await api("/admin/enquiries/"+encodeURIComponent(selected.id),{method:"PUT",body:JSON.stringify(payload())});selected=updated.enquiry;await saveNetCosts();return selected}
$("enquiries").addEventListener("click",e=>{const id=e.target.closest("[data-id]")?.dataset.id;const x=records.find(r=>String(r.id)===id);if(x)open(x)});
$("lines").addEventListener("input",e=>{const i=e.target.dataset.line;if(i!==undefined){lines[+i][e.target.dataset.key]=e.target.value;priceTotals()}});
$("lines").addEventListener("change",e=>{const i=e.target.dataset.line;if(i!==undefined&&e.target.dataset.key==="supplier")lines[+i].supplier=e.target.value});
$("lines").addEventListener("click",e=>{const i=e.target.dataset.remove;if(i!==undefined){lines.splice(+i,1);drawLines()}});
$("currency").addEventListener("change",drawLines);
$("addLine").onclick=()=>addLine();$("refresh").onclick=load;
$("back").onclick=()=>{$("editor").classList.add("hidden");$("finance").classList.add("hidden");$("list").classList.remove("hidden");$("sendPanel").classList.add("hidden");load()};
$("save").onclick=async()=>{try{await save();message("Draft saved")}catch(e){message("Could not save: "+e.message)}};
$("previewDesign").onclick=async()=>{
 let stage="save";
 try{
  if(!selected)throw Error("Select an RFQ first");
  await save();
  stage="template";
  const html=await window.DUVEROQuotationRenderer.render(selected);
  document.getElementById("duvero-preview-overlay")?.remove();
  const overlay=document.createElement("div");overlay.id="duvero-preview-overlay";
  overlay.style.cssText="position:fixed;inset:0;z-index:99999;background:#102b44e6;display:flex;flex-direction:column;padding:12px;gap:10px";
  const bar=document.createElement("div");bar.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:12px;background:white;padding:10px 16px;border-radius:8px;font-family:Arial,sans-serif";
  const label=document.createElement("strong");label.textContent="Preview Quotation · "+selected.quote_number;
  const actions=document.createElement("div");actions.style.cssText="display:flex;gap:8px";
  const print=document.createElement("button");print.type="button";print.textContent="Print / Save PDF";print.style.cssText="padding:9px 14px;cursor:pointer";
  const close=document.createElement("button");close.type="button";close.textContent="Close preview";close.style.cssText="padding:9px 14px;cursor:pointer";
  const frame=document.createElement("iframe");frame.title="DUVERO quotation preview";frame.style.cssText="width:100%;flex:1;min-height:0;background:white;border:0;border-radius:8px";frame.srcdoc=html;
  print.onclick=()=>{try{frame.contentWindow.focus();frame.contentWindow.print()}catch(e){message("Printing unavailable: "+e.message)}};
  close.onclick=()=>overlay.remove();
  actions.append(print,close);bar.append(label,actions);overlay.append(bar,frame);document.body.append(overlay);
  message("Quotation preview ready");
 }catch(e){message("Quotation preview failed during "+stage+": "+e.message)}
};
$("preview").onclick=async()=>{try{await save();const result=await api("/admin/enquiries/"+encodeURIComponent(selected.id)+"/preview");const a=document.createElement("a");a.href="data:application/pdf;base64,"+result.pdf;a.download="DUVERO_Quotation_"+selected.quote_number+".pdf";a.click()}catch(e){message("Preview failed: "+e.message)}};
$("openSend").onclick=async()=>{try{await save();$("sendRef").textContent=selected.quote_number;$("recipient").value=selected.email;$("subject").value="DUVERO Quotation – "+selected.quote_number;$("confirm").checked=false;showQuotationStatus(selected);$("sendPanel").classList.remove("hidden");$("sendPanel").scrollIntoView({behavior:"smooth"})}catch(e){message(e.message)}};
$("cancelSend").onclick=()=>$("sendPanel").classList.add("hidden");
$("confirmSend").onclick=async()=>{if(!$("confirm").checked||!$("recipient").checkValidity()){alert("Please confirm a valid customer email address.");return}if(!confirm("Send quotation "+selected.quote_number+" to "+$("recipient").value+"?"))return;const status=$("sendStatus"),button=$("confirmSend");status.textContent="Sender tilbud…";status.style.color="#244b5d";button.disabled=true;try{await api("/admin/enquiries/"+encodeURIComponent(selected.id)+"/send",{method:"POST",body:JSON.stringify({recipient:$("recipient").value,subject:$("subject").value,confirmed:true})});const fresh=await api("/admin/enquiries").catch(()=>null);const current=fresh?.enquiries?.find(x=>String(x.id)===String(selected.id));if(current){selected=current;records=fresh.enquiries;showQuotationStatus(current)}else{status.textContent="Tilbuddet er accepteret til afsendelse. Dato og klokkeslæt kan vises efter genindlæsning.";status.style.color="#08715f"}message("Quotation sent successfully");}catch(e){status.textContent="Afsendelse mislykkedes: "+e.message;status.style.color="#b42318";message("Send failed: "+e.message)}finally{button.disabled=false}};

function drawFinance(){
 const expected=Array.isArray(selected?.cost_lines)?selected.cost_lines:[];
 const expectedRows=expected.map((c,i)=>'<tr><td>'+esc(c.description)+'</td><td>'+esc(c.supplier||"—")+'</td><td class="number">'+money(c.amount)+'</td></tr>').join("");
 $("costLines").innerHTML='<table class="invoice-table"><thead><tr><th>Charge line</th><th>Leverandør</th><th>Forventet kost</th></tr></thead><tbody>'+expectedRows+'</tbody></table>';
 const suppliers=[...new Set([...expected.map(x=>x.supplier).filter(Boolean),...pricingSuppliers])];
 const opts=v=>'<option value="">Vælg leverandør</option>'+suppliers.map(n=>'<option value="'+esc(n)+'"'+(n===v?' selected':'')+'>'+esc(n)+'</option>').join('');
 $("invoiceLines").innerHTML=invoiceLines.map((x,i)=>'<div class="invoice-entry"><div class="invoice-entry-head"><b>Faktura '+(i+1)+'</b><button class="secondary" type="button" data-remove="'+i+'">Fjern</button></div><div class="invoice-entry-grid"><label>Leverandør<select data-i="'+i+'" data-key="supplier">'+opts(x.supplier||"")+'</select></label><label>Charge line<input data-i="'+i+'" data-key="description" value="'+esc(x.description||"")+'" placeholder="F.eks. Luftfragt"></label><label>Fakturanummer<input data-i="'+i+'" data-key="invoice_number" value="'+esc(x.invoice_number||"")+'" placeholder="Fakturanr."></label><label>Fakturadato<input type="date" data-i="'+i+'" data-key="invoice_date" value="'+esc(x.invoice_date||"")+'"></label><label>Faktureret beløb<input type="number" step="0.01" min="0" data-i="'+i+'" data-key="amount" value="'+esc(x.amount??"")+'"></label><label class="invoice-checked"><input type="checkbox" data-i="'+i+'" data-key="checked"'+(x.checked?' checked':'')+'> Kontrolleret / OK</label></div><div class="invoice-variance" data-variance="'+i+'"></div></div>').join("");
 updateProfit();
}
function updateProfit(){
 const expected=Array.isArray(selected?.cost_lines)?selected.cost_lines:[];
 const cost=expected.reduce((n,x)=>n+(Number(x.amount)||0),0);
 const sale=(selected?.price_lines||[]).reduce((n,x)=>n+(Number(x.amount)||0),0);
 const invoiced=invoiceLines.reduce((n,x)=>n+(Number(x.amount)||0),0);
 const currency=selected?.currency||$("currency").value;
 const matched=new Set();
 invoiceLines.forEach((x,i)=>{
  const index=expected.findIndex((c,j)=>!matched.has(j)&&c.description===x.description&&c.supplier===x.supplier);
  if(index>=0)matched.add(index);
  const target=document.querySelector('[data-variance="'+i+'"]');
  if(!target)return;
  if(index<0){target.textContent="Ingen tilsvarende forventet kostlinje fundet";return}
  const difference=(Number(x.amount)||0)-(Number(expected[index].amount)||0);
  target.textContent="Forventet "+money(expected[index].amount)+" "+currency+" · Difference "+(difference>0?"+":"")+money(difference)+" "+currency;
 });
 const outstanding=expected.filter((x,i)=>!matched.has(i)).reduce((n,x)=>n+(Number(x.amount)||0),0);
 $("profitReport").textContent="RFQ "+(selected?.quote_number||"")+" · Valuta: "+currency+" · Forventet kost: "+money(cost)+" · Faktureret: "+money(invoiced)+" · Ikke matchet forventet kost: "+money(outstanding)+" · Forventet fortjeneste: "+money(sale-cost)+" · Foreløbig fortjeneste ved faktureret beløb + ikke matchet kost: "+money(sale-invoiced-outstanding)+". Beløb skal være i samme valuta.";
}
$("invoiceLines").addEventListener("input",e=>{const i=e.target.dataset.i;if(i!==undefined){invoiceLines[+i][e.target.dataset.key]=e.target.type==="checkbox"?e.target.checked:e.target.value;updateProfit()}});
$("invoiceLines").addEventListener("change",e=>{const i=e.target.dataset.i;if(i!==undefined){invoiceLines[+i][e.target.dataset.key]=e.target.type==="checkbox"?e.target.checked:e.target.value;updateProfit()}});
$("invoiceLines").addEventListener("click",e=>{const i=e.target.dataset.remove;if(i!==undefined){invoiceLines.splice(+i,1);drawFinance()}});
$("addCost").onclick=()=>{message("Tilføj forventede omkostninger under Charge lines ovenfor.")};
$("addInvoice").onclick=()=>{invoiceLines.push({description:"",amount:"",supplier:"",invoice_number:"",invoice_date:"",checked:false});drawFinance()};
async function financeSave(revise){const result=await api("/admin/enquiries/"+selected.id+"/finance",{method:"PUT",body:JSON.stringify({cost_lines:costLines,invoice_lines:invoiceLines,shipment_actual:{pieces:Number($("actualPieces").value)||0,weight:Number($("actualWeight").value)||0,cbm:Number($("actualCbm").value)||0},price_lines:lines,revise_sale:revise,reason:$("revisionReason").value})});selected=result.enquiry;drawFinance();message(revise?"Revised selling price saved as draft; send revised quotation separately.":"Cost and invoice details saved.");}
$("saveFinance").onclick=async()=>{try{await financeSave(false)}catch(e){message(e.message)}};
$("reviseSale").onclick=async()=>{if(!$("revisionReason").value.trim()){message("Enter a reason for the price change.");return}try{await financeSave(true)}catch(e){message(e.message)}};
$("saveTracking").onclick=async()=>{if(!selected)return;try{const result=await api("/admin/enquiries/"+selected.id+"/tracking",{method:"PUT",body:JSON.stringify({status:$("trackingStatus").value,followup_date:$("followupDate").value,internal_notes:$("internalNotes").value,archived:$("archiveQuote").checked})});selected=result.enquiry;const i=records.findIndex(x=>x.id===selected.id);if(i>=0)records[i]=selected;renderEnquiries();message("Follow-up and archive details saved.")}catch(e){message("Could not save tracking: "+e.message)}};
$("companyHistory").onclick=()=>{if(!selected)return;$("searchEnquiries").value=customerName(selected);$("statusFilter").value="all";$("archiveFilter").value="all";$("back").click();renderEnquiries();message("Showing all enquiries matching customer: "+selected.company)};
$("relatedQuotes").onclick=()=>{if(!selected)return;const group=selected.group_id;if(!group){message("No related quote group found.");return}const related=records.filter(x=>x.group_id===group);$("searchEnquiries").value="";$("statusFilter").value="all";$("archiveFilter").value="all";$("back").click();$("enquiries").innerHTML=related.map(x=>'<div class="item" data-id="'+esc(x.id)+'"><strong>'+esc(x.company)+'</strong> · '+esc(x.quote_number)+' · '+esc(x.service)+' · '+esc(x.status)+'</div>').join("");$("resultCount").textContent=related.length+" related quotes";message("Related Compare Freight quotations")};
$("loginButton").onclick=async()=>{try{const data=await api("/admin/login",{method:"POST",body:JSON.stringify({password:$("password").value})});sessionToken=data.token;$("password").value="";await load()}catch(e){message("Login failed: "+e.message)}};