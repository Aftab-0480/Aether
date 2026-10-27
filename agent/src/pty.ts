import type { IPty } from 'node-pty';
<<<<<<< HEAD
import { copyFileSync, chmodSync, existsSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
=======
import { existsSync } from 'fs';
>>>>>>> de3dc97 (feat(agent): add macOS and Linux CLI support and CI)

// node-pty executes spawn-helper as a separate OS process. A helper stored
// inside a pkg snapshot cannot be executed, so extract the packaged asset first.
function preparePackagedPtyHelper(): void {
  if (!(process as NodeJS.Process & { pkg?: boolean }).pkg || process.platform === 'win32') return;

  const packageEntry = require.resolve('node-pty');
  const packageRoot = resolve(dirname(packageEntry), '..');
  const helperSource = join(packageRoot, 'prebuilds', `${process.platform}-${process.arch}`, 'spawn-helper');

  if (!existsSync(helperSource)) {
    throw new Error(`Packaged node-pty spawn-helper is missing: ${helperSource}`);
  }

  const helperDirectory = mkdtempSync(join(tmpdir(), 'aether-pty-'));
  const helperTarget = join(helperDirectory, 'spawn-helper');
  copyFileSync(helperSource, helperTarget);
  chmodSync(helperTarget, 0o755);
  process.env['AETHER_NODE_PTY_SPAWN_HELPER'] = helperTarget;
}

preparePackagedPtyHelper();
const pty = require('node-pty') as typeof import('node-pty');

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;

// Environment sanitization 
const SENSITIVE_PATTERNS = [
  'MONGO_URI',
  'DATABASE_URL',
  'REDIS_URL',
  'PRIVATE_KEY',
  'SESSION_SECRET',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'SERVER_URL',         
  'WEB_URL',    
];

const SENSITIVE_PREFIXES = [
  'AWS_',
  'AZURE_',
  'GCP_',
  'GOOGLE_CLOUD_',
  'GOOGLE_APPLICATION_',
  'FIREBASE_',
  'HEROKU_',
  'VERCEL_',
  'NETLIFY_',
  'DIGITALOCEAN_',
  'DO_',
  'DOCKER_',
  'K8S_',
  'KUBE_',
  'CI_',
  'GITHUB_',
  'GITLAB_',
  'BITBUCKET_',
  'NPM_TOKEN',
  'NODE_AUTH_',
  'SENTRY_',
  'DATADOG_',
  'DD_',
  'NEW_RELIC_',
  'TWILIO_',
  'SENDGRID_',
  'STRIPE_',
  'OPENAI_',
  'ANTHROPIC_',
  'GEMINI_',
  'HUGGINGFACE_',
  'SSH_AUTH_',
];

const SENSITIVE_SUFFIXES = [
  '_KEY',
  '_SECRET',
  '_TOKEN',
  '_PASSWORD',
  '_PASSWD',
  '_CREDENTIAL',
  '_CREDENTIALS',
  '_API_KEY',
  '_ACCESS_KEY',
  '_PRIVATE_KEY',
  '_CONNECTION_STRING',
  '_DSN',
];

function isSensitive(key: string): boolean {
  const upper = key.toUpperCase();
  for (const pattern of SENSITIVE_PATTERNS) {
    if (upper === pattern) return true;
  }

  for (const prefix of SENSITIVE_PREFIXES) {
    if (upper.startsWith(prefix)) return true;
  }

  for (const suffix of SENSITIVE_SUFFIXES) {
    if (upper.endsWith(suffix)) return true;
  }
  return false;
}

function sanitizeEnv(): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !isSensitive(key)) {
      clean[key] = value;
    }
  }
  if (!clean['TERM']) {
    clean['TERM'] = 'xterm-256color';
  }
  if (!clean['COLORTERM']) {
    clean['COLORTERM'] = 'truecolor';
  }
  if (process.platform !== 'win32' && !clean['LANG']) {
    clean['LANG'] = 'en_US.UTF-8';
  }
  return clean;
}

// Shell detection 
export function getShell(): string {
  if (process.platform === 'win32') {
    // Windows: Use user-specified shell or default to powershell.exe
    const winShell = process.env['AETHER_SHELL'] || process.env['SHELL'];
    if (winShell) {
      return winShell;
    }
    return 'powershell.exe';
  }

  // 1. Explicit user override via AETHER_SHELL or standard SHELL
  const envShell = process.env['AETHER_SHELL'] || process.env['SHELL'];
  if (envShell && existsSync(envShell)) {
    return envShell;
  }

  // 2. macOS: Default login shell is zsh, followed by bash and sh
  if (process.platform === 'darwin') {
    for (const sh of ['/bin/zsh', '/bin/bash', '/bin/sh']) {
      if (existsSync(sh)) {
        return sh;
      }
    }
  }

  // 3. Linux / Unix: Check standard shell locations
  for (const sh of ['/bin/bash', '/usr/bin/bash', '/bin/zsh', '/bin/sh']) {
    if (existsSync(sh)) {
      return sh;
    }
  }

  // 4. Fallback to whatever SHELL was set, or system default 'sh'
  return envShell || 'sh';
}

// Public API 
export interface PTYExitInfo {
  exitCode: number;
  signal?: number;
}

// Spawn a new PTY process.
export function spawnPTY(onExit?: (info: PTYExitInfo) => void): IPty {
  const shell = getShell();

  let cwd = process.env['HOME'] || process.env['USERPROFILE'] || process.cwd();
  try {
    if (!existsSync(cwd)) {
      cwd = process.cwd();
    }
  } catch {
    cwd = process.cwd();
  }

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: DEFAULT_COLS,
    rows: DEFAULT_ROWS,
    cwd,
    env: sanitizeEnv(),
  });

  if (onExit) {
    ptyProcess.onExit((e) => {
      onExit({ exitCode: e.exitCode, signal: e.signal });
    });
  }

  return ptyProcess;
}

// Resize a PTY, clamping values to safe bounds.
export function resizePTY(  
  ptyProcess: IPty,
  cols: number,
  rows: number,
  maxCols: number,
  maxRows: number,
): void {
  const safeCols = Math.max(1, Math.min(Math.floor(cols), maxCols));
  const safeRows = Math.max(1, Math.min(Math.floor(rows), maxRows));

  try {
    ptyProcess.resize(safeCols, safeRows);
  } catch {
    // Resize can fail if the PTY has already been destroyed
  }
}
