"use strict";
// Unified company address book for DUVERO suppliers and customers.
const abFields=[["company","Company name"],["address","Street address"],["postcode","Postal code"],["city","City"],["country","Country"],["phone","Phone"],["email","Email"],["contact","Contact person"],["notes","Internal notes"]];
let abKind="",abItems=[],abCurrent=null,abFilter="";
const abNorm=s=>String(s||"").trim().toLocaleLowerCase().replace(/[^a-z0-9æøå]/g,"");
const abField=(k,label,v="")=>'<div><label>'+esc(label)+'</label>'+(k==="notes"?'<textarea data-ab="'+k+'" rows="2">'+esc(v)+'</textarea>':'<input data-ab="'+k+'" value="'+esc(v)+'" placeholder="'+esc(label)+'">')+'</div>';
function abHost(){return abKind==="supplier"?$("setupItems"):$("customerAddressBook")}
function abBase(){
 const supplier=abKind==="supplier",existing=supplier?calcSuppliers.map(x=>({company:x.name,email:x.email||"",categories:x.categories||[],supplierId:x.id})):Array.from(new Map(records.map(x=>[abNorm(customerName(x)),{company:customerName(x),email:x.email||"",rfqs:records.filter(y=>customerName(y)===customerName(x)).length}])).values());
 const map=new Map(existing.map(x=>[abNorm(x.company),x]));
 for(const a of abItems){const key=abNorm(a.company),old=map.get(key)||{};map.set(key,{...old,...a})}
 return [...map.values()].sort((a,b)=>a.company.localeCompare(b.company));
}
function abRender(){
 const host=abHost();if(!host)return;
 const filtered=abBase().filter(x=>[x.company,x.email,x.city,x.country,x.phone,x.contact].some(v=>String(v||"").toLocaleLowerCase().includes(abFilter.toLocaleLowerCase())));
 host.innerHTML='<div class="bar"><h3>Company address book</h3><span class="muted">'+filtered.length+' companies</span></div><label>Search company, city, email or phone</label><input id="abSearch" type="search" placeholder="Find a company..." value="'+esc(abFilter)+'"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;margin-top:14px;text-align:left"><thead><tr><th>Company</th><th>City / Country</th><th>Contact</th><th>Phone</th><th></th></tr></thead><tbody>'+filtered.map((x,i)=>'<tr style="border-top:1px solid #dbe6e9"><td style="padding:12px 5px"><strong>'+esc(x.company)+'</strong></td><td>'+esc([x.city,x.country].filter(Boolean).join(", "))+'</td><td>'+esc(x.contact||x.email||"")+'</td><td>'+esc(x.phone||"")+'</td><td><button type="button" class="secondary" data-ab-open="'+i+'">Open</button></td></tr>').join("")+'</tbody></table></div><div class="actions"><button type="button" id="abNew">+ Add company</button></div><div id="abEditor"></div>';
 $("abSearch").oninput=e=>{abFilter=e.target.value;abRender();$("abSearch").focus();$("abSearch").setSelectionRange(abFilter.length,abFilter.length)};
 host.querySelectorAll("[data-ab-open]").forEach(b=>b.onclick=()=>abEdit(filtered[Number(b.dataset.abOpen)]));
 host.querySelector("#abNew").addEventListener("click",e=>{e.preventDefault();abEdit(null)});
}
function abEdit(item){
 abCurrent=item;
 const v=item||{},el=$("abEditor");if(!el)return;
 el.innerHTML='<section class="panel" style="background:#f8fbfb"><div class="bar"><h3>'+(item?"Company details":"Add company")+'</h3><button type="button" class="secondary" id="abCancel">Close</button></div><div class="grid">'+abFields.map(([k,l])=>abField(k,l,v[k]||"")).join("")+'</div><p class="muted">One company record, regardless of branch or shipping origin.</p><button type="button" id="abSave">Save company details</button></section>';
 $("abCancel").onclick=()=>{el.innerHTML=""};
 $("abSave").onclick=abSave;
 el.scrollIntoView({behavior:"auto",block:"start"});
}
async function abSave(){
 const x={kind:abKind};for(const field of abFields)x[field[0]]=$("abEditor").querySelector('[data-ab="'+field[0]+'"]').value.trim();
 if(!x.company){message("Company name is required");return}
 const matched=abItems.find(a=>abNorm(a.company)===abNorm(x.company));
 if(!abCurrent&&matched){message("Company already exists. Open the existing record.");return}
 if(abCurrent?.id)x.id=abCurrent.id;
 else if(abCurrent?.company){const record=abItems.find(a=>abNorm(a.company)===abNorm(abCurrent.company));if(record)x.id=record.id}
 try{
  await api("/admin/address-book",{method:x.id?"PUT":"POST",body:JSON.stringify(x)});
  if(abKind==="supplier"&&!calcSuppliers.some(s=>abNorm(s.name)===abNorm(x.company))){
   await api("/admin/suppliers",{method:"POST",body:JSON.stringify({name:x.company,email:x.email,categories:[]})});
  }
  await abOpen(abKind);message("Company saved in address book");
 }catch(e){message("Could not save company: "+e.message)}
}
async function abOpen(kind){
 abKind=kind;abFilter="";
 try{
  const [book]=await Promise.all([api("/admin/address-book?kind="+kind),kind==="supplier"?calcLoadMasters():Promise.resolve()]);
  abItems=book.items||[];
  if(kind==="customer"){$("customerAddressBook").classList.remove("hidden");$("enquiries").classList.add("hidden");$("list").querySelector(".grid").classList.add("hidden");$("list").querySelector("#searchEnquiries").classList.add("hidden");$("list").querySelector('label[for="searchEnquiries"]').classList.add("hidden")}
  abRender();
 }catch(e){const el=abHost();if(el)el.textContent="Address book unavailable until database migration and Worker deployment: "+e.message}
}
function abExitCustomer(){
 $("customerAddressBook").classList.add("hidden");$("enquiries").classList.remove("hidden");
 $("list").querySelector(".grid")?.classList.remove("hidden");
 $("searchEnquiries").classList.remove("hidden");
 $("list").querySelector('label[for="searchEnquiries"]')?.classList.remove("hidden");
}
$("topCustomers").addEventListener("click",()=>abOpen("customer"));
$("topSuppliers").addEventListener("click",()=>abOpen("supplier"));
for(const id of ["topQuotes","topArchive","topCharges","topFactors"])$(id).addEventListener("click",abExitCustomer);
