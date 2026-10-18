/* DUVERO quotation print renderer. Uses approved static HTML as a visual source; does not modify the existing PDF sender. */
(function(){
"use strict";
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const display=v=>v===null||v===undefined||v===""?"—":String(v);
const num=v=>Number(v)||0;
const money=v=>num(v).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});
const service={air:"Air Freight",sea:"Sea Freight",road:"Road Freight",rail:"Rail Freight",courier:"Courier / Express"};
const cell=(tr,i,v)=>{if(tr?.cells?.[i])tr.cells[i].textContent=display(v)};
function kv(panel,values){if(!panel)return;panel.querySelectorAll(".kv").forEach((row,i)=>{if(row.querySelector("strong")&&i<values.length)row.querySelector("strong").textContent=display(values[i])})}
function countryName(raw){const v=String(raw||"");return v.includes(" (")?v.slice(0,v.lastIndexOf(" (")):v}
function countryCode(raw){const v=String(raw||"").trim();const m=v.match(/\(([A-Za-z]{2})\)\s*$/);if(m)return m[1].toUpperCase();if(/^[A-Za-z]{2}$/.test(v))return v.toUpperCase();const names={denmark:"DK",danmark:"DK",china:"CN",kina:"CN"};return names[v.toLowerCase()]||""}
function flag(code){const c=String(code||"").toUpperCase();const start='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="22" viewBox="0 0 32 22" style="vertical-align:middle;margin-right:9px;border:1px solid #d6dfe5;border-radius:2px" aria-label="Flag">';
 if(c==="DK")return start+'<rect width="32" height="22" fill="#c8102e"/><rect x="10" width="4" height="22" fill="#fff"/><rect y="9" width="32" height="4" fill="#fff"/></svg>';
 if(c==="CN")return start+'<rect width="32" height="22" fill="#de2910"/><polygon points="7,2 8.2,5.6 12,5.6 8.9,7.8 10.1,11.5 7,9.2 3.9,11.5 5.1,7.8 2,5.6 5.8,5.6" fill="#ffde00"/></svg>';
 return "";
}
function fillLocation(panel,payload,prefix){if(!panel)return;const raw=payload[prefix+"CountryOther"]||payload[prefix+"Country"]||"";const country=panel.querySelector(".country");if(country){const code=countryCode(raw);country.innerHTML=(code?'<img src="https://flagcdn.com/w40/'+encodeURIComponent(code.toLowerCase())+'.png" alt="" width="32" height="22" style="vertical-align:middle;margin-right:9px;object-fit:cover;border:1px solid #d6dfe5;border-radius:2px">':"")+escapeHtml(countryName(raw))+(code?" ("+escapeHtml(code)+")":"")}
 kv(panel,[payload[prefix+"City"],payload[prefix+"Postcode"],payload[prefix+"Address"],payload[prefix+"Party"]]);}
