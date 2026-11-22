import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { APP, checker, cleanup, startApp } from './harness.mjs';

const t = checker();
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cadlab-review-'));
const project = path.join(directory, 'example model');
const profile = path.join(directory, 'profile');
fs.mkdirSync(project);
fs.mkdirSync(profile);
const model = path.join(project, 'model.py');
const python = process.env.SOMA_PYTHON ||
  path.join(APP, '..', '.venv', ...(process.platform === 'win32' ? ['Scripts', 'python.exe'] : ['bin', 'python']));
const env = { ...process.env, SOMA_PYTHON: python, SOMA_USER_DATA: profile, SOMA_SHARED_SKILLS_PROJECT: fs.realpathSync(project) };
const modelCode = (length) => `import cadquery as cq
from soma import add_part
add_part("Block", cq.Workplane("XY").box(${length}, 12, 8))
`;
const command = (args, exe = python) => {
  const result = spawnSync(exe, args, { env, encoding: 'utf8', timeout: 60000 });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || `Command failed: ${args.join(' ')}`);
  return result.stdout;
};
const init = () => command([path.join(APP, 'dist/main/init.js'), 'init', project,
  '--entry', 'model.py', '--profile', profile, '--skill-storage', 'shared'], process.execPath);
const cli = (...args) => JSON.parse(command(['-m', 'soma', 'review', ...args, '--project', project]));
const start = () => startApp({ name: 'review', userData: profile, env: { ...env, SOMA_TEST_START: 'home' },
  appArgs: ['--open-folder', project] });
let app;

try {
  fs.writeFileSync(model, modelCode(17));
  init();
  app = await start();
  await app.waitFor('viewer displays the 17 mm block', () => window.__t?.partSize('Block')?.[0] === 17, 90000);
  t.check('A new Python model opens from its exact folder in the viewer', (await app.ev(() => window.__t.project())).dir === fs.realpathSync(project));
  await app.ev(() => {
    window.__t.treeOpen(true);
    document.querySelector('.tr-row[data-id] .nm').click();
  });
  const comment = async (text) => {
    await app.domClick('btn-sel-comment');
    await app.ev((value) => {
      const dialog = document.querySelector('.review-dialog');
      dialog.querySelector('textarea').value = value;
      dialog.querySelector('form').requestSubmit();
    }, text);
    await app.waitFor('comment saved', () => !document.querySelector('.review-dialog[open]'));
  };
  await comment('Move the locating edge.');
  await comment('Retain this mating face.');
  const firstNotes = cli('list');
  t.check('Each comment is saved immediately with its part, source, and build',
    firstNotes.length === 2 && firstNotes.every((note) => note.reference.includes('Block') &&
      note.reference.includes('model.py') && !!note.buildId));

  fs.writeFileSync(model, modelCode(34));
  await app.waitFor('viewer displays the edited 34 mm geometry', () => window.__t.partSize('Block')?.[0] === 34, 90000);
  t.check('Editing model.py refreshes the live viewer to 34 mm', await app.ev(() => window.__t.partSize('Block')[0] === 34));
  await app.ev(() => document.querySelector('.tr-row[data-id] .nm').click());
  await comment('Check the larger block.');
  cli('address', firstNotes[0].id);
  const pending = cli('list');
  t.check('Addressing one comment preserves the other and the new note', pending.length === 2
    && pending[0].text === 'Retain this mating face.' && pending[0].stale
    && pending[1].text === 'Check the larger block.' && !pending[1].stale);

  await app.stop();
  app = null;
  app = await start();
  await app.waitFor('project reopened', () => window.__t?.partSize('Block')?.[0] === 34);
  await app.domClick('btn-review');
  await app.waitFor('pending notes available after reopening', () => document.querySelectorAll('.review-comments li').length === 2);
  t.check('The review list shows the two pending notes after restart', await app.ev(() =>
    Array.from(document.querySelectorAll('.review-comments li b')).map((item) => item.textContent)).then(
    (texts) => texts.join('|') === 'Retain this mating face.|Check the larger block.'));
} catch (error) {
  console.error(error);
  if (app) console.error(app.log());
  t.fail();
} finally {
  if (app) await app.stop();
  cleanup(directory);
}
process.exitCode = t.fails ? 1 : 0;
