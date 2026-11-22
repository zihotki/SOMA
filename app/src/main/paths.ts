import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { SkillDirs } from './skills';

let headlessPaths: { appRoot: string; userData: string } | undefined;
export function configureHeadlessPaths(appRoot: string, userData: string): void { headlessPaths = { appRoot, userData }; }

/** App-Daten. Fuer Tests per SOMA_USER_DATA umleitbar, damit nichts im echten Profil landet. */
export function userDataDir(): string {
  return headlessPaths?.userData || process.env.SOMA_USER_DATA || app.getPath('userData');
}

export const workspacesDir = () => path.join(userDataDir(), 'workspaces');
/** Geöffnete Ordner (Ordner-Modus): Kennung des Modells → Pfad. Ihre Modelle liegen nicht unter workspaces/. */
export const foldersFile = () => path.join(userDataDir(), 'folders.json');
/** Zweite Kopie des Projektzustands ausserhalb des Arbeitsordners (E27). */
export const projectStateDir = () => path.join(userDataDir(), 'projects');
export const appStateFile = () => path.join(userDataDir(), 'state.json');
/** Einstellungen des Nutzers (E81), getrennt vom Zustand der App in state.json. */
export const settingsFile = () => path.join(userDataDir(), 'settings.json');
/** Gesicherte Arbeitsordner (wenn eine ZIP den Arbeitsstand ersetzt). */
export const backupsDir = () => path.join(userDataDir(), 'workspace-backups');
/** Sicherungen aus dem Editor (Fassungen, die bei einem Konflikt ersetzt wurden), je Projekt. */
export const editBackupsDir = (id: string) => path.join(backupsDir(), `${id}-editor`);
/** Sicherungen von Skill-Kopien, die beim Ein- oder Ausschalten ersetzt oder entfernt wurden, je Projekt. */
export const skillBackupsDir = (id: string) => path.join(backupsDir(), `${id}-skills`);
/** Vorschauen alter Stände (aus dem Verlauf erzeugt, jederzeit neu erzeugbar). */
export const previewsDir = () => path.join(userDataDir(), 'previews');
/** Vorschaubilder für die Startseite (vom Viewer nach dem Laden des Modells, jederzeit neu erzeugbar). */
export const thumbnailsDir = () => path.join(userDataDir(), 'thumbnails');
/** Protokoll der App (log.ts), für die Fehlersuche bei Nutzern. */
export const logsDir = () => path.join(userDataDir(), 'logs');
/**
 * Leerer Startordner der vorgewärmten Python-Prozesse (build.ts). Python setzt ihn vorn in den Suchpfad, also darf dort
 * nichts liegen, was Module überdeckt. Ein Projektordner geht nicht: Windows hielte ihn als aktuelles Verzeichnis fest.
 */
export const warmDir = () => path.join(userDataDir(), 'python-start');

/** Vorlage fuer neue Projekte (liegt neben dem Programm, spaeter im Installationspaket). */
const appRoot = () => headlessPaths?.appRoot ?? app.getAppPath();
export const templateDir = () => path.join(appRoot(), 'resources', 'template');

/** Mitgelieferte Skills (E17), je einer als Markdown. */
export const skillsDir = () => path.join(appRoot(), 'resources', 'skills');
/** Bilder der Anleitung (E83), der Text ist der mitgelieferte Skill `soma-app.md`. */
export const helpDir = () => path.join(app.getAppPath(), 'resources', 'help');
/** Eigene und bearbeitete Skills des Nutzers (E78), gelten für die ganze App. */
export const userSkillsDir = () => path.join(userDataDir(), 'skills');
/** Beide Ordner der Bibliothek der Skills. */
export const skillDirs = (): SkillDirs => ({ bundled: skillsDir(), user: userSkillsDir() });
/** Sicherungen eigener Skills (gelöscht, zurückgesetzt, beim Import ersetzt oder außerhalb der App geändert). */
export const libraryBackupsDir = () => path.join(backupsDir(), 'skills-library');

/** App-Icon (E44) für Fenster und Taskleiste. Windows nimmt die ICO mit allen Größen, andere Systeme das PNG. */
export const appIcon = () => path.join(app.getAppPath(), 'resources', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

/**
 * Python der Basisumgebung. Reihenfolge: SOMA_PYTHON, Entwicklungs-Umgebung
 * (python/scripts/setup_env.ps1), sonst `python` im PATH.
 */
export function pythonExe(): string {
  if (process.env.SOMA_PYTHON) return process.env.SOMA_PYTHON;
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const dev = path.join(process.env.LOCALAPPDATA, 'soma-dev', 'venv', 'Scripts', 'python.exe');
    if (fs.existsSync(dev)) return dev;
  }
  return process.platform === 'win32' ? 'python.exe' : 'python3';
}

/** Environment for Python processes started by the viewer. */
export function pythonEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1', ...extra };
}
