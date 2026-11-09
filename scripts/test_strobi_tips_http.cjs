// Opt-in built-app check. Target MUST be a dedicated server started with trainee
// AI false. Creates/removes its own fixtures; never requests enabled generation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SignJWT } = require('jose');
const { PrismaClient } = require('@prisma/client');
if (process.env.STROBI_TIPS_DISABLED_HTTP_CHECK !== 'true' || process.env.STROBI_TRAINEE_AI_ENABLED !== 'false') throw Error('Explicit disabled-server check flags required.');
if (!process.env.SESSION_SECRET) throw Error('SESSION_SECRET must match the dedicated verification server.');
const origin = new URL(process.env.STROBI_TIPS_HTTP_ORIGIN || 'http://127.0.0.1:3130');
if (origin.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(origin.hostname)) throw Error('Use an isolated loopback verification server.');
const db = new PrismaClient({ log: [] });
let trainee, trainer, plan, stage = 'fixtures';
async function token(payload, expires = '30m') {
  return new SignJWT(payload).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime(expires).sign(new TextEncoder().encode(process.env.SESSION_SECRET));
}
async function post(cookie, body, extraHeaders = {}) {
  const response = await fetch(new URL('/api/trainee/strobi',origin), {method:'POST',headers:{origin:origin.origin,'content-type':'application/json',...(cookie ? {cookie:`beat_trainee_session=${cookie}`} : {}),...extraHeaders},body:JSON.stringify(body),redirect:'error'});
  assert(response.headers.get('cache-control').includes('private'));assert(response.headers.get('cache-control').includes('no-store'));
  return {status:response.status,result:response.status===403 ? null : await response.json()};
}
async function snapshot() {
  return JSON.stringify(await Promise.all([
    db.trainee.findUnique({where:{id:trainee.id}}),
    db.trainingPlan.findUnique({where:{id:plan.id},include:{versions:{include:{nodes:true,edges:true}}}}),
    db.traineePlanAssignment.findMany({where:{traineeId:trainee.id}}),
    db.traineeProgress.findMany({where:{traineeId:trainee.id},orderBy:{id:'asc'}}),
    db.stampNotificationRead.findMany({where:{traineeId:trainee.id}}),
    db.stampRevocation.findMany({where:{traineeId:trainee.id}}),
  ]));
}
(async()=>{
  const suffix=Date.now().toString();
  trainer=await db.adminUser.create({data:{employeeId:`TIPSHTTP-${suffix}`,email:`trainer-${suffix}@example.invalid`,fullName:'HTTP Tips Fixture Trainer',passwordHash:'unused'}});
  trainee=await db.trainee.create({data:{traineeCode:`TIPSHTTP-${suffix}`,email:`learner-${suffix}@example.invalid`,fullName:'HTTP Tips Fixture Learner',restaurantBrand:'Test',branchLocation:'Test',cohortBatch:'Test',hireDate:new Date()}});
  plan=await db.trainingPlan.create({data:{title:'HTTP tips verification fixture',roleIdentifier:'TIPS_HTTP',status:'PUBLISHED',createdById:trainer.id}});
  const version=await db.planVersion.create({data:{planId:plan.id,versionNumber:1,publishedById:trainer.id}});
  const nodes=[];
  for(const name of ['available','locked','verified'])nodes.push(await db.planNode.create({data:{planVersionId:version.id,path:'COMMUNICATION',code:`HTTP-${name}`,title:`HTTP listening ${name} ${suffix}`,description:'Practice explaining a routine task and check understanding with a colleague.',orderIndex:nodes.length+1,posX:0,posY:0}}));
  await db.traineePlanAssignment.create({data:{traineeId:trainee.id,planVersionId:version.id,assignedById:trainer.id}});
  await db.traineeProgress.createMany({data:[{traineeId:trainee.id,planNodeId:nodes[1].id,status:'LOCKED'},{traineeId:trainee.id,planNodeId:nodes[2].id,status:'VERIFIED',verificationHash:'e'.repeat(64),verifiedBy:trainer.id,verifiedAt:new Date()}]});
  const before=await snapshot();
  const payload={portal:'trainee',id:trainee.id,traineeCode:trainee.traineeCode,fullName:trainee.fullName};
  const cookie=await token(payload),input={nodeId:nodes[0].id,questionId:'EXPLAIN_MILESTONE'};
  stage='actual built HTTP authorization';
  assert.equal((await post(undefined,input)).status,401);
  assert.equal((await post(await token({...payload,portal:'trainer',employeeId:trainer.employeeId,role:'TRAINER'}),input)).status,401);
  assert.equal((await post(await token(payload,Math.floor(Date.now()/1000)-1),input)).status,401);
  assert.equal((await post(cookie,input,{origin:'http://foreign.invalid','x-forwarded-host':'foreign.invalid'})).status,403);
  assert.equal((await post(cookie,{...input,prompt:'not allowed'})).status,400);
  assert.equal((await post(cookie,{...input,nodeId:'missing-node'})).status,404);
  assert.equal((await post(cookie,{...input,nodeId:nodes[1].id})).status,403);
  stage='actual disabled manual fallback';
  for(const node of [nodes[0],nodes[2]]){
    const response=await post(cookie,{...input,nodeId:node.id});
    assert.equal(response.status,200);assert.equal(response.result.source,'PREWRITTEN');assert.equal(response.result.reason,'DISABLED');
  }
  assert.equal(await snapshot(),before);
  assert.equal(await db.strobiDailyQuota.count({where:{scope:'TRAINEE',subjectId:trainee.id}}),0);
  assert.equal(await db.strobiActorRequestLease.count({where:{scope:'TRAINEE',subjectId:trainee.id}}),0);
  stage='client build secret boundary';
  const secret=process.env.GEMINI_API_KEY;
  const queue=[path.join(process.env.PASSPORT_BUILD_DIR||'.next-mobile-check','static')];
  while(queue.length){const current=queue.pop();for(const entry of fs.readdirSync(current,{withFileTypes:true})){const full=path.join(current,entry.name);if(entry.isDirectory())queue.push(full);else if(secret)assert(!fs.readFileSync(full).includes(Buffer.from(secret)));}}
  console.log('PASS built trainee HTTP: actual cookie role/expiry, origin/input/locked/missing rejection, eligible/completed disabled fallback, no learning/quota writes and no API key in static assets');
})().catch(error=>{console.error(`FAIL built trainee HTTP at ${stage} (${error.code||error.name}); raw diagnostics omitted.`);console.error(String(error.stack||'').split('\n').filter(line=>line.includes('scripts/test_strobi_tips_http.cjs:')).join('\n'));process.exitCode=1;}).finally(async()=>{
  if(trainee)await db.trainee.delete({where:{id:trainee.id}});
  if(plan)await db.trainingPlan.delete({where:{id:plan.id}});
  if(trainer)await db.adminUser.delete({where:{id:trainer.id}});
  await db.$disconnect();
  console.log('Owned HTTP fixtures removed.');
});
