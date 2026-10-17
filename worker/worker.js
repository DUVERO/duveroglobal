// DUVERO quote email API — deploy separately as a Cloudflare Worker.
// Required secrets: RESEND_API_KEY, QUOTE_RECIPIENT (Gmail address).
// Required variable: ALLOWED_ORIGIN=https://duveroglobal.com
// The public website remains in test mode until explicitly enabled.
const reply=(body,status=200,origin="https://duveroglobal.com")=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":origin,"Vary":"Origin","Cache-Control":"no-store"}});
const clean=(v,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
export default {async fetch(request,env){
 const origin=env.ALLOWED_ORIGIN||"https://duveroglobal.com";
 const reqOrigin=request.headers.get("Origin");
 const isLocationGet=request.method==="GET"&&new URL(request.url).pathname==="/locations";
 if(reqOrigin!==origin && !(isLocationGet && !reqOrigin))return reply({error:"Origin not allowed"},403,origin);
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Vary":"Origin"}});
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
 ["Service",data.service],["Requested modes",data.service==="multi"&&Array.isArray(data.multiModes)?data.multiModes.filter(m=>["sea","air","rail"].includes(m)).map(m=>m==="sea"?"Sea LCL":m==="rail"?"Rail LCL":"Air").join(" + "):""],["Direction",data.direction],["Incoterm",data.incoterm],["Transport type",data.scope],
 ["Origin country",data.originCountryOther||data.originCountry],["Origin city",data.originCity],["Origin postal code",data.originPostcode],["Origin address",data.originAddress],["Origin party",data.originParty],
 ["Destination country",data.destCountryOther||data.destCountry],["Destination city",data.destCity],["Destination postal code",data.destPostcode],["Destination address",data.destAddress],["Destination party",data.destParty],
 ["Goods",data.commodity],["Ready date",data.ready],["Dangerous goods",data.danger],["UN number",data.un],["Remarks",data.details],
 ["Company",company],["Name",person],["Email",email],["Phone",phone]
 ].map(([k,v])=>k+": "+clean(v,1500));
 const cargo=data.cargo.map((c,i)=>"Line "+(i+1)+": "+["type","size","qty","weight","length","width","height","stack"].map(k=>k+"="+clean(c?.[k],100)).join(", ")).join("\n");
 const body=lines.join("\n")+"\n\nCargo:\n"+cargo;
 const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:"DUVERO Quotes <info@duveroglobal.com>",to:[env.QUOTE_RECIPIENT],reply_to:email,subject:"DUVERO freight enquiry — "+company,text:body,attachments:attachments.map(a=>({filename:clean(a.filename,120).replace(/[\\/]/g,"_"),content:a.content}))})});
 if(!response.ok)return reply({error:"Email delivery failed"},502,origin);
 return reply({ok:true},200,origin);
}};