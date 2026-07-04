/** Captures the machine/software environment for a results file, so a
 * comparison can be judged (or discarded) on the conditions it ran under. */
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

export interface EnvInfo {
  platform: string;
  arch: string;
  cpuModel: string;
  cpuCount: number;
  totalMemGB: number;
  loadavg: number[];
  nodeVersion: string;
  chromeVersion: string | null;
  chromedriverPath: string | null;
  timestamp: string;
}

function safeExec(cmd: string, args: string[]): string | null {
  try {
    return execFileSync(cmd, args, { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function chromeVersion(): string | null {
  const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const out =
    safeExec(macPath, ['--version']) ??
    safeExec('google-chrome', ['--version']) ??
    safeExec('chromium', ['--version']);
  return out?.replace(/^Google Chrome\s+/, '').replace(/^Chromium\s+/, '') ?? null;
}

export function captureEnv(chromedriverPath: string | null): EnvInfo {
  const cpus = os.cpus();
  return {
    platform: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
    cpuModel: cpus[0]?.model ?? 'unknown',
    cpuCount: cpus.length,
    totalMemGB: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
    loadavg: os.loadavg(),
    nodeVersion: process.version,
    chromeVersion: chromeVersion(),
    chromedriverPath,
    timestamp: new Date().toISOString(),
  };
}

/** Reads `version` from a package's package.json without importing it (avoids
 * pulling the whole module graph just to report a version string). */
export function packageVersion(pkgDir: string): string | null {
  try {
    const pkgJsonPath = path.join(pkgDir, 'package.json');
    const raw = readFileSync(pkgJsonPath, 'utf-8');
    return (JSON.parse(raw) as { version?: string }).version ?? null;
  } catch {
    return null;
  }
}

/** Resolves the on-disk directory of a package installed via node_modules,
 * relative to `fromFile` (pass `import.meta.url` from the caller). */
export function resolvePackageDir(pkgName: string, fromFile: string): string | null {
  try {
    const require = createRequire(fromFile);
    const entry = require.resolve(pkgName);
    // Walk up from the resolved entry file to the package root (has package.json).
    let dir = path.dirname(entry);
    for (let i = 0; i < 8; i++) {
      try {
        readFileSync(path.join(dir, 'package.json'), 'utf-8');
        return dir;
      } catch {
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function craftdriverGitSha(craftdriverRepoPath: string): string | null {
  return safeExec('git', ['-C', craftdriverRepoPath, 'rev-parse', '--short', 'HEAD']);
}
