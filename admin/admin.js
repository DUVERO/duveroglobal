"use strict";
const API="https://duvero-quote-api.rskovn.workers.dev";
let records=[],selected=null,lines=[],costLines=[],invoiceLines=[],sessionToken="";
const $=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>Number(n||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});
async function api(path,opts={}){const r=await fetch(API+path,{...opts,headers:{"Content-Type":"application/json",...(sessionToken?{"Authorization":"Bearer "+sessionToken}:{}),...(opts.headers||{})}});if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||"Request failed ("+r.status+")");return r.json()}
function message(s){$("status").textContent=s}
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
function priceTotals(){const net=lines.reduce((n,x)=>n+(Number(x.net)||0),0),sale=lines.reduce((n,x)=>n+(Number(x.amount)||0),0);$("total").textContent="Net: "+$("currency").value+" "+money(net)+"  |  Sale: "+money(sale)+"  |  Profit: "+money(sale-net)}
function drawLines(){
 $("lines").innerHTML='<div class="price-head"><strong>Description</strong><strong>Net</strong><strong>Sale</strong><span></span></div>'+lines.map((x,i)=>'<div class="price-row"><input data-line="'+i+'" data-key="description" placeholder="Charge" value="'+esc(x.description)+'"><input type="number" step="0.01" min="0" data-line="'+i+'" data-key="net" placeholder="0.00" value="'+esc(x.net||"")+'"><input type="number" step="0.01" min="0" data-line="'+i+'" data-key="amount" placeholder="0.00" value="'+esc(x.amount||"")+'"><button type="button" class="secondary" data-remove="'+i+'">×</button></div>').join("");
 priceTotals();
}

function open(x){selected=x;const d=x.payload||{};$("heading").textContent=x.quote_number+" · "+x.service;$("details").innerHTML='<p><b>'+esc(x.company)+'</b> · '+esc(x.email)+'</p><p>'+esc(x.origin)+' → '+esc(x.destination)+'</p><p>Goods: '+esc(d.commodity)+' · Tail lift: '+(d.tailLift?"Required":"No")+'</p>';$("currency").value=x.currency||"EUR";$("transit").value=x.transit||"";$("validity").value=x.validity||7;$("incoterm").value=x.incoterm||d.incoterm||"";$("remarks").value=x.remarks||"";lines=Array.isArray(x.price_lines)?x.price_lines.map((a,i)=>({...a,net:x.cost_lines?.[i]?.amount??""})):[];if(!lines.length)lines=[{description:"Freight",net:"",amount:""},{description:"Collection",net:"",amount:""},{description:"Delivery",net:"",amount:""}];drawLines();costLines=lines.map(x=>({description:x.description,amount:Number(x.net)||0}));invoiceLines=x.invoice_lines||[];$("actualPieces").value=x.shipment_actual?.pieces||"";$("actualWeight").value=x.shipment_actual?.weight||"";$("actualCbm").value=x.shipment_actual?.cbm||"";drawFinance();$("trackingStatus").value=x.status==="Revised draft"?"Revised draft":x.status;$("followupDate").value=x.followup_date||"";$("internalNotes").value=x.internal_notes||"";$("archiveQuote").checked=Number(x.archived)===1;drawFinance();$("finance").classList.remove("hidden");$("list").classList.add("hidden");$("editor").classList.remove("hidden");$("sendPanel").classList.add("hidden")}
function payload(){return {currency:$("currency").value,transit:$("transit").value,validity:Number($("validity").value),incoterm:$("incoterm").value,remarks:$("remarks").value,price_lines:lines.map(x=>({description:x.description,amount:Number(x.amount)||0}))}}
async function save(){if(!selected)return;const updated=await api("/admin/enquiries/"+encodeURIComponent(selected.id),{method:"PUT",body:JSON.stringify(payload())});selected=updated.enquiry;return selected}
$("enquiries").addEventListener("click",e=>{const id=e.target.closest("[data-id]")?.dataset.id;const x=records.find(r=>String(r.id)===id);if(x)open(x)});
$("lines").addEventListener("input",e=>{const i=e.target.dataset.line;if(i!==undefined){lines[+i][e.target.dataset.key]=e.target.value;priceTotals()}});
$("lines").addEventListener("click",e=>{const i=e.target.dataset.remove;if(i!==undefined){lines.splice(+i,1);drawLines()}});
$("currency").addEventListener("change",drawLines);
$("addLine").onclick=()=>addLine();$("refresh").onclick=load;
$("back").onclick=()=>{$("editor").classList.add("hidden");$("finance").classList.add("hidden");$("list").classList.remove("hidden");$("sendPanel").classList.add("hidden");load()};
$("save").onclick=async()=>{try{await save();message("Draft saved")}catch(e){message("Could not save: "+e.message)}};
$("preview").onclick=async()=>{try{await save();const result=await api("/admin/enquiries/"+encodeURIComponent(selected.id)+"/preview");const a=document.createElement("a");a.href="data:application/pdf;base64,"+result.pdf;a.download="DUVERO_Quotation_"+selected.quote_number+".pdf";a.click()}catch(e){message("Preview failed: "+e.message)}};
$("openSend").onclick=async()=>{try{await save();$("sendRef").textContent=selected.quote_number;$("recipient").value=selected.email;$("subject").value="DUVERO Quotation – "+selected.quote_number;$("confirm").checked=false;$("sendPanel").classList.remove("hidden");$("sendPanel").scrollIntoView({behavior:"smooth"})}catch(e){message(e.message)}};
$("cancelSend").onclick=()=>$("sendPanel").classList.add("hidden");
$("confirmSend").onclick=async()=>{if(!$("confirm").checked||!$("recipient").checkValidity()){alert("Please confirm a valid customer email address.");return}if(!confirm("Send quotation "+selected.quote_number+" to "+$("recipient").value+"?"))return;try{await api("/admin/enquiries/"+encodeURIComponent(selected.id)+"/send",{method:"POST",body:JSON.stringify({recipient:$("recipient").value,subject:$("subject").value,confirmed:true})});$("sendPanel").classList.add("hidden");message("Quotation sent successfully");}catch(e){message("Send failed: "+e.message)}};

