// DUVERO quote email API — deploy separately as a Cloudflare Worker.
// Required secrets: RESEND_API_KEY, QUOTE_RECIPIENT (Gmail address).
// Required variable: ALLOWED_ORIGIN=https://duveroglobal.com
// The public website remains in test mode until explicitly enabled.

function makeQuotePdf(d,company,person,email,phone){
 const cleanPdf=v=>String(v??"").replace(/[^\x20-\x7e]/g," ").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)").slice(0,110);
 const labels={sea:"Sea Freight - LCL",air:"Air Freight",road:"Road Freight - LTL",rail:"Rail Freight - LCL",courier:"Courier / Express"};
 const pages=[];let cmds=[],y=700;
 const text=(v,x,yy,size=10,bold=false)=>cmds.push("BT /"+(bold?"B":"R")+" "+size+" Tf 1 0 0 1 "+x+" "+yy+" Tm ("+cleanPdf(v)+") Tj ET");
 const start=()=>{cmds=["0.03 0.18 0.28 rg 0 724 595 88 re f","0 0.58 0.6 rg 0 720 595 4 re f"];cmds.push("1 1 1 rg");text("DUVERO",40,768,27,true);text("GLOBAL FREIGHT & LOGISTICS",41,746,9);text("FREIGHT ENQUIRY",388,765,14,true);cmds.push("0.04 0.19 0.28 rg");y=690};
 const next=()=>{pages.push(cmds.join("\n"));start()};
 const check=h=>{if(y-h<48)next()};
 const section=v=>{check(45);cmds.push("0.91 0.96 0.96 rg 36 "+(y-11)+" 523 28 re f","0.04 0.19 0.28 rg");text(v.toUpperCase(),46,y,11,true);y-=43};
 const row=(k,v)=>{if(v===undefined||v===null||String(v).trim()==="")return;check(25);cmds.push("0.34 0.42 0.47 rg");text(k,46,y,9);cmds.push("0.04 0.19 0.28 rg");text(v,207,y,9,true);y-=23};
 start();section("Shipment overview");row("Service",d.service==="multi"?"Compare Freight":labels[d.service]||d.service);
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
 const match=url.pathname.match(/^\/admin\/enquiries\/(\d+)(?:\/(preview|send))?$/);if(!match)return jsonReply({error:"Not found"},404,origin);
 const id=Number(match[1]);const record=await db.prepare("SELECT * FROM enquiries WHERE id=?").bind(id).first();if(!record)return jsonReply({error:"Enquiry not found"},404,origin);
 if(request.method==="PUT"&&!match[2]){const input=await request.json();const currency=["EUR","DKK","USD"].includes(input.currency)?input.currency:"EUR";const price_lines=Array.isArray(input.price_lines)?input.price_lines.slice(0,30).map(x=>({description:clean(x.description,120),amount:Number(x.amount)||0})).filter(x=>x.description&&x.amount>=0&&x.amount<1e9):[];await db.prepare("UPDATE enquiries SET currency=?,transit=?,validity=?,incoterm=?,remarks=?,price_lines=?,status=CASE WHEN status='New' THEN 'Draft' ELSE status END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(currency,clean(input.transit,80),Math.max(1,Math.min(365,Number(input.validity)||7)),clean(input.incoterm,20),clean(input.remarks,1000),JSON.stringify(price_lines),id).run();return jsonReply({enquiry:normalizeEnquiry(await db.prepare("SELECT * FROM enquiries WHERE id=?").bind(id).first())},200,origin)}
 if((match[2]==="preview"&&request.method==="GET")||(match[2]==="send"&&request.method==="POST")){
  const d=normalizeEnquiry(record),prices=d.price_lines||[];if(!prices.length||!prices.some(x=>x.amount>0))return jsonReply({error:"Add prices before generating an offer"},400,origin);
  const total=prices.reduce((n,x)=>n+Number(x.amount||0),0);const summary=prices.map(x=>x.description+": "+d.currency+" "+Number(x.amount).toFixed(2)).join(" | ");
  const offer={...d.payload,service:d.service,details:"Quotation "+d.quote_number+" | "+summary+" | TOTAL "+d.currency+" "+total.toFixed(2)+" | Transit "+d.transit+" | Validity "+d.validity+" days | "+d.remarks};
  const pdf=makeQuotePdf(offer,d.company,d.person,d.email,d.phone);
  if(match[2]==="preview")return jsonReply({pdf},200,origin);
  const input=await request.json();if(input.confirmed!==true)return jsonReply({error:"Recipient confirmation required"},400,origin);const recipient=clean(input.recipient,254),subject=clean(input.subject,180);if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(recipient)||!subject)return jsonReply({error:"Invalid recipient or subject"},400,origin);
  if(!env.RESEND_API_KEY)return jsonReply({error:"Email not configured"},503,origin);
  const resp=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:"DUVERO Quotes <info@duveroglobal.com>",to:[recipient],reply_to:env.QUOTE_RECIPIENT,subject,text:"Dear customer,\\n\\nPlease find attached our freight quotation "+d.quote_number+".\\n\\nKind regards,\\nDUVERO Global Freight & Logistics",attachments:[{filename:"DUVERO_Quotation_"+d.quote_number+".pdf",content:pdf}]})});
  if(!resp.ok)return jsonReply({error:"Email provider rejected quotation"},502,origin);
  await db.prepare("UPDATE enquiries SET status='Quoted',sent_at=CURRENT_TIMESTAMP,sent_to=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(recipient,id).run();return jsonReply({ok:true},200,origin)
 }
 return jsonReply({error:"Method not allowed"},405,origin)
}
function normalizeEnquiry(r){return {...r,payload:JSON.parse(r.payload||"{}"),price_lines:JSON.parse(r.price_lines||"[]")}}
async function saveEnquiries(env,data,company,person,email,phone){
 const db=env.DUVERO_DB;const modes=data.service==="multi"?data.multiModes.filter(x=>["sea","air","road","rail","courier"].includes(x)): [data.service];if(!modes.length)throw Error("No modes");
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
 const attachments=Array.isArray(data.attachments)?data.attachments:[];
 if(attachments.length>3||attachments.some(a=>!a||typeof a.filename!=="string"||!/\.(pdf|jpe?g|png|docx?|xlsx?)$/i.test(a.filename)||typeof a.content!=="string"||a.content.length>2800000||!/^[A-Za-z0-9+/]+={0,2}$/.test(a.content)))return reply({error:"Invalid attachment"},400,origin);
 const lines=[
 ["Service",data.service],["Requested modes",data.service==="multi"&&Array.isArray(data.multiModes)?data.multiModes.filter(m=>["sea","air","road","rail","courier"].includes(m)).map(m=>({sea:"Sea LCL",air:"Air",road:"Road LTL",rail:"Rail LCL",courier:"Courier / express"})[m]).join(" + "):""],["Direction",data.direction],["Incoterm",data.incoterm],["Transport type",data.scope],
 ["Origin country",data.originCountryOther||data.originCountry],["Origin city",data.originCity],["Origin postal code",data.originPostcode],["Origin address",data.originAddress],["Origin party",data.originParty],
 ["Destination country",data.destCountryOther||data.destCountry],["Destination city",data.destCity],["Destination postal code",data.destPostcode],["Destination address",data.destAddress],["Destination party",data.destParty],["Tail-lift delivery",["sea","air","rail","road","multi"].includes(data.service)?(data.tailLift?"Required":"Not required"):""],
 ["Goods",data.commodity],["Ready date",data.ready],["Dangerous goods",data.danger],["UN number",data.un],["Remarks",data.details],
 ["Company",company],["Name",person],["Email",email],["Phone",phone]
 ].map(([k,v])=>k+": "+clean(v,1500));
 const cargo=data.cargo.map((c,i)=>"Line "+(i+1)+": "+["type","size","qty","weight","length","width","height","stack"].map(k=>k+"="+clean(c?.[k],100)).join(", ")).join("\n");
 const body=lines.join("\n")+"\n\nCargo:\n"+cargo;
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:"DUVERO Quotes <info@duveroglobal.com>",to:[env.QUOTE_RECIPIENT],reply_to:email,subject:"DUVERO freight enquiry — "+company,text:body,attachments:[{filename:"DUVERO_Freight_Enquiry.pdf",content:makeQuotePdf(data,company,person,email,phone)},...attachments.map(a=>({filename:clean(a.filename,120).replace(/[\\/]/g,"_"),content:a.content}))]})});
 if(!response.ok)return reply({error:"Email delivery failed"},502,origin);
 let quoteNumbers=[];if(env.DUVERO_DB){try{quoteNumbers=await saveEnquiries(env,data,company,person,email,phone)}catch(e){return reply({error:"Email sent but enquiry could not be saved. Contact DUVERO."},500,origin)}}
 return reply({ok:true,quoteNumbers},200,origin);
}};