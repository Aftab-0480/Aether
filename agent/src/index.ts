#!/usr/bin/env node
import { banner, printcode, info, error } from './logger';
import { createSessionCode } from './code';
import { startSession, cleanup } from './session';
import { config } from './config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createAgentPeer } from './webrtc';
import { spawnPTY } from './pty';


function getShareUrl(code: string): string {
  return new URL(`/term/${code}`, config.WEB_URL).toString();
}

function showHelp(): void {
  console.log('');
  console.log('  Usage: aether [command]');
  console.log('');
  console.log('  Commands:');
  console.log('    share     Share your terminal (default)');
  console.log('    help      Show this help message');
  console.log('    version   Show version');
  console.log('    self-test Test packaged WebRTC and PTY runtime');
  console.log('');
}

function getVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

function showVersion(): void {
  console.log(`  aether v${getVersion()}`);
}

async function runRuntimeSelfTest(): Promise<void> {
  console.log('Testing packaged WebRTC...');
  const peer = createAgentPeer({ iceServers: [] });
  try {
    const offer = await peer.createOffer();
    if (!offer.sdp || offer.type !== 'offer') throw new Error('WebRTC did not create a valid SDP offer.');
    console.log('PASS: WebRTC loaded and created an SDP offer.');
  } finally { peer.close(); }

  console.log('Testing packaged PTY...');
  await new Promise<void>((resolve, reject) => {
    let done = false;
    const finish = (err?: Error) => { if (done) return; done = true; clearTimeout(timer); err ? reject(err) : resolve(); };
    const timer = setTimeout(() => finish(new Error('PTY self-test timed out.')), 10000);
    try {
      const shell = spawnPTY(({ exitCode }) => exitCode === 0 ? finish() : finish(new Error(`PTY shell exited with code ${exitCode}.`)));
      shell.write('exit\\r');
    } catch (err) { finish(err instanceof Error ? err : new Error(String(err))); }
  });
  console.log('PASS: PTY spawned a shell and exited cleanly.');
  console.log('PASS: standalone runtime self-test completed.');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'share';

  switch (command) {
    case 'help':
    case '--help':
    case '-h': {
      showHelp();
      return;
    }

    case 'self-test':
    case '--self-test': {
      await runRuntimeSelfTest();
      return;
    }

    case 'version':
    case '--version':
    case '-v': {
      showVersion();
      return;
    }

    case 'share':
    default: {
      // Print banner
      banner();

      // Generate 6-digit code
      const code = createSessionCode();

      // Display code and share URL
      info('Your session code:');
      printcode(code);
      info(`Share URL: ${getShareUrl(code)}`);
      info('Give this code to anyone you want to share your terminal with.');
      console.log('');

      // Start the session
      await startSession(code);
      break;
    }
  }
}

// Process lifecycle 
process.on('SIGINT', () => {
  console.log('');
  info('Shutting down...');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

process.on('uncaughtException', (err: Error) => {
  error(`Uncaught exception: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }
  cleanup();
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  error(`Unhandled rejection: ${message}`);
  cleanup();
  process.exit(1);
});

// Run
main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  error(`Fatal error: ${message}`);
  cleanup();
  process.exit(1);
});
