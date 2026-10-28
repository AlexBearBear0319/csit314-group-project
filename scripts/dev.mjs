import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const children = new Set();
let stopping = false;
let exitCode = 0;
let killTimer;

function signalChild(child, signal) {
  try {
    if (process.platform === 'win32') child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== 'ESRCH') console.error(error.message);
  }
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  exitCode = code;
  for (const child of children) signalChild(child, 'SIGINT');
  if (!children.size) process.exit(exitCode);
  killTimer = setTimeout(() => {
    for (const child of children) signalChild(child, 'SIGKILL');
  }, 4000);
  killTimer.unref();
}

for (const script of ['dev:server', 'dev:client']) {
  const child = process.env.npm_execpath
    ? spawn(process.execPath, [process.env.npm_execpath, 'run', script], {
      cwd: root, stdio: 'inherit', detached: process.platform !== 'win32',
    })
    : spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], {
      cwd: root, stdio: 'inherit', detached: process.platform !== 'win32',
      shell: process.platform === 'win32',
    });
  children.add(child);
  child.on('error', (error) => {
    console.error(`Could not start ${script}: ${error.message}`);
    children.delete(child);
    stop(1);
  });
  child.on('exit', (code) => {
    children.delete(child);
    if (!stopping) stop(code || 1);
    else if (!children.size) {
      clearTimeout(killTimer);
      process.exit(exitCode);
    }
  });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
