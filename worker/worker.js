// DUVERO quote email API — deploy separately as a Cloudflare Worker.
// Required secrets: RESEND_API_KEY, QUOTE_RECIPIENT (Gmail address).
// Required variable: ALLOWED_ORIGIN=https://duveroglobal.com
// The public website remains in test mode until explicitly enabled.

function makeQuotePdf(d,company,person,email,phone,reference="",offerDetails=null){
 if(offerDetails)return makeLegacyQuotePdf(d,company,person,email,phone,reference,offerDetails);
 const encoder=new TextEncoder(),objs=[],pages=[];let cmds=[],y=0;
 const add=v=>(objs.push(v),objs.length);
 const reg=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),bold=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
 const esc=v=>String(v??"-").replace(/[^\x20-\x7e]/g," ").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)").slice(0,150);
 const fill=(x,b,w,h,r=.94,g=.97,bl=.98)=>cmds.push(r+" "+g+" "+bl+" rg "+x+" "+b+" "+w+" "+h+" re f");
 const text=(v,x,b,size=9,strong=false)=>cmds.push("0.04 0.18 0.27 rg BT /"+(strong?"B":"R")+" "+size+" Tf 1 0 0 1 "+x+" "+b+" Tm ("+esc(v)+") Tj ET");
 const page=()=>{if(cmds.length)pages.push(cmds.join("\n"));cmds=[];fill(0,0,595,842,1,1,1);text("DUVERO",28,788,30,true);text("GLOBAL FREIGHT & LOGISTICS",29,769,8);text("Freight Enquiry",305,795,21,true);text("Quote Request from DUVERO Website",305,777,9);fill(425,714,145,47);text("Enquiry No.",434,742,9);text(reference,434,727,12,true);fill(28,756,542,3,0,.66,.65);y=698};
 const room=h=>{if(y-h<50)page()};
 const section=name=>{room(45);fill(28,y-24,542,31);text(name,41,y-13,12,true);y-=42};
 const row=(key,val,x=42,w=500)=>{if(val===undefined||val===null||val==="")return;room(23);text(key,x,y-10,9);text(String(val).slice(0,Math.floor((w-108)/5.1)),x+108,y-10,9,true);y-=23};
 const pair=(name,items,x,top,w=259)=>{fill(x,top-24,w,31);text(name,x+10,top-13,12,true);let yy=top-45;for(const [k,v] of items){text(k,x+10,yy,8);text(String(v||"-").slice(0,27),x+91,yy,9,true);yy-=25}return yy};
 const fmt=n=>Number(n||0).toLocaleString("en-US",{maximumFractionDigits:3});
 const services={air:"Air Freight",sea:"Sea Freight",road:"Road Transport",rail:"Rail Freight",courier:"Courier / Express",multi:"Compare Freight"};
 page();section("Shipment Overview");
 const summary=[["Service",services[d.service]||d.service],["Direction",d.direction],["Incoterms",d.incoterm],["Transport type",d.service==="air"?"Air cargo":d.scope||d.roadType||"General cargo"]];
 for(let i=0;i<4;i++){let x=28+i*135.5;fill(x,y-51,135,62,.98,.99,1);text(summary[i][0],x+9,y-13,9);text(summary[i][1],x+9,y-34,11,true)}y-=77;
 room(190);let top=y;
 const loc=p=>[["Country",d[p+"CountryOther"]||d[p+"Country"]],["City",d[p+"City"]],["Postal code",d[p+"Postcode"]],["Address",d[p+"Address"]],["Party",d[p+"Party"]]];
 pair("Origin",loc("origin"),28,top);pair("Destination",loc("dest"),311,top);y-=195;
 section("Goods Details");
 if(d.noDimensions&&!(["sea","rail"].includes(d.service)&&d.scope==="fcl")){row("Cargo","Only kg / CBM");row("Total pieces",d.totalPieces);row("Total weight",fmt(d.totalWeight)+" kg");row("Total volume",fmt(d.totalCbm)+" m3")}
 else{
 const cargo=Array.isArray(d.cargo)?d.cargo:[],xs=[29,53,109,209,329,366,439,519],headers=["#","Type","Description","Dimensions (cm)","Qty","Weight kg","CBM","Stack"];let qty=0,weight=0,cbm=0;
 const head=()=>{room(35);fill(28,y-22,542,29);headers.forEach((v,i)=>text(v,xs[i],y-12,i===3?7:8,true));y-=30};head();
 for(let i=0;i<cargo.length;i++){if(y<91){page();section("Goods Details (continued)");head()}const c=cargo[i],n=Number(c.qty)||0,w=n*(Number(c.weight)||0),v=n*(Number(c.length)||0)*(Number(c.width)||0)*(Number(c.height)||0)/1e6;qty+=n;weight+=w;cbm+=v;
 fill(28,y-22,542,27,i%2?.96:1,i%2?.98:1,1);
 const vals=[i+1,c.type||c.size||"-",d.commodity||"-",[c.length,c.width,c.height].every(Boolean)?[c.length,c.width,c.height].join(" x "):"-",n,fmt(w),fmt(v),c.stack||"-"];vals.forEach((val,j)=>text(String(val).slice(0,j===2?17:j===3?21:12),xs[j],y-13,j===3?7:8));y-=27}
 room(38);fill(28,y-28,542,34);text("TOTAL",294,y-15,10,true);text(fmt(qty),xs[4],y-15,9,true);text(fmt(weight)+" kg",xs[5],y-15,9,true);text(fmt(cbm)+" m3",xs[6],y-15,9,true);y-=44;
 }
 room(245);top=y;
 const additional=[["Ready date",d.ready],["Dangerous goods",d.danger],["UN number",d.un],["Tail lift",d.tailLift?"Required":"No"],["Remarks",d.details]];
 const customer=[["Company",company],["Registration",[d.companyCountry,d.registrationNumber].filter(Boolean).join(" ")],["Address",d.companyAddress],["Postal / city",[d.companyPostcode,d.companyCity].filter(Boolean).join(" ")],["Country",d.companyCountry],["Name",person],["Email",email],["Phone",phone]];
 const left=pair("Additional Information",additional,28,top),right=pair("Customer Details",customer,311,top);y=Math.min(left,right)-17;
 room(96);fill(28,y-74,542,83,.91,.98,.96);text("Notes",41,y-12,12,true);text("This is a quote request submitted through the DUVERO website.",41,y-36,10);text("Please provide your best all-in rate and estimated transit time.",41,y-54,10);pages.push(cmds.join("\n"));
 const refs=[];for(const content of pages){const stream=add("<< /Length "+encoder.encode(content).length+" >>\nstream\n"+content+"\nendstream");refs.push(add("<< /Type /Page /Parent PARENT /MediaBox [0 0 595 842] /Resources << /Font << /R "+reg+" 0 R /B "+bold+" 0 R >> >> /Contents "+stream+" 0 R >>"))}
 const parent=add("<< /Type /Pages /Kids ["+refs.map(n=>n+" 0 R").join(" ")+"] /Count "+refs.length+" >>");for(const n of refs)objs[n-1]=objs[n-1].replace("PARENT",parent+" 0 R");const catalog=add("<< /Type /Catalog /Pages "+parent+" 0 R >>");
 let pdf="%PDF-1.4\n",offsets=[0];for(let i=0;i<objs.length;i++){offsets.push(encoder.encode(pdf).length);pdf+=(i+1)+" 0 obj\n"+objs[i]+"\nendobj\n"}const xref=encoder.encode(pdf).length;pdf+="xref\n0 "+(objs.length+1)+"\n0000000000 65535 f \n"+offsets.slice(1).map(n=>String(n).padStart(10,"0")+" 00000 n \n").join("")+"trailer\n<< /Size "+(objs.length+1)+" /Root "+catalog+" 0 R >>\nstartxref\n"+xref+"\n%%EOF";
 const bytes=encoder.encode(pdf);let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);
}

