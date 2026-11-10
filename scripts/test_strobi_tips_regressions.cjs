// Deterministic final acceptance only. Live Gemini smoke is a separate opt-in command.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const buildDir = process.env.PASSPORT_BUILD_DIR || '.next-mobile-check';
const owned = new Set();
const fake = { GEMINI_API_KEY: 'deterministic-test-placeholder', GEMINI_MODEL: 'test-model', STROBI_AI_ENABLED: 'false', STROBI_TRAINEE_AI_ENABLED: 'false' };
function redact(value) {
  let text = String(value).replace(/(?:postgres(?:ql)?|https?):\/\/\S+/g, '[URL redacted]');
  for (const key of ['DATABASE_URL','DIRECT_URL','SESSION_SECRET','GEMINI_API_KEY','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'])
    if (process.env[key]) text = text.split(process.env[key]).join('[redacted]');
  return text;
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(resolve => {
    const deadline = setTimeout(() => child.kill('SIGKILL'), 5000); deadline.unref();
    child.once('exit', () => { clearTimeout(deadline); resolve(); }); child.kill('SIGTERM');
  });
}
async function start(port, trainee, trainer) {
  await new Promise((resolve,reject) => { const probe=net.createServer(); probe.once('error',()=>reject(Error(`Verification port ${port} is occupied; no existing process was touched.`)));probe.listen(port,'127.0.0.1',()=>probe.close(resolve)); });
  const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port),'-H','127.0.0.1'],{env:{...process.env,...fake,PASSPORT_BUILD_DIR:buildDir,STROBI_TRAINEE_AI_ENABLED:String(trainee),STROBI_AI_ENABLED:String(trainer)},stdio:'ignore'});
  owned.add(child);const origin=`http://127.0.0.1:${port}`;
  for(let i=0;i<80;i++){
    if(child.exitCode!==null)throw Error('Owned verification server exited.');
    try {const r=await fetch(origin,{redirect:'manual',signal:AbortSignal.timeout(2000)});if(r.status>=200&&r.status<400)return origin;}catch{}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw Error('Owned verification server readiness timed out.');
}
async function run(name,file,args=[],extra={}) {
  console.log(`RUN ${name}`);
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[...(file.endsWith('.ts')?['--import','tsx']:[]),'--env-file=.env',`scripts/${file}`,...args],{env:{...process.env,...fake,...extra},stdio:['ignore','pipe','pipe']});owned.add(child);
    let output='',overflow=false;
    const collect=chunk=>{output+=chunk;if(output.length>4*1024*1024){overflow=true;child.kill('SIGTERM');}};
    child.stdout.on('data',collect);child.stderr.on('data',collect);
    const deadline=setTimeout(()=>child.kill('SIGTERM'),20*60*1000);
    child.once('error',()=>{clearTimeout(deadline);owned.delete(child);reject(Error(`Could not start ${name}`));});
    child.once('exit',code=>{clearTimeout(deadline);owned.delete(child);process.stdout.write(redact(output));code===0&&!overflow?resolve():reject(Error(`Failed ${name}; no live calls were authorized.`));});
  });
}
async function clean(){await Promise.all([...owned].map(stop));}
process.once('SIGINT',()=>{void clean().finally(()=>process.exit(130));});
process.once('SIGTERM',()=>{void clean().finally(()=>process.exit(143));});
(async()=>{
  if(!fs.existsSync(path.join(buildDir,'BUILD_ID')))throw Error('Build first: PASSPORT_BUILD_DIR=.next-mobile-check npm run build');
  // Scan the real configured key before replacing provider credentials in child processes.
  const pending=[path.join(buildDir,'static')];
  const secrets=['GEMINI_API_KEY','SUPABASE_SERVICE_ROLE_KEY','SESSION_SECRET','DATABASE_URL','DIRECT_URL'].map(key=>process.env[key]).filter(Boolean);
  while(pending.length){const current=pending.pop();for(const e of fs.readdirSync(current,{withFileTypes:true})){const p=path.join(current,e.name);if(e.isDirectory())pending.push(p);else if(secrets.some(secret=>fs.readFileSync(p).includes(Buffer.from(secret))))throw Error('Configured server secret found in client assets.');}}
  console.log('PASS final client assets contain no configured server secrets');
  const enabled=await start(Number(process.env.STROBI_TIPS_ENABLED_PORT||3130),true,false);
  const disabled=await start(Number(process.env.STROBI_TIPS_DISABLED_PORT||3132),false,true);
  await run('trainee contracts/configuration','test_strobi_tips_contracts.cjs');
  await run('trainee provider/service','test_strobi_tips_service.cjs');
  await run('trainee HTTP boundary','test_strobi_tips_route.cjs');
  await run('cross-process cache/quota/leases/reset/isolation','test_strobi_tips_store.cjs');
  await run('real authenticated access and preservation','test_strobi_tips_access_db.cjs');
  await run('rendered responsive/accessibility chat','test_strobi_tips_ui.cjs');
  await run('built disabled HTTP/manual fallback','test_strobi_tips_http.cjs',[],{STROBI_TIPS_DISABLED_HTTP_CHECK:'true',STROBI_TIPS_HTTP_ORIGIN:disabled,STROBI_TEST_ORIGIN:disabled});
  await run('actual app lifecycle/flags/mobile/review','test_strobi_tips_integration.cjs',[],{STROBI_INTEGRATION_ENABLED_ORIGIN:enabled,STROBI_INTEGRATION_DISABLED_ORIGIN:disabled});
  await run('existing trainer Strobi acceptance','test_strobi_regressions.cjs',[],{STROBI_TEST_PORT:'3140',STROBI_DISABLED_TEST_PORT:'3142'});
  await run('manual content/publication/progress/stamp regressions','test_trainer_content_regressions.cjs',[
    'milestone_creation_actions','milestone_library_reads','material_actions','material_browser',
    'shared_creation_upload_browser','plan_insertion_browser','save_scope_browser','individual_publish_browser',
    'path_edit_browser','stamp_revocation_browser','stamp_notifications_browser','module_review_browser',
  ],{SCOPE_TEST_ORIGIN:disabled,SAVE_SCOPE_TEST_ORIGIN:disabled,PATH_TEST_ORIGIN:disabled,REVOKE_TEST_ORIGIN:disabled,STROBI_TEST_ORIGIN:disabled,MATERIAL_TEST_ORIGIN:disabled,CREATION_UPLOAD_TEST_ORIGIN:disabled,INSERTION_TEST_ORIGIN:disabled});
  console.log('PASS final deterministic Strobi trainee acceptance. No live Gemini calls; saved environment unchanged.');
})().catch(error=>{console.error(redact(error.message));process.exitCode=1;}).finally(clean);
