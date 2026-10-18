"use strict";
(function(){
const byId=id=>document.getElementById(id);
function showList(){for(const id of ["editor","setupPanel","sendPanel"])byId(id)?.classList.add("hidden");byId("list")?.classList.remove("hidden");byId("finance")?.classList.add("hidden");}
function requireLogin(){if(sessionToken)return false;byId("login")?.classList.remove("hidden");byId("status").textContent="Log ind for at bruge adminmenuen.";return true;}
function activate(id){document.querySelectorAll("#topNav button").forEach(b=>b.style.outline=b.id===id?"2px solid #55d6cf":"");}
function navList(type){if(requireLogin())return;showList();byId("customerAddressBook")?.classList.add("hidden");byId("enquiries")?.classList.remove("hidden");byId("searchEnquiries")?.classList.remove("hidden");byId("searchEnquiries")?.previousElementSibling?.classList.remove("hidden");byId("statusFilter")?.closest(".grid")?.classList.remove("hidden");byId("archiveFilter").value=type==="archive"?"archived":"active";byId("viewQuotes").click();if(type==="archive"){byId("archiveFilter").value="archived";renderEnquiries()}activate(type==="archive"?"topArchive":"topQuotes");}
byId("topQuotes").addEventListener("click",()=>navList("quotes"));
byId("topArchive").addEventListener("click",()=>navList("archive"));
for(const id of ["topCustomers","topSuppliers"])byId(id).addEventListener("click",()=>{if(requireLogin())return;activate(id)});
async function setup(kind){
 if(requireLogin())return;
 showList();byId("list").classList.add("hidden");byId("setupPanel").classList.remove("hidden");
 byId("setupTitle").textContent=kind==="charges"?"Charge Lines":"Conversion Factors";
 byId("setupItems").textContent="Indlæser…";byId("setupForm").innerHTML="";
 activate(kind==="charges"?"topCharges":"topFactors");
 const path=kind==="charges"?"charge-definitions":"conversion-factors";
 try{
 const data=await api("/admin/"+path);const items=data.items||[];
 const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const form=byId("setupForm");
 let editingId=null;
 const renderItems=()=>{
  byId("setupItems").innerHTML=items.length?items.map(x=>'<div class="item"><strong>'+safe(x.name)+'</strong> · '+safe(kind==="charges"?(x.section||"")+" / "+(x.basis||""):x.value)+(kind==="charges"? ' <button type="button" class="secondary" data-edit-charge="'+Number(x.id)+'">Rediger</button>':"")+'</div>').join(""):'<p class="muted">Ingen poster endnu.</p>';
  if(kind==="charges")byId("setupItems").querySelectorAll("[data-edit-charge]").forEach(button=>button.addEventListener("click",()=>{
   const item=items.find(x=>Number(x.id)===Number(button.dataset.editCharge));if(!item)return;
   editingId=Number(item.id);byId("navName").value=item.name||"";byId("navSection").value=item.section||"Origin";byId("navBasis").value=item.basis||"flat";byId("navActive").checked=item.active!==0;byId("navFormTitle").textContent="Rediger charge line";byId("navSave").textContent="Gem ændringer";byId("navCancel").hidden=false;form.scrollIntoView({behavior:"smooth",block:"nearest"});
  }));
 };
 form.innerHTML=kind==="charges"?'<h3 id="navFormTitle">Tilføj charge line</h3><label>Navn</label><input id="navName"><label>Section</label><select id="navSection"><option>Origin</option><option>Destination</option></select><label>Basis</label><select id="navBasis"><option value="flat">Flat</option><option value="gross">Gross kg</option><option value="cw">Chargeable kg</option><option value="cbm">CBM</option><option value="rt">RT</option></select><label><input type="checkbox" id="navActive" checked> Aktiv</label><button type="button" id="navSave">Gem charge line</button> <button type="button" id="navCancel" class="secondary" hidden>Annuller</button>':'<h3>Opdater omregningsfaktor</h3><label>Type</label><select id="navName"><option value="air">Air</option><option value="road">Road</option><option value="rail">Rail</option><option value="sea">Sea</option></select><label>Værdi</label><input id="navValue" type="number" step="0.0001"><button type="button" id="navSave">Gem faktor</button>';
 if(kind==="charges")byId("navCancel").onclick=()=>{editingId=null;byId("navName").value="";byId("navSection").value="Origin";byId("navBasis").value="flat";byId("navActive").checked=true;byId("navFormTitle").textContent="Tilføj charge line";byId("navSave").textContent="Gem charge line";byId("navCancel").hidden=true};
 renderItems();
 byId("navSave").onclick=async()=>{try{
  const body=kind==="charges"?{...(editingId!==null?{id:editingId}:{}),name:byId("navName").value.trim(),section:byId("navSection").value,basis:byId("navBasis").value,active:byId("navActive").checked}:{name:byId("navName").value,value:Number(byId("navValue").value)};
  if(!body.name){message("Angiv et navn.");return}
  await api("/admin/"+path,{method:kind==="charges"&&editingId===null?"POST":kind==="charges"?"PUT":"POST",body:JSON.stringify(body)});
  await setup(kind);message("Gemt.");
 }catch(e){message("Kunne ikke gemme: "+e.message)}};

 }catch(e){byId("setupItems").textContent="Kunne ikke indlæse: "+e.message}
}
byId("topCharges").addEventListener("click",()=>setup("charges"));
byId("topFactors").addEventListener("click",()=>setup("factors"));
})();