function drawFinance(){
 for(const [id,rows,kind] of [["costLines",costLines,"cost"],["invoiceLines",invoiceLines,"invoice"]]){
 $(id).innerHTML=rows.map((x,i)=>'<div class="grid"><input data-i="'+i+'" data-key="description" placeholder="Charge" value="'+esc(x.description)+'"><input data-i="'+i+'" data-key="amount" type="number" step="0.01" placeholder="Amount" value="'+esc(x.amount)+'"><input data-i="'+i+'" data-key="supplier" placeholder="Supplier" value="'+esc(x.supplier||"")+'">'+(kind==="invoice"?'<input data-i="'+i+'" data-key="invoice_number" placeholder="Invoice no." value="'+esc(x.invoice_number||"")+'">':"")+'<button class="secondary" data-remove="'+i+'">Remove</button></div>').join("");
 }
 updateProfit();
}
function updateProfit(){const sum=a=>a.reduce((n,x)=>n+(Number(x.amount)||0),0),cost=sum(costLines),sale=sum(lines),invoiced=sum(invoiceLines);$("profitReport").textContent="Currency: "+$("currency").value+" | Cost: "+money(cost)+" | Sale: "+money(sale)+" | Expected profit: "+money(sale-cost)+" | Invoiced: "+money(invoiced)+" | Difference: "+money(invoiced-cost)+" | Profit after invoices: "+money(sale-invoiced)+". All amounts must be in the same currency."}
for(const [id,kind] of [["costLines","cost"],["invoiceLines","invoice"]]){
 $(id).addEventListener("input",e=>{const i=e.target.dataset.i;if(i!==undefined){(kind==="cost"?costLines:invoiceLines)[+i][e.target.dataset.key]=e.target.value;updateProfit()}});
 $(id).addEventListener("click",e=>{const i=e.target.dataset.remove;if(i!==undefined){(kind==="cost"?costLines:invoiceLines).splice(+i,1);drawFinance()}});
}
$("addCost").onclick=()=>{costLines.push({description:"",amount:"",supplier:""});drawFinance()};
$("addInvoice").onclick=()=>{invoiceLines.push({description:"",amount:"",supplier:"",invoice_number:""});drawFinance()};
async function financeSave(revise){const result=await api("/admin/enquiries/"+selected.id+"/finance",{method:"PUT",body:JSON.stringify({cost_lines:costLines,invoice_lines:invoiceLines,shipment_actual:{pieces:Number($("actualPieces").value)||0,weight:Number($("actualWeight").value)||0,cbm:Number($("actualCbm").value)||0},price_lines:lines,revise_sale:revise,reason:$("revisionReason").value})});selected=result.enquiry;message(revise?"Revised selling price saved as draft; send revised quotation separately.":"Cost and invoice details saved.");}
$("saveFinance").onclick=async()=>{try{await financeSave(false)}catch(e){message(e.message)}};
$("reviseSale").onclick=async()=>{if(!$("revisionReason").value.trim()){message("Enter a reason for the price change.");return}try{await financeSave(true)}catch(e){message(e.message)}};
$("saveTracking").onclick=async()=>{if(!selected)return;try{const result=await api("/admin/enquiries/"+selected.id+"/tracking",{method:"PUT",body:JSON.stringify({status:$("trackingStatus").value,followup_date:$("followupDate").value,internal_notes:$("internalNotes").value,archived:$("archiveQuote").checked})});selected=result.enquiry;const i=records.findIndex(x=>x.id===selected.id);if(i>=0)records[i]=selected;renderEnquiries();message("Follow-up and archive details saved.")}catch(e){message("Could not save tracking: "+e.message)}};
$("companyHistory").onclick=()=>{if(!selected)return;$("searchEnquiries").value=customerName(selected);$("statusFilter").value="all";$("archiveFilter").value="all";$("back").click();renderEnquiries();message("Showing all enquiries matching customer: "+selected.company)};
$("relatedQuotes").onclick=()=>{if(!selected)return;const group=selected.group_id;if(!group){message("No related quote group found.");return}const related=records.filter(x=>x.group_id===group);$("searchEnquiries").value="";$("statusFilter").value="all";$("archiveFilter").value="all";$("back").click();$("enquiries").innerHTML=related.map(x=>'<div class="item" data-id="'+esc(x.id)+'"><strong>'+esc(x.company)+'</strong> · '+esc(x.quote_number)+' · '+esc(x.service)+' · '+esc(x.status)+'</div>').join("");$("resultCount").textContent=related.length+" related quotes";message("Related Compare Freight quotations")};
$("loginButton").onclick=async()=>{try{const data=await api("/admin/login",{method:"POST",body:JSON.stringify({password:$("password").value})});sessionToken=data.token;$("password").value="";await load()}catch(e){message("Login failed: "+e.message)}};