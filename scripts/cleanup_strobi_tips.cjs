// Trusted operator/job entry only; never exposed as a public web endpoint.
require('tsx/cjs');
const Module=require('node:module');const original=Module._load;
Module._load=function(id,...args){return id==='server-only'?{}:original.call(this,id,...args);};
const {PrismaClient}=require('@prisma/client');const {cleanupStrobiTips}=require('../lib/ai/strobi-tips-store.ts');
const db=new PrismaClient({log:[]});
(async()=>{
 if(!process.argv.includes('--confirm'))throw Error('Confirmation required: npm run strobi:tips-cleanup -- --confirm');
 const counts=await cleanupStrobiTips(db);console.log(JSON.stringify({cleaned:true,...counts}));
})().catch(error=>{console.error(error.message?.startsWith('Confirmation required:')?error.message:'Strobi cleanup failed; database diagnostics suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
