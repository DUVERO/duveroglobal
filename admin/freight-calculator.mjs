// DUVERO freight calculation engine. No network access; amounts use a single quote currency.
// Basis: flat, gross kg, chargeable kg, cubic metres, revenue tons (LCL).
export const defaults={air:1000/6,road:1000/3,rail:1000/3,sea:1000};
export function calculateWeight({service="air",grossKg=0,cbm=0,factors=defaults,manualCW=null}={}){
 const gross=Math.max(0,Number(grossKg)||0),volume=Math.max(0,Number(cbm)||0);
 const factor=Number(factors[service])||defaults[service]||defaults.air;
 const automatic=Math.max(gross,volume*factor);
 const manual=manualCW===null||manualCW===""?null:Number(manualCW);
 if(manual!==null&&(!Number.isFinite(manual)||manual<0))throw Error("Invalid manual chargeable weight");
 return {grossKg:gross,cbm:volume,automaticCW:automatic,chargeableKg:manual===null?automatic:manual,manualOverride:manual!==null,rt:Math.max(volume,gross/1000)};
}
export function calculateLine(line,weight){
 const basis=line.basis||"flat";
 const quantity=({flat:1,gross:weight.grossKg,cw:weight.chargeableKg,cbm:weight.cbm,rt:weight.rt})[basis];
 if(quantity===undefined)throw Error("Unknown charge basis: "+basis);
 const netRate=Number(line.netRate)||0,saleRate=Number(line.saleRate)||0;
 if(netRate<0||saleRate<0)throw Error("Negative rate");
 return {...line,quantity,netTotal:Math.round(quantity*netRate*100)/100,saleTotal:Math.round(quantity*saleRate*100)/100};
}
export function calculateQuote(lines,weight){
 const calculated=lines.map(line=>calculateLine(line,weight));
 const net=calculated.reduce((a,l)=>a+l.netTotal,0);
 const sale=calculated.reduce((a,l)=>a+l.saleTotal,0);
 return {lines:calculated,netTotal:Math.round(net*100)/100,saleTotal:Math.round(sale*100)/100,profit:Math.round((sale-net)*100)/100};
}
// When updating an already sent quote, require a reason and use the existing
// revision workflow. Never include netRate, netTotal or supplier in customer PDFs.
