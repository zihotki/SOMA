import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { APP, checker, cleanup } from './harness.mjs';

const t = checker();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'soma-init-'));
const folder = path.join(work, 'model with spaces');
const profile = path.join(work, 'profile with spaces');
fs.mkdirSync(folder); fs.mkdirSync(profile);
const script = 'import cadquery as cq\nresult = cq.Workplane("XY").box(10, 20, 3)\n';
fs.writeFileSync(path.join(folder, 'model.py'), script);
fs.writeFileSync(path.join(folder, 'AGENTS.md'), '# User instructions\n');
fs.writeFileSync(path.join(folder, 'CLAUDE.md'), '# User notes\n');
try { fs.symlinkSync(path.join(folder, 'model.py'), path.join(folder, 'AGENTS.md.soma-tmp')); } catch { /* Symlinks may be unavailable. */ }
const run = (...args) => {
  const r = spawnSync(process.execPath, [path.join(APP, 'dist/main/init.js'), ...args], { encoding: 'utf8', timeout: 10000 });
  let json;
  try { json = JSON.parse(r.status === 0 ? r.stdout : r.stderr); } catch { json = {}; }
  return { ...r, json };
};
const args = ['init', folder, '--entry', 'model.py', '--profile', profile];
try {
  const first = run(...args);
  const pj = JSON.parse(fs.readFileSync(path.join(folder, '.soma/project.json'), 'utf8'));
  const agents = fs.readFileSync(path.join(folder, 'AGENTS.md'), 'utf8');
  t.check('Init preserves model and user instructions', first.status === 0 && pj.id === first.json.id && agents.startsWith('# User instructions\n')
    && agents.includes('<!-- soma:folder -->') && fs.readFileSync(path.join(folder, 'model.py'), 'utf8') === script, first.stderr);
  t.check('Reported changes are actual files', first.json.creates.includes('.soma/project.json') && first.json.changes.includes('AGENTS.md')
    && !first.json.creates.some((name) => name.startsWith('output/')));
  const backups = fs.readdirSync(path.join(profile, 'workspace-backups'));
  t.check('Init backs up changed instructions', backups.some((name) => fs.readFileSync(path.join(profile, 'workspace-backups', name, 'AGENTS.md'), 'utf8') === '# User instructions\n'));
  const second = run(...args);
  t.check('Repeated init keeps the same ID without changes', second.status === 0 && second.json.id === first.json.id && !second.json.creates.length && !second.json.changes.length);
  const shared = path.join(work, 'shared model');
  fs.mkdirSync(shared);
  fs.writeFileSync(path.join(shared, 'model.py'), script);
  const sharedArgs = ['init', shared, '--entry', 'model.py', '--profile', profile, '--skill-storage', 'shared'];
  const sharedInit = run(...sharedArgs);
  const sharedSettings = path.join(shared, '.soma/project.json');
  const sharedProject = JSON.parse(fs.readFileSync(sharedSettings, 'utf8'));
  t.check('Shared mode lists enabled skills without copying Markdown into the project', sharedInit.status === 0
    && sharedProject.skills.includes('cadquery')
    && !fs.existsSync(path.join(shared, '.soma/skills'))
    && fs.readFileSync(path.join(shared, 'AGENTS.md'), 'utf8').includes('cadlab/bin/cadlab skill cadquery'));
  sharedProject.skill_settings = { '3d-printing': { nozzle: 0.6, bed_x: 256 } };
  fs.writeFileSync(sharedSettings, JSON.stringify(sharedProject));
  const rules = run('skill', shared, '3d-printing', '--profile', profile);
  t.check('Shared skills render the saved project settings', rules.status === 0
    && rules.stdout.includes('| Nozzle | 0.6 mm |') && rules.stdout.includes('| Build volume | 256 × 220 × 250 mm |')
    && !fs.existsSync(path.join(shared, '.soma/skills')), rules.stderr);
  const sharedAgain = run(...sharedArgs);
  t.check('Repeated shared init preserves settings and creates no files', sharedAgain.status === 0
    && !sharedAgain.json.creates.length && !sharedAgain.json.changes.length
    && JSON.parse(fs.readFileSync(sharedSettings, 'utf8')).skill_settings['3d-printing'].nozzle === 0.6);
  const beforeChange = fs.readFileSync(path.join(folder, '.soma/project.json'), 'utf8');
  fs.writeFileSync(path.join(folder, 'another.py'), script);
  const changed = run('init', folder, '--entry', 'another.py', '--profile', profile);
  const allBackups = fs.readdirSync(path.join(profile, 'workspace-backups'));
  t.check('Changing the entry backs up project metadata', changed.status === 0 && allBackups.some((name) => {
    const file = path.join(profile, 'workspace-backups', name, 'project.json');
    return fs.existsSync(file) && fs.readFileSync(file, 'utf8') === beforeChange;
  }));
  const invalid = path.join(work, 'invalid'); fs.mkdirSync(invalid);
  const missing = run('init', invalid, '--entry', 'missing.py', '--profile', profile);
  t.check('Missing entry fails without creating a project', missing.status !== 0 && !fs.existsSync(path.join(invalid, '.soma')));
  const traversal = run('init', invalid, '--entry', '../model with spaces/model.py', '--profile', profile);
  t.check('Entry outside the folder is rejected', traversal.status !== 0 && !fs.existsSync(path.join(invalid, '.soma')));
  const overlap = run('init', profile, '--entry', 'model.py', '--profile', profile);
  t.check('App profile is rejected as a project', overlap.status !== 0 && /app data/.test(overlap.json.error));
  const malformed = run('init', folder, '--entry', 'model.py', '--profile');
  t.check('Missing option value fails', malformed.status !== 0);
  const broken = path.join(work, 'broken metadata'); fs.mkdirSync(path.join(broken, '.soma'), { recursive: true });
  fs.writeFileSync(path.join(broken, 'model.py'), script);
  fs.writeFileSync(path.join(broken, '.soma/project.json'), '{broken');
  const badJson = run('init', broken, '--entry', 'model.py', '--profile', profile);
  t.check('Invalid metadata is not replaced', badJson.status !== 0 && fs.readFileSync(path.join(broken, '.soma/project.json'), 'utf8') === '{broken');
  const linked = path.join(work, 'linked metadata'); fs.mkdirSync(linked);
  fs.writeFileSync(path.join(linked, 'model.py'), script);
  let canLink = true;
  try { fs.symlinkSync(path.join(folder, '.soma'), path.join(linked, '.soma'), 'junction'); } catch { canLink = false; }
  if (canLink) {
    const otherBefore = fs.readFileSync(path.join(folder, '.soma/project.json'), 'utf8');
    const escaped = run('init', linked, '--entry', 'model.py', '--profile', profile);
    t.check('Metadata symlink outside the project is rejected', escaped.status !== 0 && fs.readFileSync(path.join(folder, '.soma/project.json'), 'utf8') === otherBefore);
  }
  const linkedSkills = path.join(work, 'linked skills'); fs.mkdirSync(path.join(linkedSkills, '.soma'), { recursive: true });
  fs.writeFileSync(path.join(linkedSkills, 'model.py'), script);
  let canLinkSkills = true;
  try { fs.symlinkSync(path.join(folder, '.soma/skills'), path.join(linkedSkills, '.soma/skills'), 'junction'); } catch { canLinkSkills = false; }
  if (canLinkSkills) {
    const escaped = run('init', linkedSkills, '--entry', 'model.py', '--profile', profile);
    t.check('Skills symlink outside the project is rejected', escaped.status !== 0 && !fs.existsSync(path.join(linkedSkills, '.soma/project.json')));
  }
  const retry = path.join(work, 'retry'); fs.mkdirSync(retry);
  fs.writeFileSync(path.join(retry, 'model.py'), script);
  fs.mkdirSync(path.join(retry, 'AGENTS.md'));
  const failed = run('init', retry, '--entry', 'model.py', '--profile', profile);
  const noMetadata = !fs.existsSync(path.join(retry, '.soma/project.json'));
  fs.rmdirSync(path.join(retry, 'AGENTS.md'));
  const recovered = run('init', retry, '--entry', 'model.py', '--profile', profile);
  const recoveredProject = recovered.status === 0 ? JSON.parse(fs.readFileSync(path.join(retry, '.soma/project.json'), 'utf8')) : {};
  t.check('Failed setup can be retried with default skills', failed.status !== 0 && noMetadata && recovered.status === 0
    && (recoveredProject.skills?.length || recoveredProject.skills_on_demand?.length));
  if (process.platform !== 'win32') {
    const fifo = path.join(work, 'fifo'); fs.mkdirSync(fifo);
    fs.writeFileSync(path.join(fifo, 'model.py'), script);
    if (spawnSync('mkfifo', [path.join(fifo, 'AGENTS.md')]).status === 0) {
      const blockedPipe = run('init', fifo, '--entry', 'model.py', '--profile', profile);
      t.check('A named pipe is rejected before reading', blockedPipe.status !== 0 && !blockedPipe.signal && /not a file/.test(blockedPipe.json.error));
    }
  }
  const unsafeProfile = path.join(work, 'unsafe profile'); fs.mkdirSync(unsafeProfile);
  let canLinkProfile = true;
  try { fs.symlinkSync(path.join(folder, 'model.py'), path.join(unsafeProfile, 'folders.json')); } catch { canLinkProfile = false; }
  if (canLinkProfile) {
    const protectedModel = fs.readFileSync(path.join(folder, 'model.py'), 'utf8');
    const unsafe = run('init', folder, '--entry', 'model.py', '--profile', unsafeProfile);
    t.check('A profile index symlink cannot overwrite a model', unsafe.status !== 0 && fs.readFileSync(path.join(folder, 'model.py'), 'utf8') === protectedModel);
  }
  const simultaneous = path.join(work, 'simultaneous'); fs.mkdirSync(simultaneous);
  fs.writeFileSync(path.join(simultaneous, 'model.py'), script);
  const concurrentArgs = [path.join(APP, 'dist/main/init.js'), 'init', simultaneous, '--entry', 'model.py', '--profile', profile];
  const results = await Promise.all(Array.from({ length: 8 }, () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, concurrentArgs);
    let out = '', err = '';
    child.stdout.on('data', (data) => { out += data; });
    child.stderr.on('data', (data) => { err += data; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, json: JSON.parse(status === 0 ? out : err) }));
  })));
  const finalId = JSON.parse(fs.readFileSync(path.join(simultaneous, '.soma/project.json'), 'utf8')).id;
  t.check('Concurrent initialization keeps one project ID', results.some((r) => r.status === 0)
    && results.every((r) => r.status === 0 ? r.json.id === finalId : /initialization is busy/.test(r.json.error)));
} catch (e) { console.error(e); t.fail(); }
cleanup(work);
process.exit(t.fails ? 1 : 0);