function fill(doc,record){
 const d=record.payload||{},currency=record.currency||"EUR",prices=Array.isArray(record.price_lines)?record.price_lines:[],panels=[...doc.querySelectorAll(".panel")];
 const ref=doc.querySelector(".ref");if(ref){ref.innerHTML="RFQ No.<strong>"+escapeHtml(record.quote_number)+"</strong>"+escapeHtml(record.updated_at||"")}
 const terms=doc.querySelectorAll(".offer-note-grid strong");[record.transit||"—",(record.validity||7)+" days",currency].forEach((v,i)=>{if(terms[i])terms[i].textContent=v});
 const pt=doc.querySelector(".price-table");if(pt){pt.querySelector("thead th:last-child").textContent="Amount ("+currency+")";pt.querySelector("tbody").innerHTML=prices.map(p=>"<tr><td>"+escapeHtml(p.description)+"</td><td>"+money(p.amount)+"</td></tr>").join("");pt.querySelector("tfoot td:last-child").textContent=currency+" "+money(prices.reduce((n,p)=>n+num(p.amount),0))}
 const summary=doc.querySelectorAll(".summary-item .value");[service[record.service]||record.service,d.direction||"—",record.incoterm||d.incoterm||"—",d.scope||d.roadType||"General cargo"].forEach((v,i)=>{if(summary[i])summary[i].textContent=v});
 const loc=doc.querySelectorAll(".twocol .panel");fillLocation(loc[0],d,"origin");fillLocation(loc[1],d,"dest");
 const goods=panels.find(p=>p.querySelector(".heading")?.textContent.includes("Goods Details"))?.querySelector("table");
 if(goods){const cargo=Array.isArray(d.cargo)?d.cargo:[];let qty=0,kg=0,cbm=0;
 const noDim=!!d.noDimensions;
 const entries=noDim?[{type:"Bulk",description:d.commodity||"—",qty:d.totalPieces||"—",weight:d.totalWeight||0,volume:d.totalCbm||0}]:cargo;
 goods.querySelector("tbody").innerHTML=entries.map((g,i)=>{const q=num(g.qty),w=noDim?num(g.weight):q*num(g.weight),v=noDim?num(g.volume):q*num(g.length)*num(g.width)*num(g.height)/1e6;qty+=q;kg+=w;cbm+=v;return "<tr>"+[i+1,g.type||g.size||"—",g.description||d.commodity||"—",noDim?"Only kg / CBM":[g.length,g.width,g.height].every(Boolean)?[g.length,g.width,g.height].join(" × "):"—",g.qty||"—",w.toFixed(2),v.toFixed(3),g.stack||"—"].map(x=>"<td>"+escapeHtml(x)+"</td>").join("")+"</tr>"}).join("");
 const totals=goods.querySelector("tfoot tr");if(totals){const t=totals.querySelectorAll("td");if(t[1])t[1].textContent=display(qty||d.totalPieces);if(t[2])t[2].textContent=money(kg)+" kg";if(t[3])t[3].textContent=cbm.toFixed(3)+" m³";if(t[4]){const mode=String(record.service||"").toLowerCase(),scope=String(d.scope||"").toLowerCase();let label="",value="";if(mode==="air"){label="Chargeable Weight";value=Math.ceil(Math.max(kg,cbm*167))+" kg"}else if((mode==="sea"||mode==="rail")&&!scope.includes("fcl")){label="Revenue Tons (W/M)";value=Math.max(kg/1000,cbm).toFixed(3)+" RT"}else if(mode==="road"){label="Chargeable Weight";value=Math.ceil(Math.max(kg,cbm*333))+" kg"}t[4].textContent=label?label+": "+value:"";t[4].style.whiteSpace="nowrap";t[4].style.fontWeight="700";}}
 }
 const more=panels.find(p=>p.querySelector(".heading")?.textContent.includes("Additional Information"));kv(more,[d.ready,d.danger||"No",d.un,d.details||record.remarks]);
 const customer=panels.find(p=>p.querySelector(".heading")?.textContent.includes("Customer Details"));kv(customer,[record.company,d.registrationNumber,d.companyAddress,[d.companyPostcode,d.companyCity].filter(Boolean).join(" "),d.companyCountry,record.person,record.email,record.phone]);
 const notes=doc.querySelector(".notes");if(notes)notes.innerHTML="<h3>▤ &nbsp; Notes</h3>Thank you for your enquiry. This quotation is subject to the stated validity and conditions.<br>Reference: "+escapeHtml(record.quote_number);
 return doc;
}
async function render(record){if(!record?.quote_number)throw Error("RFQ number missing");const resp=await fetch("/admin/quotation-pdf-template.html",{cache:"no-store"});if(!resp.ok)throw Error("Approved quotation template unavailable");const html=await resp.text();const doc=new DOMParser().parseFromString(html,"text/html");fill(doc,record);return "<!doctype html>\\n"+doc.documentElement.outerHTML}
window.DUVEROQuotationRenderer={render,fill};
})();