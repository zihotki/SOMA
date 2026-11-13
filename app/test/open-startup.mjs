import fs from 'node:fs';
import crypto from 'node:crypto';
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { APP, checker, cleanup, sleep, startApp } from './harness.mjs';

const t = checker();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'soma-launch-'));
const folder = path.join(work, 'project with spaces');
fs.mkdirSync(folder);
let app;
let app2;
try {
  // Set up the folder using the existing picker and confirmation flow.
  app = await startApp({ name: 'launch-setup', env: { SOMA_TEST_START: 'home' } });
  await app.answers([folder, 0]);
  const setup = await app.ev(() => window.soma.project.openFolder());
  t.check('Folder setup succeeds', setup.opened === true, JSON.stringify(setup));
  const blocked = path.join(work, 'blocked setup');
  fs.mkdirSync(blocked);
  fs.writeFileSync(path.join(blocked, '.soma'), 'not a directory');
  await app.answers([blocked, 0]);
  const failedSetup = await app.ev(() => window.soma.project.openFolder());
  t.check('Invalid .soma entry does not create a model', !!failedSetup.error && !fs.existsSync(path.join(blocked, 'model.py')));
  await app.stop(); cleanup(app.ud); app = null;

  app = await startApp({ name: 'launch-direct', env: { SOMA_TEST_START: 'home' }, appArgs: ['--open-folder', folder] });
  await app.waitFor('direct folder open', () => window.__t?.project()?.folder, 60000);
  const project = await app.ev(() => window.__t.project());
  await app.waitFor('home page dismissed', () => document.getElementById('start').hidden, 30000);
  t.check('Direct launch opens the exact folder with spaces', fs.realpathSync(project.dir) === fs.realpathSync(folder), project.dir);
  await app.waitFor('model built', () => window.__t.status().state === 'ok' && window.__t.partCount() > 0, 120000);
  t.check('Direct launch builds the model in the viewer', await app.ev(() => window.__t.partCount()) > 0);

  const copy = path.join(work, 'second project');
  fs.cpSync(folder, copy, { recursive: true, filter: (src) => !src.includes(`${path.sep}.soma${path.sep}env`) });
  const port = await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { const value = server.address().port; server.close(() => resolve(value)); });
  });
  app2 = await startApp({ name: 'launch-second', port, env: { SOMA_TEST_START: 'home' }, appArgs: ['--open-folder', copy] });
  await app2.waitFor('second folder open', () => window.__t?.project()?.folder, 60000);
  const second = await app2.ev(() => window.__t.project());
  t.check('Two profiles open copies with the same ID', second.id === project.id && fs.realpathSync(second.dir) === fs.realpathSync(copy)
    && fs.realpathSync((await app.ev(() => window.__t.project())).dir) === fs.realpathSync(folder));
  await app2.stop(); cleanup(app2.ud); app2 = null;

  const glb = path.join(folder, '.soma', 'model.glb');
  const digest = () => crypto.createHash('sha256').update(fs.readFileSync(glb)).digest('hex');
  const before = digest();
  const model = path.join(folder, 'model.py');
  fs.writeFileSync(model, fs.readFileSync(model, 'utf8').replace('param(60.0, "Length"', 'param(65.0, "Length"'));
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline && digest() === before) await sleep(500);
  t.check('Editing the model rebuilds its geometry', digest() !== before);
  await app.stop(); cleanup(app.ud); app = null;

  const profile = path.join(work, 'separate profile');
  const alias = path.join(work, 'profile alias');
  fs.mkdirSync(profile);
  fs.mkdirSync(path.join(profile, '..models'));
  fs.symlinkSync(path.join(profile, '..models'), alias, 'junction');
  app = await startApp({ name: 'launch-alias', userData: profile, env: { SOMA_TEST_START: 'home' }, appArgs: ['--open-folder', alias] });
  await app.waitFor('app data path rejected', () => document.body.innerText.includes('This folder holds the app data of SOMA.'), 30000);
  t.check('Symlink to app data leaves home open', await app.ev(() => !document.getElementById('start').hidden && !window.__t.project()));
  await app.stop(); app = null;

  app = await startApp({ name: 'launch-invalid', env: { SOMA_TEST_START: 'home' }, appArgs: ['--open-folder', path.join(work, 'missing')] });
  await app.waitFor('error message', () => document.body.innerText.includes('Not a folder:'), 30000);
  t.check('Invalid folder leaves home open', await app.ev(() => !document.getElementById('start').hidden && !window.__t.project()));
  await app.stop(); cleanup(app.ud); app = null;

  app = await startApp({ name: 'launch-missing', env: { SOMA_TEST_START: 'home' }, appArgs: ['--open-folder'] });
  await app.waitFor('missing path message', () => document.body.innerText.includes('Provide a folder path after --open-folder.'), 30000);
  t.check('Missing path leaves home open', await app.ev(() => !document.getElementById('start').hidden && !window.__t.project()));
  await app.stop(); cleanup(app.ud); app = null;

  const initialized = path.join(work, 'initialized project'); fs.mkdirSync(initialized);
  fs.writeFileSync(path.join(initialized, 'model.py'), 'import cadquery as cq\nresult = cq.Workplane("XY").box(12, 14, 3)\n');
  const initProfile = path.join(work, 'init profile'); fs.mkdirSync(initProfile);
  const init = spawnSync(process.execPath, [path.join(APP, 'dist/main/init.js'), 'init', initialized, '--entry', 'model.py', '--profile', initProfile], { encoding: 'utf8' });
  if (init.status !== 0) throw new Error(`Init failed: ${init.stderr}`);
  app = await startApp({ name: 'launch-initialized', userData: initProfile, env: { SOMA_TEST_START: 'home' }, appArgs: ['--open-folder', initialized] });
  await app.waitFor('initialized project shown', () => window.__t?.project()?.folder && document.getElementById('start').hidden && window.__t.status().state === 'ok', 120000);
  t.check('Headlessly initialized project opens and builds without a setup dialog', await app.ev(() => !document.querySelector('[role="alertdialog"]') && window.__t.partCount() > 0));
  await app.stop(); app = null;

  if (process.platform !== 'win32') {
    const fifo = path.join(work, 'fifo project'); fs.mkdirSync(path.join(fifo, '.soma'), { recursive: true });
    fs.writeFileSync(path.join(fifo, 'model.py'), 'pass\n');
    if (spawnSync('mkfifo', [path.join(fifo, '.soma', 'project.json')]).status === 0) {
      app = await startApp({ name: 'launch-fifo', env: { SOMA_TEST_START: 'home' }, appArgs: ['--open-folder', fifo] });
      await app.waitFor('unsafe metadata error', () => document.body.innerText.includes('project.json exists but is not a file.'), 30000);
      t.check('Unsafe metadata leaves home open without blocking', await app.ev(() => !document.getElementById('start').hidden && !window.__t.project()));
    }
  }
} catch (e) { console.error(e); t.fail(); }
if (app2) { await app2.stop(); cleanup(app2.ud); }
if (app) { await app.stop(); cleanup(app.ud); }
cleanup(work);
process.exit(t.fails ? 1 : 0);