function makeLegacyQuotePdf(d,company,person,email,phone,reference="",offerDetails=null){
 const cleanPdf=v=>String(v??"").replace(/[^\x20-\x7e]/g," ").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)").slice(0,110);
 const labels={sea:"Sea Freight - LCL",air:"Air Freight",road:"Road Freight - LTL",rail:"Rail Freight - LCL",courier:"Courier / Express"};
 const pages=[];let cmds=[],y=700;
 const text=(v,x,yy,size=10,bold=false)=>cmds.push("BT /"+(bold?"B":"R")+" "+size+" Tf 1 0 0 1 "+x+" "+yy+" Tm ("+cleanPdf(v)+") Tj ET");
 const start=()=>{cmds=["0.03 0.18 0.28 rg 0 724 595 88 re f","0 0.58 0.6 rg 0 720 595 4 re f"];cmds.push("1 1 1 rg");text("DUVERO",40,768,27,true);text("GLOBAL FREIGHT & LOGISTICS",41,746,9);text(offerDetails?"FREIGHT QUOTATION":"FREIGHT ENQUIRY",offerDetails?360:388,765,14,true);if(reference)text(reference,388,744,10,true);cmds.push("0.04 0.19 0.28 rg");y=690};
 const next=()=>{pages.push(cmds.join("\n"));start()};
 const check=h=>{if(y-h<48)next()};
 const section=v=>{check(45);cmds.push("0.91 0.96 0.96 rg 36 "+(y-11)+" 523 28 re f","0.04 0.19 0.28 rg");text(v.toUpperCase(),46,y,11,true);y-=43};
 const row=(k,v)=>{if(v===undefined||v===null||String(v).trim()==="")return;check(25);cmds.push("0.34 0.42 0.47 rg");text(k,46,y,9);cmds.push("0.04 0.19 0.28 rg");text(v,207,y,9,true);y-=23};
 start();if(offerDetails){section("Our freight quotation");row("Quotation number",reference);row("Service",labels[d.service]||d.service);row("Transit time",offerDetails.transit);row("Validity",offerDetails.validity+" days");row("Currency",offerDetails.currency);for(const line of offerDetails.prices||[])row(line.description,offerDetails.currency+" "+Number(line.amount||0).toFixed(2));row("TOTAL",offerDetails.currency+" "+offerDetails.total.toFixed(2));row("Remarks / exclusions",offerDetails.remarks);section("Shipment details")}else section("Shipment overview");row("Service",d.service==="multi"?"Compare Freight":labels[d.service]||d.service);
 if(d.service==="multi")row("Compare modes",(Array.isArray(d.multiModes)?d.multiModes:[]).map(m=>labels[m]||m).join(" + "));
 row("Direction",d.direction);row("Incoterm",d.incoterm);
 if(d.service==="road")row("Road setup",String(d.roadType||"ltl").toUpperCase());
 if(["sea","rail"].includes(d.service))row("Transport setup",String(d.scope||"lcl").toUpperCase());
 section("Origin");row("Country",d.originCountryOther||d.originCountry);row("City / postal code",[d.originCity,d.originPostcode].filter(Boolean).join(" / "));row("Sender",d.originParty);row("Address",d.originAddress);
 section("Destination");if(["sea","air","rail","road","multi"].includes(d.service))row("Tail-lift delivery",d.tailLift?"Required":"Not required");row("Country",d.destCountryOther||d.destCountry);row("City / postal code",[d.destCity,d.destPostcode].filter(Boolean).join(" / "));row("Recipient",d.destParty);row("Address",d.destAddress);
 section("Cargo details");row("Goods description",d.commodity);row("Ready date",d.ready);row("Dangerous goods",d.danger);if(d.danger==="yes")row("UN number",d.un);
 if(d.noDimensions&&["sea","multi"].includes(d.service)){row("Total pieces",d.totalPieces);row("Total weight (kg)",d.totalWeight);row("Total volume (m3)",d.totalCbm)}
 else {let qty=0,weight=0,cbm=0;for(const [i,c] of (Array.isArray(d.cargo)?d.cargo:[]).slice(0,30).entries()){check(140);row("Cargo line",i+1);row("Type",c.type||c.size);row("Qty / weight per unit",String(c.qty||"")+" / "+String(c.weight||"")+" kg");if(c.length&&c.width&&c.height)row("Dimensions (cm)",[c.length,c.width,c.height].join(" x "));if(c.stack)row("Stackable",c.stack);const n=Number(c.qty)||0;qty+=n;weight+=n*(Number(c.weight)||0);cbm+=n*(Number(c.length)||0)*(Number(c.width)||0)*(Number(c.height)||0)/1e6;}row("Total units",qty);row("Total weight",weight.toFixed(2)+" kg");if(cbm)row("Total volume",cbm.toFixed(3)+" m3")}
 section("Additional information");row("Remarks",d.details);
 section("Customer details");row("Company",company);row("Contact",person);row("Email",email);row("Phone",phone);pages.push(cmds.join("\n"));
 const encoder=new TextEncoder(),objs=[];const add=x=>(objs.push(x),objs.length);const regular=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),bold=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");const refs=[];
 for(const page of pages){const stream=add("<< /Length "+encoder.encode(page).length+" >>\nstream\n"+page+"\nendstream");refs.push(add("<< /Type /Page /Parent PARENT /MediaBox [0 0 595 812] /Resources << /Font << /R "+regular+" 0 R /B "+bold+" 0 R >> >> /Contents "+stream+" 0 R >>"))}
 const parent=add("<< /Type /Pages /Kids ["+refs.map(n=>n+" 0 R").join(" ")+"] /Count "+refs.length+" >>");for(const n of refs)objs[n-1]=objs[n-1].replace("PARENT",parent+" 0 R");const catalog=add("<< /Type /Catalog /Pages "+parent+" 0 R >>");
 let pdf="%PDF-1.4\n",offsets=[0];for(let i=0;i<objs.length;i++){offsets.push(encoder.encode(pdf).length);pdf+=(i+1)+" 0 obj\n"+objs[i]+"\nendobj\n"}const xref=encoder.encode(pdf).length;pdf+="xref\n0 "+(objs.length+1)+"\n0000000000 65535 f \n"+offsets.slice(1).map(n=>String(n).padStart(10,"0")+" 00000 n \n").join("")+"trailer\n<< /Size "+(objs.length+1)+" /Root "+catalog+" 0 R >>\nstartxref\n"+xref+"\n%%EOF";
 const bytes=encoder.encode(pdf);let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);
}


