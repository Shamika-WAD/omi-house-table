'use strict';
// Start a separate test server, run real-browser checks, and always stop it.
const {spawn} = require('node:child_process');
const path = require('node:path');
const root = path.join(__dirname, '..');
const port = process.env.OMI_TEST_PORT || '3190';
const server = spawn(process.execPath, ['server.js'], {
  cwd: root, env: {...process.env, PORT: port}, stdio: ['ignore', 'pipe', 'pipe']
});
let output = '';
server.stdout.on('data', chunk => { output += chunk; });
server.stderr.on('data', chunk => { output += chunk; });
async function ready() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Test server startup timed out.\n' + output)), 15000);
    function finish(fn, value) { clearTimeout(timer); fn(value); }
    server.once('error', error => finish(reject, error));
    server.once('exit', code => finish(reject, new Error(`Test server exited (${code}).\n${output}`)));
    server.stdout.on('data', chunk => { if (String(chunk).includes('Omi listening')) finish(resolve); });
  });
}
async function run(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, file)], {
      cwd: root, env: {...process.env, OMI_TEST_URL: `http://127.0.0.1:${port}`}, stdio: 'inherit'
    });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${file} failed (${code}).`)));
  });
}
process.on('SIGINT', () => { server.kill(); process.exit(130); });
process.on('SIGTERM', () => { server.kill(); process.exit(143); });
(async () => {
  try {
    await ready();
    for (const file of ['browser-check.cjs', 'ui-check.cjs', 'pwa-check.cjs']) {
      console.log(`\n--- ${file} ---`);
      await run(file);
    }
  } finally { server.kill(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
