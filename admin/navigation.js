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
 byId("setupItems").innerHTML=items.length?items.map(x=>'<div class="item"><strong>'+esc(x.name)+'</strong> · '+esc(kind==="charges"?(x.section||"")+" / "+(x.basis||""):x.value)+'</div>').join(""):'<p class="muted">Ingen poster endnu.</p>';
 const form=byId("setupForm");
 form.innerHTML=kind==="charges"?'<h3>Tilføj charge line</h3><label>Navn</label><input id="navName"><label>Section</label><select id="navSection"><option>Origin</option><option>Destination</option></select><label>Basis</label><select id="navBasis"><option value="flat">Flat</option><option value="gross">Gross kg</option><option value="cw">Chargeable kg</option><option value="cbm">CBM</option><option value="rt">RT</option></select><button type="button" id="navSave">Gem charge line</button>':'<h3>Opdater omregningsfaktor</h3><label>Type</label><select id="navName"><option value="air">Air</option><option value="road">Road</option><option value="rail">Rail</option><option value="sea">Sea</option></select><label>Værdi</label><input id="navValue" type="number" step="0.0001"><button type="button" id="navSave">Gem faktor</button>';
 byId("navSave").onclick=async()=>{try{const body=kind==="charges"?{name:byId("navName").value.trim(),section:byId("navSection").value,basis:byId("navBasis").value,active:true}:{name:byId("navName").value,value:Number(byId("navValue").value)};await api("/admin/"+path,{method:"PUT",body:JSON.stringify(body)});await setup(kind);message("Gemt.")}catch(e){message("Kunne ikke gemme: "+e.message)}};
 }catch(e){byId("setupItems").textContent="Kunne ikke indlæse: "+e.message}
}
byId("topCharges").addEventListener("click",()=>setup("charges"));
byId("topFactors").addEventListener("click",()=>setup("factors"));
})();
