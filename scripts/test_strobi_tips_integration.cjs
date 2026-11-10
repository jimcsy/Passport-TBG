// Dedicated servers: 3130 trainee=true/trainer=false; 3132 trainee=false/trainer=true.
// Use fake Gemini credentials in both. Every generation POST is intercepted.
require('tsx/cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const { SignJWT } = require('jose');
const { PrismaClient } = require('@prisma/client');
const { verifyAssignedMilestones } = require('../lib/db/repositories/verification.ts');
const db = new PrismaClient({ log: [] });
const enabled = process.env.STROBI_INTEGRATION_ENABLED_ORIGIN || 'http://127.0.0.1:3130';
const disabled = process.env.STROBI_INTEGRATION_DISABLED_ORIGIN || 'http://127.0.0.1:3132';
let browser, trainer, plan, a, b, stage = 'fixtures';
const screenshots='/tmp/passport-strobi-tips-integration';
const usage={traineeDailyLimit:3,traineeProjectDailyLimit:40,projectDailyLimit:50,traineeRemaining:2,traineeProjectRemaining:39,projectRemaining:49,timeZone:'Asia/Manila',resetsAt:'2026-11-11T16:00:00.000Z'};
const answer=text=>({success:true,source:'GENERATED',tip:{answer:text,steps:['Practice the skill.','Compare your work with the criteria.']},usage});
async function signed(learner,expires='1h') {return new SignJWT({portal:'trainee',id:learner.id,traineeCode:learner.traineeCode,fullName:learner.fullName,email:learner.email}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime(expires).sign(new TextEncoder().encode(process.env.SESSION_SECRET));}
async function cookie(context,token,origin=enabled){await context.addCookies([{name:'beat_trainee_session',value:token,url:origin,httpOnly:true,sameSite:'Lax'}]);}
async function preserved(){return JSON.stringify(await Promise.all([db.trainingPlan.findUnique({where:{id:plan.id},include:{versions:{include:{nodes:{orderBy:{id:'asc'}},edges:true}}}}),db.traineePlanAssignment.findMany({where:{traineeId:a.id},orderBy:{id:'asc'}}),db.traineeProgress.findMany({where:{traineeId:a.id},orderBy:{id:'asc'}})]));}
(async()=>{
  const suffix=Date.now().toString();await fs.mkdir(screenshots,{recursive:true});
  trainer=await db.adminUser.create({data:{employeeId:`TIPSINT-${suffix}`,fullName:'Tips Integration Trainer',email:`tips-trainer-${suffix}@example.invalid`,passwordHash:'unused'}});
  async function trainee(code){return db.trainee.create({data:{traineeCode:`TIPSINT-${code}-${suffix}`,fullName:`Tips Integration ${code}`,email:`tips-${code}-${suffix}@example.invalid`,restaurantBrand:'Test',branchLocation:'Test',cohortBatch:'Test',hireDate:new Date()}});}
  a=await trainee('A');b=await trainee('B');
  plan=await db.trainingPlan.create({data:{title:'Strobi integration fixture',roleIdentifier:'STROBI_INTEGRATION',status:'PUBLISHED',createdById:trainer.id}});
  const version=await db.planVersion.create({data:{planId:plan.id,versionNumber:1,publishedById:trainer.id}});
  const oldVersion=await db.planVersion.create({data:{planId:plan.id,versionNumber:0,publishedById:trainer.id,status:'SUPERSEDED'}});
  const nodeData={description:'Practice explaining one routine task and check understanding with a colleague.',posX:0,posY:0,orderIndex:1};
  const nodes=[];for(const [index,path]of ['COMMUNICATION','TECHNICAL','LEADERSHIP'].entries())nodes.push(await db.planNode.create({data:{...nodeData,planVersionId:version.id,path,code:`TIPS-${index}-${suffix}`,title:`Integration ${path.toLowerCase()} practice`}}));
  const archived=await db.planNode.create({data:{...nodeData,planVersionId:oldVersion.id,path:'ONBOARDING',code:`OLD-${suffix}`,title:'Archived integration practice'}});
  const assignment=await db.traineePlanAssignment.create({data:{traineeId:a.id,planVersionId:version.id,assignedById:trainer.id}});
  await db.traineeProgress.create({data:{traineeId:a.id,planNodeId:nodes[2].id,status:'LOCKED'}});
  await db.traineeProgress.create({data:{traineeId:a.id,planNodeId:archived.id,status:'VERIFIED',isArchived:true,archivedReason:'REMOVED_FROM_UPDATED_PLAN',verificationHash:'archived-preserved'}});
  await verifyAssignedMilestones([a.id],nodes[1].id,trainer.id,'Original stamp',db);
  const original=(await db.traineeProgress.findUnique({where:{traineeId_planNodeId:{traineeId:a.id,planNodeId:nodes[1].id}}})).verificationHash;
  const baseline=await preserved();
  browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE_PATH?{executablePath:process.env.CHROME_EXECUTABLE_PATH}:{})});
  const context=await browser.newContext({viewport:{width:1280,height:900}});const tokenA=await signed(a);await cookie(context,tokenA);
  const queue=[],posts=[],errors=[];
  await context.route('**/api/trainee/strobi',async route=>{posts.push(route.request().postDataJSON());const item=queue.shift();if(!item){await route.abort();throw Error('Unexpected generation');}if(item.delay)await new Promise(resolve=>setTimeout(resolve,item.delay));await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(answer(item.text))}).catch(()=>{});});
  await context.route('**/api/trainer/strobi',route=>route.abort());
  const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.name));
  const chat=()=>page.getByRole('dialog',{name:'Strobi Tips',exact:true});const selector=()=>chat().getByLabel('Current milestone');
  async function open(){await page.getByRole('button',{name:'Ask Strobi',exact:true}).click();await chat().waitFor();}
  async function close(){await chat().getByRole('button',{name:'Close Strobi Tips'}).click();await page.waitForFunction(()=>!document.querySelector('dialog')?.open);}
  async function ask(text,delay=0){queue.push({text,delay});await chat().getByRole('button',{name:'Explain this milestone',exact:true}).click();}
  stage='single host and navigation';await page.goto(enabled+'/trainee/dashboard',{waitUntil:'networkidle'});await open();assert.equal(await selector().inputValue(),'');assert.equal(posts.length,0);
  await selector().selectOption(nodes[0].id);await ask('A persistent integration tip.');await chat().getByText('A persistent integration tip.',{exact:true}).waitFor();
  await page.getByRole('link',{name:'My passport',exact:true}).click();await page.waitForURL('**/booklet');assert(await chat().getByText('A persistent integration tip.',{exact:true}).isVisible());
  await page.getByRole('link',{name:'Dashboard',exact:true}).click();await page.waitForURL('**/dashboard');
  await page.locator(`a[href="/trainee/dashboard/modules/${nodes[0].id}"]`).first().click();await page.waitForURL('**/modules/'+nodes[0].id);await page.waitForFunction(id=>document.querySelector('dialog select')?.value===id,nodes[0].id);
  assert.equal(posts.length,1);assert.equal(await page.locator('dialog').count(),1);assert(await chat().getByText('A persistent integration tip.',{exact:true}).isVisible());
  await page.getByRole('heading',{name:'Module details',exact:true}).waitFor();await page.screenshot({path:screenshots+'/desktop.png'});
  const bell=page.getByRole('button',{name:/^Notifications/});await bell.click();await page.getByRole('region',{name:'Stamp notifications'}).waitFor();await page.waitForFunction(()=>!document.querySelector('dialog')?.open);assert.equal(await page.getByRole('button',{name:'Ask Strobi',exact:true}).isVisible(),false);await bell.click();await open();assert(await chat().getByText('A persistent integration tip.',{exact:true}).isVisible());await close();
  await page.goto(enabled+'/trainee/dashboard/modules/'+archived.id,{waitUntil:'networkidle'});await open();await page.waitForFunction(id=>!!Array.from(document.querySelectorAll('dialog option')).find(option=>option.value===id),archived.id);assert.equal(await selector().inputValue(),archived.id);assert(await chat().getByRole('button',{name:'Explain this milestone',exact:true}).isDisabled());
  await selector().selectOption(nodes[0].id);assert(await chat().getByRole('button',{name:'Explain this milestone',exact:true}).isEnabled());
  const read=await page.request.get(enabled+'/api/trainee/strobi/context?nodeId=foreign');assert(!JSON.stringify(await read.json()).includes('foreign'));assert.equal(posts.length,1);
  assert.equal(await preserved(),baseline);assert.equal(await db.strobiDailyQuota.count({where:{scope:'TRAINEE',subjectId:a.id}}),0);
  console.log('PASS one persistent layout host, dashboard/passport/module selection without generation, archive handling and unchanged progress/curriculum/stamp snapshots');

  stage='reassignment and state refresh';await close();await page.goto(enabled+'/trainee/dashboard/modules/'+nodes[0].id,{waitUntil:'networkidle'});await open();
  const next=await db.planVersion.create({data:{planId:plan.id,versionNumber:2,publishedById:trainer.id}});
  const nextNode=await db.planNode.create({data:{...nodeData,planVersionId:next.id,path:'CULTURE',code:`NEXT-${suffix}`,title:'New assigned integration practice'}});
  await db.traineeProgress.create({data:{traineeId:a.id,planNodeId:nodes[0].id,status:'IN_PROGRESS',isArchived:true,archivedReason:'REMOVED_FROM_UPDATED_PLAN'}});
  await db.traineePlanAssignment.update({where:{id:assignment.id},data:{status:'SUPERSEDED'}});const nextAssignment=await db.traineePlanAssignment.create({data:{traineeId:a.id,planVersionId:next.id,assignedById:trainer.id}});
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(id=>!!Array.from(document.querySelectorAll('dialog option')).find(option=>option.value===id),nextNode.id);await open();assert.equal(await chat().getByText('A persistent integration tip.',{exact:true}).count(),0);assert(await chat().getByRole('button',{name:'Explain this milestone',exact:true}).isDisabled());
  await close();await db.traineePlanAssignment.delete({where:{id:nextAssignment.id}});await db.traineePlanAssignment.update({where:{id:assignment.id},data:{status:'ACTIVE'}});await db.traineeProgress.delete({where:{traineeId_planNodeId:{traineeId:a.id,planNodeId:nodes[0].id}}});await db.planVersion.delete({where:{id:next.id}});
  await page.goto(enabled+'/trainee/dashboard',{waitUntil:'networkidle'});await open();await selector().selectOption(nodes[0].id);
  stage='identity switch with late reply';await page.evaluate(()=>{const native=window.fetch.bind(window);window.fetch=(input,init)=>native(input,{...init,signal:undefined});});await ask('Old identity late reply.',1200);await cookie(context,await signed(b));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(()=>document.querySelector('header')?.textContent.includes('Tips Integration B'));await open();assert(await selector().isDisabled());await page.waitForTimeout(1300);assert.equal(await page.getByText('Old identity late reply.',{exact:true}).count(),0);await close();
  await cookie(context,tokenA);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(()=>document.querySelector('header')?.textContent.includes('Tips Integration A'));await open();await selector().selectOption(nodes[0].id);await ask('Reply after sign out.',1200);await close();await page.getByRole('button',{name:`Account for ${a.fullName}`,exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(url=>url.pathname==='/trainee');await page.waitForTimeout(1300);assert.equal(await page.getByText('Reply after sign out.',{exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Ask Strobi'}).count(),0);
  console.log('PASS assignment refresh, empty-plan identity remount, ignored-abort late responses and immediate account-menu sign-out clearing');

  stage='mobile disabled integration';const mobileContext=await browser.newContext({viewport:{width:390,height:844}});await cookie(mobileContext,tokenA,disabled);let disabledPosts=0;await mobileContext.route('**/api/trainee/strobi',route=>{disabledPosts++;return route.abort();});
  const mobile=await mobileContext.newPage();mobile.setDefaultTimeout(60000);mobile.on('pageerror',error=>errors.push(error.name));await mobile.goto(disabled+'/trainee/dashboard',{waitUntil:'networkidle'});
  const trigger=mobile.getByRole('button',{name:'Ask Strobi',exact:true});const nav=mobile.getByRole('navigation',{name:'Trainee navigation'});const t=await trigger.boundingBox(),n=await nav.boundingBox();assert(t.y+t.height<=n.y-8);
  await mobile.locator(`a[href="/trainee/dashboard/modules/${nodes[0].id}"]`).first().click();await mobile.waitForURL('**/modules/'+nodes[0].id);await trigger.click();const mobileChat=mobile.getByRole('dialog',{name:'Strobi Tips'});assert.equal(await mobileChat.evaluate(el=>el.matches(':modal')),true);assert.equal(await mobileChat.getByLabel('Current milestone').inputValue(),nodes[0].id);await mobileChat.getByRole('button',{name:'Explain this milestone',exact:true}).click();await mobileChat.getByText('Prewritten practice tip',{exact:true}).waitFor();assert.equal(disabledPosts,0);
  await mobile.screenshot({path:screenshots+'/mobile.png'});await mobile.goBack();await mobile.waitForURL('**/dashboard');await trigger.waitFor();await trigger.click();assert(await mobileChat.getByText('Prewritten practice tip',{exact:true}).isVisible());await mobileChat.getByRole('button',{name:'Close Strobi Tips'}).click();
  await nav.getByRole('link',{name:/Notifications/}).click();await mobile.waitForURL('**/notifications');assert.equal(await trigger.isVisible(),false);await mobile.getByRole('button',{name:`Unread: ${nodes[1].title}`,exact:true}).click();const celebration=mobile.getByRole('dialog',{name:'New stamp earned!',exact:true});await celebration.waitFor();assert.equal(await mobile.locator('dialog:modal').count(),1);await celebration.getByRole('button',{name:'Continue learning',exact:true}).click();await mobile.waitForURL('**/modules/'+nodes[1].id);
  await mobile.goto(disabled+'/trainee/dashboard/modules/'+nodes[0].id,{waitUntil:'networkidle'});const review=mobile.getByRole('region',{name:'Review & feedback',exact:true});await review.getByLabel('Add a reflection for your trainer (optional)',{exact:true}).fill('I practiced the task and explained what I learned.');await review.getByRole('button',{name:'Submit for review',exact:true}).click();await review.getByRole('button',{name:'Awaiting trainer review',exact:true}).waitFor();assert.equal((await db.traineeProgress.findUnique({where:{traineeId_planNodeId:{traineeId:a.id,planNodeId:nodes[0].id}}})).status,'READY_FOR_REVIEW');assert.equal((await db.traineeProgress.findUnique({where:{traineeId_planNodeId:{traineeId:a.id,planNodeId:nodes[1].id}}})).verificationHash,original);
  await mobile.waitForLoadState('networkidle');await mobile.setViewportSize({width:844,height:390});await mobile.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await mobile.waitForLoadState('networkidle');await trigger.click();await mobileChat.waitFor();assert.equal(await mobileChat.evaluate(el=>el.matches(':modal')),true);assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:screenshots+'/landscape.png'});const notice=await mobileChat.getByText(/AI tips can be wrong/).boundingBox();assert(notice.y+notice.height<=390);assert((await mobileChat.getByRole('log').boundingBox()).height>100);await mobileChat.getByRole('button',{name:'Close Strobi Tips'}).click();assert.equal(disabledPosts,0);
  console.log('PASS mobile safe-area/navbar positioning, back-navigation history, disabled static tips, notification celebration isolation, manual review and original hash retention');

  stage='expiry';const expContext=await browser.newContext();await cookie(expContext,await signed(a,'7s'));await expContext.route('**/api/trainee/strobi',route=>route.abort());const expPage=await expContext.newPage();await expPage.goto(enabled+'/trainee/dashboard',{waitUntil:'networkidle'});await expPage.waitForURL(url=>url.pathname==='/trainee',{timeout:20000});assert.equal(await expPage.getByRole('button',{name:'Ask Strobi'}).count(),0);
  stage='author guidance and independent trainer flags';const staff=await browser.newContext();const staffToken=await new SignJWT({portal:'trainer',id:trainer.id,employeeId:trainer.employeeId,fullName:trainer.fullName,role:'TRAINER'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));await staff.addCookies([{name:'beat_admin_session',value:staffToken,url:enabled,httpOnly:true}]);await staff.route('**/api/trainer/strobi',route=>route.abort());const admin=await staff.newPage();admin.setDefaultTimeout(60000);
  await admin.goto(enabled+'/trainer/plans/library',{waitUntil:'networkidle'});await admin.getByRole('button',{name:'Create milestone',exact:true}).click();await admin.getByText(/Use only nonconfidential milestone wording/).waitFor();assert(await admin.getByText(/Strobi is currently turned off/).isVisible());await admin.goto(disabled+'/trainer/plans/library',{waitUntil:'networkidle'});await admin.getByRole('button',{name:'Create milestone',exact:true}).click();assert(await admin.getByRole('button',{name:'Generate',exact:true}).isVisible());assert.equal(await admin.getByText(/Strobi is currently turned off/).count(),0);
  assert.equal(await db.strobiDailyQuota.count({where:{scope:'TRAINEE',subjectId:{in:[a.id,b.id]}}}),0);assert.deepEqual(errors,[]);assert.equal(queue.length,0);
  console.log('PASS actual JWT expiry, visible author guidance, independent trainer/trainee server flags and zero real generation/quota use');
  console.log('Integration screenshots: '+screenshots);
})().catch(error=>{console.error(`FAIL Strobi integration at ${stage} (${error.name}); raw diagnostics omitted.`);console.error(error.name==='AssertionError'?error.message:'');console.error(String(error.stack||'').split('\n').filter(line=>line.includes('scripts/test_strobi_tips_integration.cjs:')).join('\n'));process.exitCode=1;}).finally(async()=>{
  await browser?.close();
  for(const learner of [a,b])if(learner)await db.trainee.delete({where:{id:learner.id}});
  if(plan)await db.trainingPlan.delete({where:{id:plan.id}});if(trainer)await db.adminUser.delete({where:{id:trainer.id}});await db.$disconnect();
  console.log('Owned integration fixtures removed.');
});
