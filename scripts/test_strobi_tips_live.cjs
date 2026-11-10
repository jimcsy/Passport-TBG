// Explicit opt-in: at most ONE new Gemini dispatch; two real cross-trainee cache reads.
// Logs only status, source, lengths and counters. Retains actual dispatched accounting.
require('tsx/cjs');
const Module=require('node:module');const original=Module._load;
Module._load=function(id,...args){return id==='server-only'?{}:original.call(this,id,...args);};
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const net=require('node:net');const path=require('node:path');
const {PrismaClient}=require('@prisma/client');const {chromium}=require('playwright');const {SignJWT}=require('jose');
const {strobiTipsConfigurationSchema,strobiTipResultSchema}=require('../lib/validations/strobi-tips.ts');
const {createStrobiTipCacheKey}=require('../lib/ai/strobi-tips-store.ts');const {strobiDay}=require('../lib/ai/strobi-quota.ts');
const db=new PrismaClient({log:[]});let server,browser,trainer,plan,learners=[],cacheKey,stage='opt-in',dispatched=false,providerDispatches=0,providerStatuses=[],providerErrors=[];
async function counters(day){return db.strobiDailyQuota.findMany({where:{day,OR:[{scope:'PROJECT',subjectId:'strobi'},{scope:'TRAINEE_PROJECT',subjectId:'strobi'}] },orderBy:{scope:'asc'}});}
async function snapshot(){return JSON.stringify(await Promise.all([
 db.trainingPlan.findUnique({where:{id:plan.id},include:{versions:{include:{nodes:true,edges:true}}}}),
 db.traineePlanAssignment.findMany({where:{traineeId:{in:learners.map(x=>x.id)}},orderBy:{id:'asc'}}),
 db.traineeProgress.findMany({where:{traineeId:{in:learners.map(x=>x.id)}},orderBy:{id:'asc'}}),
 db.stampRevocation.findMany({where:{traineeId:{in:learners.map(x=>x.id)}}}),
]));}
(async()=>{
 if(process.env.STROBI_TIPS_LIVE_CHECK!=='true')throw Error('Explicit STROBI_TIPS_LIVE_CHECK=true required; no provider request made.');
 const config=strobiTipsConfigurationSchema.parse({enabled:'true',apiKey:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL,traineeDailyLimit:process.env.STROBI_TRAINEE_DAILY_LIMIT,traineeProjectDailyLimit:process.env.STROBI_TRAINEE_PROJECT_DAILY_LIMIT,projectDailyLimit:process.env.STROBI_PROJECT_DAILY_LIMIT,requestTimeoutMs:process.env.STROBI_REQUEST_TIMEOUT_MS});
 const port=Number(process.env.STROBI_TIPS_LIVE_PORT||3134),origin=`http://127.0.0.1:${port}`;
 await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',()=>reject(Error('Live verification port occupied; existing process untouched.')));probe.listen(port,'127.0.0.1',()=>probe.close(resolve));});
 const now=(await db.$queryRaw`SELECT clock_timestamp() AS now`)[0].now;const {day}=strobiDay(now);const before=await counters(day);
 const attempts=(rows,scope)=>rows.find(x=>x.scope===scope)?.attempts||0;
 assert(attempts(before,'PROJECT')<config.projectDailyLimit&&attempts(before,'TRAINEE_PROJECT')<config.traineeProjectDailyLimit,'No remaining live budget; do not reset counters.');
 stage='owned server';
 server=spawn(process.execPath,['--require',path.resolve('scripts/fixtures/strobi_provider_probe.cjs'),'node_modules/next/dist/bin/next','start','-p',String(port),'-H','127.0.0.1'],{env:{...process.env,PASSPORT_BUILD_DIR:process.env.PASSPORT_BUILD_DIR||'.next-mobile-check',STROBI_TRAINEE_AI_ENABLED:'true',STROBI_AI_ENABLED:'false'},stdio:['ignore','ignore','ignore','ipc']});
 server.on('message',message=>{if(message?.kind==='strobi-provider-dispatch')providerDispatches++;if(message?.kind==='strobi-provider-status'&&Number.isInteger(message.status))providerStatuses.push(message.status);if(message?.kind==='strobi-provider-error')providerErrors.push(message.category);});
 let ready=false;for(let i=0;i<80;i++){if(server.exitCode!==null)throw Error('Live server failed to start.');try{const r=await fetch(origin,{redirect:'manual',signal:AbortSignal.timeout(2000)});if(r.status>=200&&r.status<400){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert(ready);
 stage='generic fixtures';const prefix=`TIPS61-${Date.now()}`;
 trainer=await db.adminUser.create({data:{employeeId:prefix,email:`${prefix}@example.invalid`,fullName:'Live tips verification',passwordHash:'unused'}});
 for(const suffix of ['A','B'])learners.push(await db.trainee.create({data:{traineeCode:`${prefix}-${suffix}`,fullName:'Live tips fixture',email:`${prefix}-${suffix}@example.invalid`,restaurantBrand:'Test',branchLocation:'Test',cohortBatch:'Test',hireDate:new Date()}}));
 plan=await db.trainingPlan.create({data:{title:'Generic tips verification',roleIdentifier:'TEST',status:'PUBLISHED',createdById:trainer.id}});
 const version=await db.planVersion.create({data:{planId:plan.id,versionNumber:1,publishedById:trainer.id}});
 const context={title:`Practice active listening ${Date.now()}`,description:'Practice explaining one routine task to a colleague. State the goal clearly, listen without interrupting, and check understanding by asking the colleague to summarize. Trainer review checks clarity, listening and a relevant follow-up question. This is a generic practice exercise, not company policy.',pillar:'COMMUNICATION'};
 const node=await db.planNode.create({data:{planVersionId:version.id,path:context.pillar,code:prefix,title:context.title,description:context.description,orderIndex:1,posX:0,posY:0}});
 for(const learner of learners)await db.traineePlanAssignment.create({data:{traineeId:learner.id,planVersionId:version.id,assignedById:trainer.id}});
 cacheKey=createStrobiTipCacheKey(context,'EXPLAIN_MILESTONE',config.model);assert.equal(await db.strobiTipCache.count({where:{key:cacheKey}}),0);
 const preserved=await snapshot();browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE_PATH?{executablePath:process.env.CHROME_EXECUTABLE_PATH}:{})});
 let requests=0;const results=[];
 async function question(learner,expected){
  const client=await browser.newContext({viewport:{width:390,height:844}});const token=await new SignJWT({portal:'trainee',id:learner.id,traineeCode:learner.traineeCode,fullName:learner.fullName,email:learner.email}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('5m').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  await client.addCookies([{name:'beat_trainee_session',value:token,url:origin,httpOnly:true}]);const page=await client.newPage();page.setDefaultTimeout(90000);
  page.on('request',req=>{if(req.url().endsWith('/api/trainee/strobi')&&req.method()==='POST'){requests++;assert(requests<=3);}});
  await page.goto(`${origin}/trainee/dashboard/modules/${node.id}`,{waitUntil:'networkidle'});await page.getByRole('button',{name:'Ask Strobi',exact:true}).click();const chat=page.getByRole('dialog',{name:'Strobi Tips'});assert.equal(await chat.getByLabel('Current milestone').inputValue(),node.id);
  const pending=page.waitForResponse(r=>r.url().endsWith('/api/trainee/strobi')&&r.request().method()==='POST',{timeout:90000});
  if(expected==='GENERATED')dispatched=true;await chat.getByRole('button',{name:'Explain this milestone',exact:true}).click();const response=await pending;
  const parsed=strobiTipResultSchema.safeParse(await response.json());
  if(!response.ok()||!parsed.success||!parsed.data.success||parsed.data.source!==expected){const code=parsed.success?(parsed.data.success?parsed.data.reason:parsed.data.code):'INVALID_RESPONSE';throw Error(`Live check HTTP ${response.status()} (${/^[A-Z_]+$/.test(code||'')?code:'UNAVAILABLE'}); no retry.`);}
  const result=parsed.data;await chat.getByText(expected==='GENERATED'?'AI-generated tip':'Reused AI tip',{exact:true}).waitFor();await chat.getByRole('button',{name:'Close Strobi Tips'}).click();
  await page.getByRole('region',{name:'Review & feedback'}).waitFor();assert.equal(await snapshot(),preserved);results.push(result);await client.close();return response.status();
 }
 stage='single live generation';const status=await question(learners[0],'GENERATED');
 stage='actual cross-trainee cache reuse';await question(learners[1],'REUSED');await question(learners[0],'REUSED');
 assert.deepEqual(results[0].tip,results[1].tip);assert.deepEqual(results[0].tip,results[2].tip);assert.equal(requests,3);assert.equal(providerDispatches,1);assert.deepEqual(providerStatuses,[200]);
 const after=await counters(day);assert.equal(attempts(after,'PROJECT')-attempts(before,'PROJECT'),1);assert.equal(attempts(after,'TRAINEE_PROJECT')-attempts(before,'TRAINEE_PROJECT'),1);
 assert.equal((await db.strobiDailyQuota.findFirst({where:{scope:'TRAINEE',subjectId:learners[0].id,day}}))?.attempts,1);assert.equal(await db.strobiDailyQuota.count({where:{scope:'TRAINEE',subjectId:learners[1].id,day}}),0);
 assert.equal(await db.strobiActorRequestLease.count({where:{subjectId:{in:learners.map(x=>x.id)}}}),0);assert.equal(await db.strobiTipCacheLease.count({where:{key:cacheKey}}),0);
 const text=[results[0].tip.answer,...results[0].tip.steps].join(' ');
 console.log(JSON.stringify({liveVerified:true,httpStatus:status,browserRequests:requests,newProviderAttempts:providerDispatches,providerHttpStatuses:providerStatuses,reusedResponses:2,answerCharacters:text.length,answerWords:text.split(/\s+/).length,stepCount:results[0].tip.steps.length,projectAttemptDelta:1,traineeAggregateDelta:1,learningDataUnchanged:true,savedFlagsChanged:false}));
})().catch(error=>{console.error(/^Live check HTTP \d+ \([A-Z_]+\); no retry\.$/.test(error.message)?error.message:`Live verification failed at ${stage} (${error.name}); sensitive details suppressed. No automatic retry.`);console.error(JSON.stringify({providerDispatches,providerHttpStatuses:providerStatuses,providerErrorCategories:providerErrors}));if(dispatched)console.error('A dispatched attempt may count; actual accounting is retained.');process.exitCode=1;}).finally(async()=>{
 let cleanupFailed=false;
 async function safely(work){try{await work();}catch{cleanupFailed=true;}}
 await safely(()=>browser?.close());
 if(server&&server.exitCode===null&&server.signalCode===null)await safely(()=>new Promise(resolve=>{const timer=setTimeout(()=>server.kill('SIGKILL'),5000);timer.unref();server.once('exit',()=>{clearTimeout(timer);resolve();});server.kill('SIGTERM');}));
 if(cacheKey)await safely(()=>db.strobiTipCache.deleteMany({where:{key:cacheKey}}));
 for(const learner of learners)await safely(()=>db.trainee.delete({where:{id:learner.id}}));
 if(plan)await safely(()=>db.trainingPlan.delete({where:{id:plan.id}}));if(trainer)await safely(()=>db.adminUser.delete({where:{id:trainer.id}}));await safely(()=>db.$disconnect());
 if(cleanupFailed){console.error('Owned fixture cleanup incomplete; inspect test fixtures without resetting quota counters.');process.exitCode=1;}
 else console.log('Owned live fixtures/cache removed; dispatched quota accounting retained.');
});
