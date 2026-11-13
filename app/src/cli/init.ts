import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { resolveInside } from '../main/files';
import { planFolder } from '../main/folders';
import { projectFolder, setupFolder } from '../main/folder-setup';
import { configureHeadlessPaths } from '../main/paths';

const usage = 'Usage: node init.js init <project-folder> --entry <script.py> --profile <profile-folder>';

function setupFiles(dir: string): Map<string, string> {
  const files = new Map<string, string>();
  const add = (rel: string): void => {
    const file = path.join(dir, rel);
    let stat: fs.Stats;
    try { stat = fs.lstatSync(file); } catch { return; }
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(file)) add(path.join(rel, name));
    } else if (stat.isFile()) files.set(rel.split(path.sep).join('/'), createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
  };
  for (const rel of ['AGENTS.md', 'CLAUDE.md', '.soma/project.json', '.soma/.gitignore', '.soma/skills']) add(rel);
  return files;
}

function run(args: string[]): void {
  const [command, folder, ...options] = args;
  if (command !== 'init' || !folder || folder.startsWith('--')) throw new Error(usage);
  let entry = '';
  let profile = process.env.SOMA_USER_DATA ?? '';
  const seen = new Set<string>();
  for (let i = 0; i < options.length; i += 2) {
    const key = options[i], value = options[i + 1];
    if ((key !== '--entry' && key !== '--profile') || !value || value.startsWith('--') || seen.has(key)) throw new Error(usage);
    seen.add(key);
    if (key === '--entry') entry = value;
    else profile = value;
  }
  if (!entry || !profile || path.isAbsolute(entry) || path.extname(entry).toLowerCase() !== '.py') throw new Error(usage);
  const profileDir = path.resolve(profile);
  if (!fs.existsSync(profileDir) || !fs.statSync(profileDir).isDirectory()) throw new Error(`Not a profile folder: ${profileDir}`);
  configureHeadlessPaths(path.resolve(__dirname, '../..'), fs.realpathSync.native(profileDir));
  const dir = projectFolder(folder);
  const script = resolveInside(dir, entry);
  if (!fs.existsSync(script) || !fs.statSync(script).isFile()) throw new Error(`Entry script does not exist: ${entry}`);
  const relativeEntry = path.relative(dir, script).split(path.sep).join('/');
  const plan = planFolder(dir, relativeEntry, false);
  const { id, before = new Map(), after = new Map() } = setupFolder(plan, () => setupFiles(dir));
  const creates = [...after.keys()].filter((name) => !before.has(name)).sort();
  const changes = [...after.keys()].filter((name) => before.has(name) && before.get(name) !== after.get(name)).sort();
  process.stdout.write(`${JSON.stringify({ ok: true, folder: dir, entry: relativeEntry, id, creates, changes })}\n`);
}

try { run(process.argv.slice(2)); }
catch (e) { process.stderr.write(`${JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) })}\n`); process.exitCode = 1; }
