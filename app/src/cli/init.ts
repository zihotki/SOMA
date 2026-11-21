import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { resolveInside } from '../main/files';
import { planFolder } from '../main/folders';
import { projectFolder, setupFolder } from '../main/folder-setup';
import { configureHeadlessPaths, skillDirs } from '../main/paths';
import { cleanValues, isSkillId, librarySkill, renderSkill } from '../main/skills';
import type { ProjectJson } from '../main/workspace';

const usage = 'Usage: node init.js init <project-folder> --entry <script.py> --profile <profile-folder> [--skill-storage shared]';

function setProfile(profile: string): void {
  const dir = path.resolve(profile);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`Not a profile folder: ${dir}`);
  configureHeadlessPaths(path.resolve(__dirname, '../..'), fs.realpathSync.native(dir));
}

function printSkill(args: string[]): void {
  const [folder, id, option, profile] = args;
  if (args.length !== 4 || !folder || !isSkillId(id) || option !== '--profile' || !profile) {
    throw new Error('Usage: node init.js skill <project-folder> <skill-id> --profile <profile-folder>');
  }
  setProfile(profile);
  const dir = projectFolder(folder);
  const skill = librarySkill(skillDirs(), id);
  if (!skill) throw new Error(`The skill “${id}” is missing from the shared library.`);
  const file = resolveInside(dir, '.soma/project.json');
  const project = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) as ProjectJson : null;
  const mode = project?.skills?.includes(id) || (!project && skill.defaultMode === 'always') ? 'always' : 'demand';
  process.stdout.write(renderSkill(skill.text, cleanValues(skill.vars, project?.skill_settings?.[id]), mode));
}

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
  if (command === 'skill') return printSkill(args.slice(1));
  if (command !== 'init' || !folder || folder.startsWith('--')) throw new Error(usage);
  let entry = '';
  let profile = process.env.SOMA_USER_DATA ?? '';
  let sharedSkills = false;
  const seen = new Set<string>();
  for (let i = 0; i < options.length; i += 2) {
    const key = options[i], value = options[i + 1];
    if (!['--entry', '--profile', '--skill-storage'].includes(key) || !value || value.startsWith('--') || seen.has(key)) throw new Error(usage);
    seen.add(key);
    if (key === '--entry') entry = value;
    else if (key === '--profile') profile = value;
    else if (value === 'shared') sharedSkills = true;
    else throw new Error(usage);
  }
  if (!entry || !profile || path.isAbsolute(entry) || path.extname(entry).toLowerCase() !== '.py') throw new Error(usage);
  setProfile(profile);
  const dir = projectFolder(folder);
  if (sharedSkills) process.env.SOMA_SHARED_SKILLS_PROJECT = dir;
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
