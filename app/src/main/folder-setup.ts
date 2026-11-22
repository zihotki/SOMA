import fs from 'node:fs';
import path from 'node:path';
import { resolveInside } from './files';
import { applyFolder, type FolderPlan } from './folders';
import { backupsDir, userDataDir } from './paths';
import { folderId, forgetProject, patchAppState, registerFolder } from './workspace';

/** Resolve the actual folder and reject overlap with the selected app profile. */
export function projectFolder(picked: string): string {
  const requested = path.resolve(picked);
  if (!fs.existsSync(requested) || !fs.statSync(requested).isDirectory()) throw new Error(`Not a folder: ${requested}`);
  const dir = fs.realpathSync.native(requested);
  const profile = fs.realpathSync.native(userDataDir());
  const inside = (a: string, b: string) => {
    const rel = path.relative(b, a);
    return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
  };
  if (inside(dir, profile) || inside(profile, dir)) throw new Error('This folder holds the CAD Lab Viewer profile. Choose another folder.');
  return dir;
}

/** Apply the same folder setup for the UI and the headless initializer. */
export function setupFolder(plan: FolderPlan, snapshot?: () => Map<string, string>): { id: string; before?: Map<string, string>; after?: Map<string, string> } {
  for (const rel of ['folders.json', 'projects', 'workspace-backups']) resolveInside(userDataDir(), rel);
  const index = path.join(userDataDir(), 'folders.json');
  if (fs.existsSync(index) && !fs.statSync(index).isFile()) throw new Error('The profile folders.json is not a file.');
  const lock = path.join(plan.dir, '.soma-init.lock');
  let fd: number;
  try { fd = fs.openSync(lock, 'wx'); }
  catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('Project initialization is busy. If a previous initialization stopped, remove .soma-init.lock and retry.');
    throw e;
  }
  try {
    const before = snapshot?.();
    const { id } = applyFolder(plan, backupsDir());
    const known = folderId(plan.dir);
    if (known && known !== id) forgetProject(known);
    registerFolder(id, plan.dir);
    patchAppState(id, {});
    return { id, before, after: snapshot?.() };
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(lock);
  }
}
