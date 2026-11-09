// Run against an isolated production server on port 3100, with .env loaded.
// Each suite owns and removes its fixtures. Browser dependencies may be supplied
// through PLAYWRIGHT_MODULE and PLAYWRIGHT_BROWSERS_PATH.
const { spawnSync } = require('node:child_process');
const suites = [
  'milestone_creation_actions', 'milestone_library_reads',
  'training_content_navigation', 'learning_paths_browser',
  'milestone_library_browser', 'contextual_inspector_browser',
  'shared_creation_upload_browser', 'plan_insertion_browser',
  'outline_default_browser', 'builder_workspace_browser',
  'save_scope_browser', 'individual_publish_browser',
  'path_edit_browser', 'material_actions', 'material_browser',
  'stamp_revocation_browser', 'stamp_notifications_browser', 'module_review_browser',
];
const selected = process.argv.slice(2);
const failures = [];
function redact(value) {
  let text = String(value || '').replace(/(?:postgres(?:ql)?|https?):\/\/\S+/g, '[URL redacted]');
  for (const key of ['DATABASE_URL', 'DIRECT_URL', 'SESSION_SECRET', 'GEMINI_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (process.env[key]) text = text.replaceAll(process.env[key], '[redacted]');
  }
  return text;
}
for (const suite of selected.length ? selected : suites) {
  if (!suites.includes(suite)) throw new Error('Unknown regression suite');
  console.log(`RUN ${suite}`);
  const result = spawnSync(process.execPath, ['--env-file=.env', `scripts/test_${suite}.cjs`], {
    env: { ...process.env, SCOPE_USE_BUNDLED_BROWSER: '1' }, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
  });
  process.stdout.write(redact(result.stdout));
  process.stderr.write(redact(result.stderr));
  if (result.status !== 0) failures.push(suite);
  console.log(`${result.status === 0 ? 'PASS' : 'FAIL'} SUITE ${suite}`);
}
console.log(`Regression result: ${failures.length ? `failed ${failures.join(', ')}` : 'all selected suites passed'}`);
process.exitCode = failures.length ? 1 : 0;
