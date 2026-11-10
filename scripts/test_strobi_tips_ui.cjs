// Actual React/CSS/native dialog browser checks; all trainee API calls intercepted.
const assert = require('node:assert/strict');
const Module = require('node:module');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const esbuild = Module.createRequire(require.resolve('tsx/package.json'))('esbuild');
require('tsx/cjs');
const { STROBI_TIP_QUESTION_LABELS: labels } = require('../lib/ai/strobi-tips-content.ts');
const { STROBI_MASCOT_MAP: mascots } = require('../lib/constants/mascots.ts');
const usage = { traineeDailyLimit:3,traineeProjectDailyLimit:40,projectDailyLimit:50,traineeRemaining:2,traineeProjectRemaining:39,projectRemaining:49,timeZone:'Asia/Manila',resetsAt:'2026-11-11T16:00:00.000Z' };
const answer = text => ({ answer:text || 'Practice explaining one routine task clearly.',steps:['State its goal.','Check understanding with your colleague.'] });
const success = (text,source='GENERATED',overrides={}) => ({success:true,source,tip:answer(text),usage:{...usage,...overrides}});
let directory,server,browser,stage='bundle';
const screenshots='/tmp/passport-strobi-tips-ui';
(async()=>{
  const imagePlugin={name:'fixture-image',setup(build){build.onResolve({filter:/^next\/image$/},()=>({path:path.resolve('scripts/fixtures/StrobiTipsImage.tsx')}));}};
  const ssr=await esbuild.build({stdin:{contents:'import React from "react"; import {renderToString} from "react-dom/server"; import {StrobiTipsChat} from "./components/trainee/strobi/StrobiTipsChat"; export function render(){return renderToString(React.createElement(StrobiTipsChat,{sessionKey:"ssr",milestones:[],availability:{available:false,reason:"disabled"}}));}',resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react-dom/server','react/jsx-runtime'],plugins:[imagePlugin]});
  const compiled=new Module(path.join(process.cwd(),'scripts/__strobi_tips_ssr.cjs'));compiled.filename=path.join(process.cwd(),'scripts/__strobi_tips_ssr.cjs');compiled.paths=Module._nodeModulePaths(process.cwd());compiled._compile(ssr.outputFiles[0].text,compiled.filename);
  const warnings=[],priorError=console.error;try{console.error=(...args)=>warnings.push(args.join(' '));assert(compiled.exports.render().includes('Ask Strobi'));}finally{console.error=priorError;}assert.deepEqual(warnings,[]);
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'strobi-tips-ui-'));await fs.mkdir(screenshots,{recursive:true});
  const bundle=await esbuild.build({entryPoints:['scripts/fixtures/StrobiTipsHarness.tsx'],bundle:true,outfile:path.join(directory,'app.js'),jsx:'automatic',platform:'browser',metafile:true,define:{'process.env.NODE_ENV':'"development"'},plugins:[imagePlugin]});
  assert(!Object.keys(bundle.metafile.inputs).some(file=>/strobi-tips-(config|db|service|store|prompt)\.ts$/.test(file)));
  execFileSync('node_modules/.bin/tailwindcss',['-i','app/globals.css','-o',path.join(directory,'app.css'),'--content','components/trainee/strobi/**/*.tsx,scripts/fixtures/StrobiTipsHarness.tsx','--minify'],{stdio:'pipe'});
  const html='<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Strobi Tips verification</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
  const assets=new Set(Object.values(mascots).map(item=>item.imagePath));
  server=http.createServer(async(req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(assets.has(pathname)){res.setHeader('Content-Type','image/png');res.end(await fs.readFile(path.join(process.cwd(),'public',pathname.slice(1))));return;}const file=pathname==='/app.js'?'app.js':pathname==='/app.css'?'app.css':null;res.setHeader('Content-Type',file?file.endsWith('.js')?'application/javascript':'text/css':'text/html');res.end(file?await fs.readFile(path.join(directory,file)):html);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE_PATH?{executablePath:process.env.CHROME_EXECUTABLE_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const queue=[],requests=[];
  await page.route('**/api/trainee/strobi',async route=>{const item=queue.shift();requests.push(route.request().postDataJSON());if(!item)throw Error('Unexpected trainee API request');if(item.delay)await new Promise(resolve=>setTimeout(resolve,item.delay));if(item.abort){await route.abort().catch(()=>{});return;}await route.fulfill({status:item.status||200,contentType:'application/json',body:item.raw||JSON.stringify(item.body||success())}).catch(()=>{});});
  const dialog=()=>page.getByRole('dialog',{name:'Strobi Tips'});
  const select=()=>page.getByLabel('Current milestone',{exact:true});
  const question=id=>page.getByRole('group',{name:'Questions for Strobi'}).getByRole('button',{name:labels[id],exact:true});
  async function fresh(width=1280,height=900){queue.length=0;await page.setViewportSize({width,height});await page.goto(origin);await page.waitForFunction(()=>!!window.strobiTipsHarness);}
  async function open(){await page.getByRole('button',{name:'Ask Strobi',exact:true}).click();await dialog().waitFor();}
  async function ask(id='EXPLAIN_MILESTONE',item={}){queue.push(item);await question(id).click();}
  async function settled(){await page.waitForFunction(()=>!document.querySelector('dialog')?.textContent.includes('Strobi is thinking…'));}
  async function fits(){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const bounds=await dialog().boundingBox();assert(bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=page.viewportSize().width+1&&bounds.y+bounds.height<=page.viewportSize().height+1);}
  stage='inert controls and desktop';await fresh();let count=requests.length;
  await page.getByRole('button',{name:'Ask Strobi'}).hover();await open();await select().selectOption('a');await page.waitForTimeout(100);assert.equal(requests.length,count);
  assert.equal(await page.getByRole('group',{name:'Questions for Strobi'}).getByRole('button').count(),4);assert.equal(await dialog().locator('input,textarea').count(),0);
  await ask();await settled();assert.equal(requests.length,count+1);assert.deepEqual(requests.at(-1),{nodeId:'a',questionId:'EXPLAIN_MILESTONE'});
  assert(await dialog().getByText('AI-generated tip',{exact:true}).isVisible());assert(await dialog().getByText(/Last reported: 2 of 3/).isVisible());
  assert.equal(await dialog().evaluate(element=>element.matches(':modal')),false);
  await page.getByRole('button',{name:'Open course material',exact:true}).click();await page.getByRole('button',{name:'Submit reflection',exact:true}).click();assert.equal(await page.getByTestId('materials').textContent(),'1');assert.equal(await page.getByTestId('reviews').textContent(),'1');
  await fits();await page.screenshot({path:path.join(screenshots,'desktop.png')});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Ask Strobi'}).waitFor();await page.waitForFunction(()=>document.activeElement?.textContent.includes('Ask Strobi'));
  await open();assert.equal(await dialog().getByText('AI-generated tip',{exact:true}).count(),1);assert.equal(requests.length,count+1);
  console.log('PASS SSR/client boundary, four inert controls, explicit minimal requests, desktop nonmodal material/review use, Escape/focus and close/reopen history');

  stage='captured contexts and cancellation';await fresh();await open();await select().selectOption('a');
  await ask('EXPLAIN_MILESTONE',{delay:350,body:success('A listening tip.')});await select().selectOption('b');assert(await question('PRACTICE_ACTIVITY').isDisabled());await settled();
  assert(await dialog().getByRole('img',{name:mascots.LEADERSHIP.variantTitle}).isVisible());
  await ask('PRACTICE_ACTIVITY',{body:success('B leadership tip.','REUSED')});await settled();
  assert.equal(await dialog().getByRole('heading',{name:'Practice active listening',exact:true}).count(),1);assert.equal(await dialog().getByRole('heading',{name:'Lead a practical team briefing',exact:true}).count(),1);
  assert((await dialog().getByRole('article',{name:'Strobi response: Practice active listening',exact:true}).textContent()).includes('A listening tip.'));
  assert((await dialog().getByRole('article',{name:'Strobi response: Lead a practical team briefing',exact:true}).textContent()).includes('B leadership tip.'));
  await fresh();await open();await select().selectOption('a');
  await page.evaluate(()=>{const native=window.fetch.bind(window);window.fetch=(input,init)=>native(input,{...init,signal:undefined});});
  await ask('EXPLAIN_MILESTONE',{delay:600,body:success('Forbidden stale tip.')});await dialog().getByRole('button',{name:'Cancel request',exact:true}).click();await select().selectOption('b');
  await ask('SHOW_EXAMPLE',{body:success('Current team tip.')});await settled();await page.waitForTimeout(650);assert.equal(await page.getByText('Forbidden stale tip.',{exact:true}).count(),0);assert(await dialog().getByText('Current team tip.',{exact:true}).isVisible());assert(await dialog().getByText(/Request cancelled/).isVisible());
  await fresh();await open();await select().selectOption('a');await ask('EXPLAIN_MILESTONE',{delay:200});await dialog().getByRole('button',{name:'Close Strobi Tips'}).click();await page.waitForTimeout(300);await open();assert(await dialog().getByText('AI-generated tip',{exact:true}).isVisible());
  await fresh();await open();await select().selectOption('a');await page.evaluate(()=>{const native=window.fetch.bind(window);window.fetch=(input,init)=>native(input,{...init,signal:undefined});});
  await ask('EXPLAIN_MILESTONE',{delay:400,body:success('Outdated milestone tip.')});
  await page.evaluate(()=>window.strobiTipsHarness.nodes([{id:'a',title:'Updated listening practice',pillar:'COMMUNICATION',status:'IN_PROGRESS',revision:'2'}]));
  await page.getByRole('button',{name:'Cancel request',exact:true}).waitFor({state:'detached'});await ask('SHOW_EXAMPLE',{body:success('Updated milestone tip.')});await settled();await page.waitForTimeout(450);
  assert.equal(await page.getByText('Outdated milestone tip.',{exact:true}).count(),0);assert(await dialog().getByText('Updated milestone tip.',{exact:true}).isVisible());
  console.log('PASS one combined milestone-grouped timeline, captured pending context, no relabeling, cancelled ignored-abort stale output and hidden-panel completion');

  stage='sources, zero allowance and failures';await fresh();await open();await select().selectOption('a');
  await ask('EXPLAIN_MILESTONE',{body:success('Reused listening tip.','REUSED',{traineeRemaining:0,traineeProjectRemaining:0,projectRemaining:0})});await settled();assert(await question('SHOW_EXAMPLE').isEnabled());assert(await dialog().getByText(/Last reported: 0 of 3/).isVisible());
  await ask('SHOW_EXAMPLE',{status:429,body:{success:false,code:'DAILY_LIMIT',usage:{...usage,traineeRemaining:0}}});await settled();assert(await dialog().getByText('Prewritten practice tip',{exact:true}).isVisible());
  await ask('PRACTICE_ACTIVITY',{body:{...success(),tip:{answer:'<img src=x onerror=alert(1)>',steps:[]}}});await settled();assert.equal(await dialog().locator('article img').count(),0);
  count=requests.length;await ask('PREPARE_FOR_REVIEW',{abort:true});await settled();await page.waitForTimeout(100);assert.equal(requests.length,count+1);
  assert(await dialog().getByText(/AI tips are temporarily unavailable/).isVisible());
  await fresh();await page.evaluate(()=>window.strobiTipsHarness.availability({available:false,reason:'disabled'}));await open();await select().selectOption('a');count=requests.length;
  for(const id of Object.keys(labels)){await question(id).click();await settled();}assert.equal(requests.length,count);assert.equal(await dialog().getByText('Prewritten practice tip',{exact:true}).count(),4);
  await page.evaluate(()=>window.strobiTipsHarness.availability({available:false,reason:'unconfigured'}));await question('EXPLAIN_MILESTONE').click();assert.equal(requests.length,count);
  console.log('PASS generated/reused/prewritten labels, zero-cap cached requests, safe malformed/network fallback, no retries and all four disabled/unconfigured static tips');

  stage='eligibility and mascots';await fresh();await open();count=requests.length;
  for(const [id,pillar]of[['a','COMMUNICATION'],['b','LEADERSHIP'],['locked','TECHNICAL'],['archived','ONBOARDING'],['culture','CULTURE']]){await select().selectOption(id);assert(await dialog().getByRole('img',{name:mascots[pillar].variantTitle}).isVisible());if(['locked','archived'].includes(id))assert(await question('EXPLAIN_MILESTONE').isDisabled());}assert.equal(requests.length,count);
  await select().selectOption('a');await ask('EXPLAIN_MILESTONE',{body:success('Tip that must clear when access is lost.')});await settled();
  await ask('SHOW_EXAMPLE',{status:403,body:{success:false,code:'LOCKED_MILESTONE'}});await settled();assert.equal(await select().inputValue(),'');assert.equal(await page.getByText('Tip that must clear when access is lost.',{exact:true}).count(),0);assert(await question('SHOW_EXAMPLE').isDisabled());await select().selectOption('b');assert(await question('SHOW_EXAMPLE').isEnabled());
  await page.evaluate(()=>window.strobiTipsHarness.nodes([]));assert(await select().isDisabled());assert(await dialog().getByText(/No milestones are assigned yet/).first().isVisible());
  console.log('PASS all five exact mascot assets, locked/archive/empty states and server-denied context blocking without generation');

  stage='session isolation';await fresh();await open();await select().selectOption('a');await page.evaluate(()=>{const native=window.fetch.bind(window);window.fetch=(input,init)=>native(input,{...init,signal:undefined});});
  await ask('EXPLAIN_MILESTONE',{delay:500,body:success('Previous user private tip.')});await page.evaluate(()=>window.strobiTipsHarness.session('learner-two'));await open();await select().selectOption('b');await ask('SHOW_EXAMPLE',{body:success('New user current tip.')});await settled();await page.waitForTimeout(550);
  assert.equal(await page.getByText('Previous user private tip.',{exact:true}).count(),0);assert(await dialog().getByText('New user current tip.',{exact:true}).isVisible());
  await page.evaluate(()=>window.strobiTipsHarness.session(null));await page.locator('dialog').waitFor({state:'detached'});assert.equal(await page.getByRole('button',{name:'Ask Strobi'}).count(),0);
  await fresh();await open();assert.equal(await dialog().getByRole('article').count(),0);assert.deepEqual(await page.evaluate(()=>[Object.keys(localStorage),Object.keys(sessionStorage)]),[[],[]]);
  await select().selectOption('a');await ask('EXPLAIN_MILESTONE',{status:401,body:{success:false,code:'UNAUTHORIZED'}});await page.locator('dialog').waitFor({state:'detached'});assert.equal(await page.getByRole('dialog').count(),0);
  console.log('PASS identity-keyed isolation, late previous-user output rejection, sign-out/401 clearing, refresh clearing and no browser persistence');

  stage='short landscape layout';await fresh(844,390);await open();await select().selectOption('a');await ask();await settled();await page.screenshot({path:path.join(screenshots,'landscape.png')});
  assert.equal(await dialog().evaluate(element=>element.matches(':modal')),true);await fits();
  const landscapeLog=await dialog().getByRole('log').boundingBox();assert(landscapeLog && landscapeLog.height>100);
  const landscapeNotice=await dialog().getByText(/AI tips can be wrong/).boundingBox();assert(landscapeNotice && landscapeNotice.y+landscapeNotice.height<=390);

  stage='mobile focus and visual states';await fresh(390,844);await open();assert.equal(await dialog().evaluate(element=>element.matches(':modal')),true);assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
  await select().selectOption('a');await ask();await settled();await fits();await page.screenshot({path:path.join(screenshots,'mobile.png')});
  await page.setViewportSize({width:1280,height:900});await page.waitForFunction(()=>document.querySelector('dialog')?.open&&!document.querySelector('dialog').matches(':modal'));assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('dialog')?.matches(':modal'));assert.equal(await dialog().getByText('AI-generated tip',{exact:true}).count(),1);
  await dialog().getByRole('button',{name:'Close Strobi Tips'}).focus();await page.keyboard.press('Shift+Tab');assert(await dialog().evaluate(element=>element.contains(document.activeElement)));
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Ask Strobi'}).waitFor();assert.equal(await page.evaluate(()=>document.body.style.overflow),'');await page.getByRole('button',{name:'Submit reflection',exact:true}).click();assert.equal(await page.getByTestId('reviews').textContent(),'1');
  await open();await page.evaluate(()=>window.strobiTipsHarness.session(null));await page.getByRole('dialog').waitFor({state:'detached'});await page.waitForFunction(()=>document.body.style.overflow==='');
  await fresh(320,568);await page.evaluate(()=>window.strobiTipsHarness.nodes([{id:'long',title:'Personal Effectiveness & Culture: '+ 'Competency'.repeat(6),pillar:'CULTURE',status:'IN_PROGRESS'}]));await open();await select().selectOption('long');
  const longTip={answer:Array(90).fill('practice').join(' '),steps:['Review the criterion and prepare your demonstration.','Explain what you practiced to your trainer.','Identify one thing you want to improve.']};
  await ask('EXPLAIN_MILESTONE',{body:{...success(),tip:longTip}});await settled();await fits();assert(await dialog().getByText('AI-generated tip',{exact:true}).count());
  const privacy=await dialog().getByText(/AI tips can be wrong/).boundingBox();assert(privacy.y>=0&&privacy.y+privacy.height<=568);assert((await page.getByRole('log').boundingBox()).height>60);
  await page.screenshot({path:path.join(screenshots,'mobile-320-long.png')});
  await page.emulateMedia({reducedMotion:'reduce'});await fresh(390,844);await open();await select().selectOption('a');await ask('EXPLAIN_MILESTONE',{delay:300});
  assert.equal(await dialog().locator('svg.animate-spin').evaluate(element=>getComputedStyle(element).animationName),'none');await settled();assert(await page.locator('[role="status"][aria-live="polite"]').textContent());
  assert.deepEqual(errors,[]);assert.equal(queue.length,0);
  console.log('PASS mobile full-screen/inert focus, scroll lock/restoration, 320px long content and persistent notice, reduced motion and polite announcements');
  console.log(`Screenshots: ${screenshots}`);
})().catch(error=>{console.error(`FAIL Strobi Tips UI at ${stage} (${error.name})`);console.error(error.message);console.error(String(error.stack||'').split('\n').filter(line=>line.includes('scripts/test_strobi_tips_ui.cjs:')).join('\n'));process.exitCode=1;}).finally(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));if(directory)await fs.rm(directory,{recursive:true,force:true});});
