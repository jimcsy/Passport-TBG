// Verification-only child preload: metadata through private IPC, never body/key/URL.
const native=globalThis.fetch;
globalThis.fetch=async function(input,init){
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 const provider=typeof url==='string'&&url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/')&&url.endsWith(':generateContent');
 if(provider)process.send?.({kind:'strobi-provider-dispatch'});
 try{const response=await native.call(this,input,init);if(provider)process.send?.({kind:'strobi-provider-status',status:response.status});return response;}
 catch(error){if(provider)process.send?.({kind:'strobi-provider-error',category:['AbortError','TimeoutError','TypeError'].includes(error.name)?error.name:'Error'});throw error;}
};
