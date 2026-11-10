// Read-only metadata by default. Explicit live opt-in makes ONE minimal request,
// charged to the existing shared trainee budget; never logs bodies or credentials.
require('tsx/cjs');
const Module=require('node:module');const original=Module._load;
Module._load=function(id,...args){return id==='server-only'?{}:original.call(this,id,...args);};
const {randomUUID}=require('node:crypto');const {PrismaClient}=require('@prisma/client');
const {getStrobiTipsConfiguration}=require('../lib/ai/strobi-tips-config.ts');
const {strobiTipsConfigurationSchema}=require('../lib/validations/strobi-tips.ts');
const {reserveStrobiTip,releaseStrobiTip,createStrobiTipCacheKey}=require('../lib/ai/strobi-tips-store.ts');
const db=new PrismaClient({log:[]});let reservation,dispatched=false;
function classify(status,message=''){
 if(/high demand|overload|capacity/i.test(message))return 'HIGH_DEMAND';
 if(status===429)return 'QUOTA';if(status===401||status===403)return 'AUTH_OR_PROJECT_ACCESS';
 if(status===400)return 'REQUEST_ARGUMENT';if(status===404)return 'MODEL_OR_ENDPOINT';
 return status===503?'SERVICE_UNAVAILABLE':'PROVIDER_ERROR';
}
async function errorCategory(response){
 if(!response.body)return classify(response.status);
 const reader=response.body.getReader();let bytes=0,chunks=[];
 try{while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.length;if(bytes>8192)return classify(response.status);chunks.push(next.value);}const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));return classify(response.status,typeof data.error?.message==='string'?data.error.message:'');}
 catch{return classify(response.status);}finally{await reader.cancel().catch(()=>{});}
}
(async()=>{
 const config=strobiTipsConfigurationSchema.parse({enabled:'true',apiKey:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL,traineeDailyLimit:process.env.STROBI_TRAINEE_DAILY_LIMIT,traineeProjectDailyLimit:process.env.STROBI_TRAINEE_PROJECT_DAILY_LIMIT,projectDailyLimit:process.env.STROBI_PROJECT_DAILY_LIMIT,requestTimeoutMs:process.env.STROBI_REQUEST_TIMEOUT_MS});
 const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}`;
 const metadata=await fetch(endpoint,{headers:{'x-goog-api-key':config.apiKey},signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!metadata.ok){console.log(JSON.stringify({metadataHttpStatus:metadata.status,category:await errorCategory(metadata),generationDispatched:false}));process.exitCode=1;return;}
 const details=await metadata.json();console.log(JSON.stringify({configuredModel:config.model,metadataHttpStatus:metadata.status,supportsGeneration:details.supportedGenerationMethods?.includes('generateContent')===true,traineeAiEnabled:getStrobiTipsConfiguration().available}));
 if(process.env.STROBI_DIAGNOSTIC_LIVE!=='true'){console.log('Metadata only; no generation or quota write.');return;}
 const id=`diagnostic:${randomUUID()}`;const key=createStrobiTipCacheKey({title:`Generic provider diagnostic ${randomUUID()}`,description:'Check a minimal nonconfidential provider request.',pillar:'COMMUNICATION'},'EXPLAIN_MILESTONE',config.model);
 const admitted=await reserveStrobiTip(db,id,key,config);if(admitted.status!=='RESERVED'){console.log(JSON.stringify({generationDispatched:false,admission:admitted.status}));process.exitCode=1;return;}reservation=admitted.reservation;
 dispatched=true;
 const response=await fetch(`${endpoint}:generateContent`,{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':config.apiKey},body:JSON.stringify({contents:[{parts:[{text:'Reply with the word OK.'}]}],generationConfig:{maxOutputTokens:128}}),signal:AbortSignal.timeout(config.requestTimeoutMs),redirect:'error',cache:'no-store'});
 const category=response.ok?'SUCCESS':await errorCategory(response);await response.body?.cancel().catch(()=>{});
 console.log(JSON.stringify({minimalRequestHttpStatus:response.status,category,providerDispatches:1,structuredSchemaUsed:false,appPromptUsed:false,noAutomaticRetry:true}));if(!response.ok)process.exitCode=1;
})().catch(error=>{console.error(JSON.stringify({diagnosticFailed:true,category:['AbortError','TimeoutError','TypeError'].includes(error.name)?error.name:'CONFIG_OR_STORAGE',generationDispatched:dispatched}));process.exitCode=1;}).finally(async()=>{
 try{if(reservation)await releaseStrobiTip(db,reservation,!dispatched);}catch{console.error('Diagnostic lease cleanup failed; bounded expiry remains in effect.');process.exitCode=1;}
 await db.$disconnect();
});