const jsonReply=(obj,status=200,origin="https://duveroglobal.com")=>new Response(JSON.stringify(obj),{status,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"GET,POST,PUT,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization","Cache-Control":"no-store","Vary":"Origin"}});
const b64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
async function adminSign(secret,payload){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64url(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload)))}
async function adminAuth(request,env){const token=(request.headers.get("Authorization")||"").replace(/^Bearer /,"");const parts=token.split(".");if(parts.length!==2||!env.ADMIN_SESSION_SECRET)return false;const expected=await adminSign(env.ADMIN_SESSION_SECRET,parts[0]);if(expected.length!==parts[1].length)return false;let diff=0;for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^parts[1].charCodeAt(i);if(diff)return false;const exp=Number(parts[0]);return Number.isFinite(exp)&&exp>Date.now()&&exp<Date.now()+86400000}
async function adminRoute(request,env,origin,url){
 if(!env.ADMIN_PASSWORD||!env.ADMIN_SESSION_SECRET||!env.DUVERO_DB)return jsonReply({error:"Admin configuration incomplete"},503,origin);
 if(url.pathname==="/admin/login"&&request.method==="POST"){let input;try{input=await request.json()}catch{return jsonReply({error:"Invalid JSON"},400,origin)}const provided=String(input.password||"");if(provided.length>512)return jsonReply({error:"Invalid login"},401,origin);const a=await adminSign(env.ADMIN_SESSION_SECRET,provided),b=await adminSign(env.ADMIN_SESSION_SECRET,env.ADMIN_PASSWORD);let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);if(diff)return jsonReply({error:"Invalid login"},401,origin);const exp=String(Date.now()+8*3600000);return jsonReply({token:exp+"."+(await adminSign(env.ADMIN_SESSION_SECRET,exp))},200,origin)}
 if(!await adminAuth(request,env))return jsonReply({error:"Login required"},401,origin);
 const db=env.DUVERO_DB;
 if(url.pathname==="/admin/enquiries"&&request.method==="GET"){const data=await db.prepare("SELECT * FROM enquiries ORDER BY created_at DESC,id DESC LIMIT 200").all();return jsonReply({enquiries:(data.results||[]).map(normalizeEnquiry)},200,origin)}
 if(url.pathname==="/admin/suppliers"&&request.method==="GET"){const rows=await db.prepare("SELECT * FROM suppliers ORDER BY name").all();return jsonReply({items:(rows.results||[]).map(x=>({...x,categories:JSON.parse(x.categories||"[]")}))},200,origin)}
 if(url.pathname==="/admin/charge-definitions"&&request.method==="GET"){const rows=await db.prepare("SELECT * FROM charge_definitions ORDER BY name").all();return jsonReply({items:rows.results||[]},200,origin)}
 if(url.pathname==="/admin/conversion-factors"&&request.method==="GET"){const rows=await db.prepare("SELECT name,value FROM calculation_settings").all();return jsonReply({items:rows.results||[]},200,origin)}
 if(url.pathname==="/admin/suppliers"&&request.method==="POST"){const x=await request.json(),name=clean(x.name,150);if(!name)return jsonReply({error:"Supplier name required"},400,origin);await db.prepare("INSERT INTO suppliers(name,email,categories) VALUES(?,?,?)").bind(name,clean(x.email,250),JSON.stringify(Array.isArray(x.categories)?x.categories:[])).run();return jsonReply({ok:true},201,origin)}
 if(url.pathname==="/admin/charge-definitions"&&request.method==="POST"){const x=await request.json(),name=clean(x.name,120);if(!name||!["flat","gross","cw","cbm","rt"].includes(x.basis)||!["Origin","Destination"].includes(x.section))return jsonReply({error:"Invalid charge line"},400,origin);await db.prepare("INSERT INTO charge_definitions(name,basis,section) VALUES(?,?,?)").bind(name,x.basis,x.section).run();return jsonReply({ok:true},201,origin)}
 if(url.pathname==="/admin/conversion-factors"&&request.method==="POST"){const x=await request.json(),value=Number(x.value);if(!["air","road","rail","sea"].includes(x.name)||!Number.isFinite(value)||value<=0||value>10000)return jsonReply({error:"Invalid conversion factor"},400,origin);await db.prepare("INSERT INTO calculation_settings(name,value) VALUES(?,?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(x.name,value).run();return jsonReply({ok:true},200,origin)}
 if(url.pathname==="/admin/suppliers"&&request.method==="PUT"){const x=await request.json(),id=Number(x.id),name=clean(x.name,150);if(!Number.isInteger(id)||id<1||!name)return jsonReply({error:"Invalid supplier"},400,origin);await db.prepare("UPDATE suppliers SET name=?,email=?,categories=?,active=? WHERE id=?").bind(name,clean(x.email,250),JSON.stringify(Array.isArray(x.categories)?x.categories:[]),x.active===false?0:1,id).run();return jsonReply({ok:true},200,origin)}
 if(url.pathname==="/admin/charge-definitions"&&request.method==="PUT"){const x=await request.json(),id=Number(x.id),name=clean(x.name,120);if(!Number.isInteger(id)||id<1||!name||!["flat","gross","cw","cbm","rt"].includes(x.basis)||!["Origin","Destination"].includes(x.section))return jsonReply({error:"Invalid charge definition"},400,origin);await db.prepare("UPDATE charge_definitions SET name=?,basis=?,section=?,active=? WHERE id=?").bind(name,x.basis,x.section,x.active===false?0:1,id).run();return jsonReply({ok:true},200,origin)}
 if(url.pathname==="/admin/customer-companies"&&request.method==="GET"){
  const companies=await db.prepare("SELECT c.id,c.country,c.registration_number,c.company_name,(SELECT COUNT(*) FROM customer_contacts k WHERE k.company_id=c.id) AS contacts_count FROM customer_companies c ORDER BY c.company_name").all();
  return jsonReply({items:companies.results||[]},200,origin);
 }
 const contactsMatch=url.pathname.match(/^\/admin\/customer-companies\/(\d+)\/contacts$/);
 if(contactsMatch&&request.method==="GET"){
  const contacts=await db.prepare("SELECT id,email,full_name,phone FROM customer_contacts WHERE company_id=? ORDER BY email").bind(Number(contactsMatch[1])).all();
  return jsonReply({items:contacts.results||[]},200,origin);
 }
 if(url.pathname==="/admin/address-book"&&request.method==="GET"){
  const kind=url.searchParams.get("kind");if(!["supplier","customer"].includes(kind))return jsonReply({error:"Invalid address book kind"},400,origin);
  const result=await db.prepare("SELECT * FROM address_book WHERE kind=? ORDER BY company").bind(kind).all();
  return jsonReply({items:result.results||[]},200,origin);
 }
 if(url.pathname==="/admin/address-book"&&request.method==="POST"){
  const x=await request.json(),kind=x.kind,company=clean(x.company,150);
  if(!["supplier","customer"].includes(kind)||!company)return jsonReply({error:"Company and type required"},400,origin);
  const values=["address","country","city","postcode","phone","email","contact","notes"].map(k=>clean(x[k],k==="notes"?2000:250));
  const found=await db.prepare("SELECT id FROM address_book WHERE kind=? AND company=? COLLATE NOCASE").bind(kind,company).first();
  if(found)return jsonReply({error:"Company already exists in address book"},409,origin);
  await db.prepare("INSERT INTO address_book(kind,company,address,country,city,postcode,phone,email,contact,notes) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(kind,company,...values).run();
  return jsonReply({ok:true},201,origin);
 }
 if(url.pathname==="/admin/address-book"&&request.method==="PUT"){
  const x=await request.json(),id=Number(x.id),company=clean(x.company,150);
  if(!Number.isInteger(id)||id<1||!company)return jsonReply({error:"Invalid company"},400,origin);
  const values=["address","country","city","postcode","phone","email","contact","notes"].map(k=>clean(x[k],k==="notes"?2000:250));
  const result=await db.prepare("UPDATE address_book SET company=?,address=?,country=?,city=?,postcode=?,phone=?,email=?,contact=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(company,...values,id).run();
  return jsonReply({ok:true},200,origin);
 }
 const match=url.pathname.match(/^\/admin\/enquiries\/(\d+)(?:\/(preview|send|finance|tracking|emails|calculation))?$/);if(!match)return jsonReply({error:"Not found"},404,origin);
 const id=Number(match[1]);const record=await db.prepare("SELECT * FROM enquiries WHERE id=?").bind(id).first();if(!record)return jsonReply({error:"Enquiry not found"},404,origin);
 if(match[2]==="calculation"&&request.method==="PUT"){
  if(record.status==="Quoted")return jsonReply({error:"Quotation already sent. Create a revised draft first."},409,origin);
  const input=await request.json(),service=String(record.service||"air").toLowerCase();
  const gross=Number(input.grossKg),cbm=Number(input.cbm),manual=input.manualCW===""||input.manualCW==null?null:Number(input.manualCW);
  if(!Number.isFinite(gross)||gross<0||!Number.isFinite(cbm)||cbm<0||(manual!==null&&(!Number.isFinite(manual)||manual<0)))return jsonReply({error:"Invalid cargo weight"},400,origin);
  const factors=await db.prepare("SELECT name,value FROM calculation_settings").all();
  const factor=Number((factors.results||[]).find(x=>x.name===service)?.value)||166.6666667;
  const automaticCW=Math.max(gross,cbm*factor),cw=manual===null?automaticCW:manual,rt=Math.max(cbm,gross/1000);
  const items=Array.isArray(input.lines)?input.lines.slice(0,30):[];
  const calculated=[];
  for(const item of items){const name=clean(item.description,120),basis=item.basis,section=item.section,netRate=Number(item.netRate),saleRate=Number(item.saleRate);
   if(!name||!["flat","gross","cw","cbm","rt"].includes(basis)||!["Origin","Destination"].includes(section)||!Number.isFinite(netRate)||!Number.isFinite(saleRate)||netRate<0||saleRate<0||netRate>1e8||saleRate>1e8)return jsonReply({error:"Invalid charge line"},400,origin);
   const qty={flat:1,gross,cw,cbm,rt}[basis];calculated.push({description:name,basis,section,supplier:clean(item.supplier,150),netRate,saleRate,quantity:qty,netTotal:Math.round(netRate*qty*100)/100,saleTotal:Math.round(saleRate*qty*100)/100});
  }
  const prices=calculated.map(x=>({description:x.description,amount:x.saleTotal})),costs=calculated.map(x=>({description:x.description,amount:x.netTotal,supplier:x.supplier}));
  const calculation={grossKg:gross,cbm,automaticCW,manualCW:manual,chargeableKg:cw,lines:calculated};
  await db.prepare("UPDATE enquiries SET calculation_data=?,price_lines=?,cost_lines=?,status=CASE WHEN status='New' THEN 'Draft' ELSE status END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(JSON.stringify(calculation),JSON.stringify(prices),JSON.stringify(costs),id).run();
  return jsonReply({enquiry:normalizeEnquiry(await db.prepare("SELECT * FROM enquiries WHERE id=?").bind(id).first())},200,origin);
 }
 if(match[2]==="emails"&&request.method==="GET"){const result=await db.prepare("SELECT id,sender,recipient,subject,body,email_date,created_at FROM enquiry_emails WHERE enquiry_id=? ORDER BY id DESC LIMIT 100").bind(id).all();return jsonReply({emails:result.results||[]},200,origin)}
 if(match[2]==="emails"&&request.method==="POST"){const input=await request.json();const subject=clean(input.subject,300),body=clean(input.body,20000),sender=clean(input.sender,250),recipient=clean(input.recipient,250),emailDate=clean(input.email_date,40);if(!body.trim())return jsonReply({error:"Email text is required"},400,origin);await db.prepare("INSERT INTO enquiry_emails(enquiry_id,sender,recipient,subject,body,email_date) VALUES(?,?,?,?,?,?)").bind(id,sender,recipient,subject,body,emailDate).run();return jsonReply({ok:true},201,origin)}
 if(request.method==="PUT"&&match[2]==="tracking"){
 const input=await request.json();
 const allowed=["New","Draft","Quoted","Revised draft","Accepted","Declined","Closed"];
 const status=allowed.includes(input.status)?input.status:record.status;
 const followup=String(input.followup_date||"");
 if(followup&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(followup))return jsonReply({error:"Invalid follow-up date"},400,origin);
 const notes=clean(input.internal_notes,4000);
 const archived=input.archived===true?1:0;
 await db.prepare("UPDATE enquiries SET status=?,followup_date=?,internal_notes=?,archived=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,followup,notes,archived,id).run();
 return jsonReply({enquiry:normalizeEnquiry(await db.prepare("SELECT * FROM enquiries WHERE id=?").bind(id).first())},200,origin);
}
if(request.method==="PUT"&&match[2]==="finance"){
 const input=await request.json();
 const parse=a=>(Array.isArray(a)?a:[]).slice(0,100).map(x=>({description:clean(x.description,150),supplier:clean(x.supplier,100),invoice_number:clean(x.invoice_number,100),amount:Number(x.amount)})).filter(x=>x.description&&Number.isFinite(x.amount)&&x.amount>=0&&x.amount<1e9);
 const costs=parse(input.cost_lines),invoices=parse(input.invoice_lines);
 const actual={pieces:Number(input.shipment_actual?.pieces)||0,weight:Number(input.shipment_actual?.weight)||0,cbm:Number(input.shipment_actual?.cbm)||0};
 const revise=input.revise_sale===true,reason=clean(input.reason,500);
 if(revise&&!reason.trim())return jsonReply({error:"Reason required for sale price revision"},400,origin);
 const prices=revise?parse(input.price_lines).map(x=>({description:x.description,amount:x.amount})):JSON.parse(record.price_lines||"[]");
 const revision=Number(record.price_revision||0)+(revise?1:0);
 const queries=[db.prepare("UPDATE enquiries SET cost_lines=?,invoice_lines=?,shipment_actual=?,price_lines=?,price_revision=?,price_revision_reason=?,status=CASE WHEN ?=1 AND status='Quoted' THEN 'Revised draft' ELSE status END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(JSON.stringify(costs),JSON.stringify(invoices),JSON.stringify(actual),JSON.stringify(prices),revision,revise?reason:record.price_revision_reason,revise?1:0,id)];
 if(revise)queries.push(db.prepare("INSERT INTO quotation_revisions(enquiry_id,revision_number,snapshot,reason) VALUES(?,?,?,?)").bind(id,revision,JSON.stringify({previous:JSON.parse(record.price_lines||"[]"),current:prices,actual}),reason));
 await db.batch(queries);
 return jsonReply({enquiry:normalizeEnquiry(await db.prepare("SELECT * FROM enquiries WHERE id=?").bind(id).first())},200,origin);
}
if(request.method==="PUT"&&!match[2]){const input=await request.json();const currency=["EUR","DKK","USD"].includes(input.currency)?input.currency:"EUR";const price_lines=Array.isArray(input.price_lines)?input.price_lines.slice(0,30).map(x=>({description:clean(x.description,120),amount:Number(x.amount)||0})).filter(x=>x.description&&x.amount>=0&&x.amount<1e9):[];if(record.status==="Quoted"&&JSON.stringify(price_lines)!==JSON.stringify(JSON.parse(record.price_lines||"[]")))return jsonReply({error:"This quotation has already been sent. Use Revise sale price with a reason before changing customer prices."},409,origin);await db.prepare("UPDATE enquiries SET currency=?,transit=?,validity=?,incoterm=?,remarks=?,price_lines=?,status=CASE WHEN status='New' THEN 'Draft' ELSE status END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(currency,clean(input.transit,80),Math.max(1,Math.min(365,Number(input.validity)||7)),clean(input.incoterm,20),clean(input.remarks,1000),JSON.stringify(price_lines),id).run();return jsonReply({enquiry:normalizeEnquiry(await db.prepare("SELECT * FROM enquiries WHERE id=?").bind(id).first())},200,origin)}
 if((match[2]==="preview"&&request.method==="GET")||(match[2]==="send"&&request.method==="POST")){
  const d=normalizeEnquiry(record),prices=d.price_lines||[];if(!prices.length||!prices.some(x=>x.amount>0))return jsonReply({error:"Add prices before generating an offer"},400,origin);
  const total=prices.reduce((n,x)=>n+Number(x.amount||0),0);const summary=prices.map(x=>x.description+": "+d.currency+" "+Number(x.amount).toFixed(2)).join(" | ");
  const offer={...d.payload,service:d.service,details:"Quotation "+d.quote_number+" | "+summary+" | TOTAL "+d.currency+" "+total.toFixed(2)+" | Transit "+d.transit+" | Validity "+d.validity+" days | "+d.remarks};
  const pdf=makeQuotePdf(offer,d.company,d.person,d.email,d.phone,d.quote_number,{currency:d.currency,transit:d.transit,validity:d.validity,prices,total,remarks:d.remarks});
  if(match[2]==="preview")return jsonReply({pdf},200,origin);
  const input=await request.json();if(input.confirmed!==true)return jsonReply({error:"Recipient confirmation required"},400,origin);const recipient=clean(input.recipient,254),subject=clean(input.subject,180);if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(recipient)||!subject)return jsonReply({error:"Invalid recipient or subject"},400,origin);
  if(!env.RESEND_API_KEY)return jsonReply({error:"Email not configured"},503,origin);
  const resp=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:"DUVERO Quotes <info@duveroglobal.com>",to:[recipient],reply_to:env.QUOTE_RECIPIENT,subject,text:"Dear customer,\\n\\nPlease find attached our freight quotation "+d.quote_number+".\\n\\nKind regards,\\nDUVERO Global Freight & Logistics",attachments:[{filename:"DUVERO_Quotation_"+d.quote_number+".pdf",content:pdf}]})});
  if(!resp.ok)return jsonReply({error:"Email provider rejected quotation"},502,origin);
  await db.prepare("UPDATE enquiries SET status='Quoted',sent_at=CURRENT_TIMESTAMP,sent_to=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(recipient,id).run();return jsonReply({ok:true},200,origin)
 }
 return jsonReply({error:"Method not allowed"},405,origin)
}
function normalizeEnquiry(r){return {...r,payload:JSON.parse(r.payload||"{}"),price_lines:JSON.parse(r.price_lines||"[]"),cost_lines:JSON.parse(r.cost_lines||"[]"),invoice_lines:JSON.parse(r.invoice_lines||"[]"),shipment_actual:JSON.parse(r.shipment_actual||"{}"),calculation_data:JSON.parse(r.calculation_data||"{}")}}
async function saveEnquiries(env,data,company,person,email,phone){
 const db=env.DUVERO_DB;const modes=data.service==="multi"?data.multiModes.filter(x=>["sea","air","road","rail","courier"].includes(x)): [data.service];if(!modes.length)throw Error("No modes");
 // Registration identity is country + number, not company name or email.
 const country=clean(data.companyCountry,3).toUpperCase();
 const regRaw=clean(data.registrationNumber,60).toUpperCase();
 const registration=regRaw.replace(/[\s-]/g,"");
 if(!/^[A-Z]{2}$/.test(country)||!registration||registration.length>40||(country==="DK"&&!/^\d{8}$/.test(registration)))throw Error("Invalid company registration");
 // Register one company and many contacts; never grant customers access to old RFQs.
 await db.prepare("INSERT OR IGNORE INTO customer_companies(country,registration_number,company_name) VALUES(?,?,?)").bind(country,registration,company).run();
 const identity=await db.prepare("SELECT id FROM customer_companies WHERE country=? AND registration_number=?").bind(country,registration).first();
 if(!identity)throw Error("Customer identity could not be created");
 await db.prepare("INSERT OR IGNORE INTO customer_contacts(company_id,email,full_name,phone) VALUES(?,?,?,?)").bind(identity.id,email,person,phone).run();
 // Address book is a convenience index; identity and contacts remain authoritative.
 const existing=await db.prepare("SELECT id,country FROM address_book WHERE kind='customer' AND company=? COLLATE NOCASE").bind(company).first();
 if(!existing)await db.prepare("INSERT OR IGNORE INTO address_book(kind,company,country,address,postcode,city,email,contact,phone) VALUES('customer',?,?,?,?,?,?,?,?)").bind(company,country,clean(data.companyAddress,250),clean(data.companyPostcode,30),clean(data.companyCity,120),email,person,phone).run();
 else if(!existing.country||existing.country===country)await db.prepare("UPDATE address_book SET address=CASE WHEN address='' THEN ? ELSE address END,postcode=CASE WHEN postcode='' THEN ? ELSE postcode END,city=CASE WHEN city='' THEN ? ELSE city END WHERE id=?").bind(clean(data.companyAddress,250),clean(data.companyPostcode,30),clean(data.companyCity,120),existing.id).run();
 const period=new Date().toISOString().slice(0,7),group_id=crypto.randomUUID();const origin=[data.originPostcode,data.originCity,data.originCountry].filter(Boolean).join(" "),destination=[data.destPostcode,data.destCity,data.destCountry].filter(Boolean).join(" ");
 const statements=[db.prepare("INSERT INTO quote_counters(period,last_number) VALUES (?,0) ON CONFLICT(period) DO NOTHING").bind(period)];
 for(let i=0;i<modes.length;i++)statements.push(db.prepare("UPDATE quote_counters SET last_number=last_number+1 WHERE period=?").bind(period));
 await db.batch(statements);
 const count=await db.prepare("SELECT last_number FROM quote_counters WHERE period=?").bind(period).first();const start=count.last_number-modes.length+1;const ids=[];
 for(let i=0;i<modes.length;i++){const quote_number=period+"-"+String(start+i).padStart(5,"0"),mode=modes[i];const payload={...data,service:mode,scope:data.service==="multi"?"lcl":data.scope};const result=await db.prepare("INSERT INTO enquiries(quote_number,group_id,service,company,person,email,phone,origin,destination,payload,incoterm) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(quote_number,group_id,mode,company,person,email,phone,origin,destination,JSON.stringify(payload),clean(data.incoterm,20)).run();ids.push(quote_number)}
 return ids;
}

const reply=(body,status=200,origin="https://duveroglobal.com")=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":origin,"Vary":"Origin","Cache-Control":"no-store"}});
const clean=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
export default {async fetch(request,env){
 const origin=env.ALLOWED_ORIGIN||"https://duveroglobal.com";
 const reqOrigin=request.headers.get("Origin");const url=new URL(request.url);
 const isLocationGet=request.method==="GET"&&new URL(request.url).pathname==="/locations";
 if(reqOrigin!==origin && !(isLocationGet && !reqOrigin))return reply({error:"Origin not allowed"},403,origin);
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"GET, POST, PUT, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization","Vary":"Origin"}});
 if(url.pathname.startsWith("/admin/")){try{return await adminRoute(request,env,origin,url)}catch(e){return jsonReply({error:"Admin request failed"},500,origin)}}
 if(request.method==="GET"&&new URL(request.url).pathname==="/locations"){
  if(!env.DUVERO_DB)return reply({error:"Database binding not configured"},503,origin);
  const url=new URL(request.url),country=clean(url.searchParams.get("country"),2).toUpperCase(),q=clean(url.searchParams.get("q"),80);
  if(!/^[A-Z]{2}$/.test(country)||q.length<2)return reply({results:[]},200,origin);
  const prefix=q.replace(/[%_]/g,"")+"%";
  try{
   const result=await env.DUVERO_DB.prepare("SELECT postal_code AS postcode, city FROM locations WHERE country_code = ? AND (postal_code LIKE ? OR city LIKE ?) GROUP BY postal_code, city ORDER BY CASE WHEN postal_code LIKE ? THEN 0 ELSE 1 END, postal_code, city LIMIT 500").bind(country,prefix,prefix,prefix).all();
   return reply({results:result.results||[]},200,origin);
  }catch{return reply({error:"Location lookup unavailable"},503,origin)}
 }
 if(request.method!=="POST")return reply({error:"Method not allowed"},405,origin);
 if(env.QUOTE_ENABLED!=="true")return reply({error:"Email sending is not enabled yet"},503,origin);
 if(!env.TURNSTILE_SECRET_KEY)return reply({error:"Spam protection not configured"},503,origin);
 if(!env.RESEND_API_KEY||!env.QUOTE_RECIPIENT)return reply({error:"Service not configured"},503,origin);
 if(Number(request.headers.get("content-length")||0)>8500000)return reply({error:"Request too large"},413,origin);
 let data;try{data=await request.json()}catch{return reply({error:"Invalid JSON"},400,origin)}
 if(!data||typeof data!=="object"||Array.isArray(data))return reply({error:"Invalid data"},400,origin);
 if(data.website)return reply({ok:true},200,origin); // honeypot
 const token=clean(data.turnstileToken,2048);
 if(!token)return reply({error:"Anti-spam verification required"},400,origin);
 const form=new FormData();form.append("secret",env.TURNSTILE_SECRET_KEY);form.append("response",token);
 const verification=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:form});
 if(!verification.ok||!(await verification.json()).success)return reply({error:"Anti-spam verification failed"},403,origin);
 const email=clean(data.email,254),person=clean(data.person,120),company=clean(data.company,150),phone=clean(data.phone,80);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!person||!company||!phone)return reply({error:"Missing or invalid contact details"},400,origin);
 if(!Array.isArray(data.cargo)||!data.cargo.length||data.cargo.length>30)return reply({error:"Invalid cargo"},400,origin);
 const registration=String(data.registrationNumber||"").toUpperCase().replace(/[\s-]/g,""),companyCountry=String(data.companyCountry||"").toUpperCase();
 if(!/^[A-Z]{2}$/.test(companyCountry)||!registration||registration.length>40||(companyCountry==="DK"&&!/^\d{8}$/.test(registration)))return reply({error:"Valid company registration number and country required"},400,origin);
 if(!clean(data.companyAddress,250)||!clean(data.companyPostcode,30)||!clean(data.companyCity,120))return reply({error:"Company address, postal code and city required"},400,origin);
 const attachments=Array.isArray(data.attachments)?data.attachments:[];
 if(attachments.length>3||attachments.some(a=>!a||typeof a.filename!=="string"||!/\.(pdf|jpe?g|png|docx?|xlsx?)$/i.test(a.filename)||typeof a.content!=="string"||a.content.length>2800000||!/^[A-Za-z0-9+/]+={0,2}$/.test(a.content)))return reply({error:"Invalid attachment"},400,origin);
 const lines=[
 ["Service",data.service],["Requested modes",data.service==="multi"&&Array.isArray(data.multiModes)?data.multiModes.filter(m=>["sea","air","road","rail","courier"].includes(m)).map(m=>({sea:"Sea LCL",air:"Air",road:"Road LTL",rail:"Rail LCL",courier:"Courier / express"})[m]).join(" + "):""],["Direction",data.direction],["Incoterm",data.incoterm],["Transport type",data.scope],
 ["Origin country",data.originCountryOther||data.originCountry],["Origin city",data.originCity],["Origin postal code",data.originPostcode],["Origin address",data.originAddress],["Origin party",data.originParty],
 ["Destination country",data.destCountryOther||data.destCountry],["Destination city",data.destCity],["Destination postal code",data.destPostcode],["Destination address",data.destAddress],["Destination party",data.destParty],["Tail-lift delivery",["sea","air","rail","road","multi"].includes(data.service)?(data.tailLift?"Required":"Not required"):""],
 ["Goods",data.commodity],["Ready date",data.ready],["Dangerous goods",data.danger],["UN number",data.un],["Remarks",data.details],
 ["Company",company],["Company address",data.companyAddress],["Company postal code",data.companyPostcode],["Company city",data.companyCity],["Company country",data.companyCountry],["Name",person],["Email",email],["Phone",phone]
 ].map(([k,v])=>k+": "+clean(v,1500));
 const cargo=data.cargo.map((c,i)=>"Line "+(i+1)+": "+["type","size","qty","weight","length","width","height","stack"].map(k=>k+"="+clean(c?.[k],100)).join(", ")).join("\n");
 const body=lines.join("\n")+"\n\nCargo:\n"+cargo;
 let quoteNumbers=[];
 if(!env.DUVERO_DB)return reply({error:"Quote database is not configured; cannot allocate quotation numbers"},503,origin);
 try{quoteNumbers=await saveEnquiries(env,data,company,person,email,phone)}catch(e){return reply({error:"Could not allocate quote numbers; enquiry not sent"},500,origin)}
 const selectedModes=data.service==="multi"?data.multiModes.filter(m=>["sea","air","road","rail","courier"].includes(m)):[data.service];
 const pdfAttachments=quoteNumbers.map((number,i)=>({filename:"DUVERO_Enquiry_"+number+".pdf",content:makeQuotePdf({...data,service:selectedModes[i],scope:data.service==="multi"?"lcl":data.scope},company,person,email,phone,number)}));
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:"DUVERO Quotes <info@duveroglobal.com>",to:[env.QUOTE_RECIPIENT],reply_to:email,subject:"DUVERO freight enquiry — "+company+" — "+quoteNumbers.join(" / "),text:"Quote numbers: "+quoteNumbers.join(", ")+"\n\n"+body,attachments:[...pdfAttachments,...attachments.map(a=>({filename:clean(a.filename,120).replace(/[\\/]/g,"_"),content:a.content}))]})});
 if(!response.ok)return reply({error:"Email delivery failed"},502,origin);
 
 return reply({ok:true,quoteNumbers},200,origin);
}};