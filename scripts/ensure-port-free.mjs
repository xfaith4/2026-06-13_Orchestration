import { execFile } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const envFilePath = path.join(projectRoot, '.env');

const portTargets = {
  backend: {
    envVar: 'BACKEND_PORT',
    label: 'backend',
    defaultPort: '3007',
  },
  frontend: {
    envVar: 'FRONTEND_PORT',
    label: 'frontend',
    defaultPort: '5176',
  },
};

function parseEnvFile(contents) {
  const values = {};

  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadProjectEnv() {
  try {
    return parseEnvFile(fs.readFileSync(envFilePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }

    throw error;
  }
}

function resolvePort(envVar, defaultPort, envValues) {
  const rawValue = process.env[envVar] ?? envValues[envVar] ?? defaultPort;
  const parsedPort = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error(`${envVar} must be a valid TCP port. Received "${rawValue}".`);
  }

  return parsedPort;
}

async function runCommand(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, {
      windowsHide: true,
      timeout: 10000,
      ...options,
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: 0,
      missing: false,
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        stdout: '',
        stderr: '',
        exitCode: null,
        missing: true,
      };
    }

    return {
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      exitCode: typeof error.code === 'number' ? error.code : 1,
      missing: false,
    };
  }
}

function parsePidList(output) {
  return [...new Set(
    output
      .split(/\s+/u)
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value) && value > 0)
  )];
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function canBindToPort(port) {
  return await new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.listen({ host: '0.0.0.0', port, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

function isWslEnvironment() {
  return Boolean(process.env.WSL_DISTRO_NAME) || os.release().toLowerCase().includes('microsoft');
}

async function findUnixListeningPids(port) {
  const results = [];

  for (const commandSpec of [
    ['lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']],
    ['fuser', ['-n', 'tcp', String(port)]],
  ]) {
    const [command, args] = commandSpec;
    const result = await runCommand(command, args);

    if (result.missing) {
      continue;
    }

    results.push(...parsePidList(result.stdout));
  }

  return [...new Set(results)].filter((pid) => pid !== process.pid);
}

async function killUnixListeners(port) {
  const pids = await findUnixListeningPids(port);
  const killed = [];

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch (error) {
      if (error.code === 'ESRCH') {
        continue;
      }

      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));

    try {
      process.kill(pid, 0);
      process.kill(pid, 'SIGKILL');
    } catch (error) {
      if (error.code !== 'ESRCH') {
        throw error;
      }
    }

    killed.push(pid);
  }

  return killed;
}

async function runPowerShell(script) {
  return runCommand('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
}

async function findWindowsListeningPids(port) {
  const script = [
    `Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue`,
    '  | Select-Object -ExpandProperty OwningProcess -Unique',
  ].join('');

  const result = await runPowerShell(script);

  if (result.missing) {
    return [];
  }

  return parsePidList(result.stdout);
}

async function killWindowsListeners(port) {
  const pids = await findWindowsListeningPids(port);
  const killed = [];

  for (const pid of pids) {
    const result = await runPowerShell(
      `try { Stop-Process -Id ${pid} -Force -ErrorAction Stop; Write-Output ${pid} } catch { exit 1 }`
    );

    if (parsePidList(result.stdout).includes(pid)) {
      killed.push(pid);
    }
  }

  return killed;
}

async function freePort(label, port) {
  if (await canBindToPort(port)) {
    console.log(`[ports] ${label} port ${port} is already free.`);
    return;
  }

  const unixKilled = process.platform === 'win32' ? [] : await killUnixListeners(port);
  const windowsKilled =
    process.platform === 'win32'
      ? await killWindowsListeners(port)
      : [];

  if (unixKilled.length > 0 || windowsKilled.length > 0) {
    await wait(500);
  }

  if (!(await canBindToPort(port)) && isWslEnvironment()) {
    windowsKilled.push(...(await killWindowsListeners(port)));

    if (windowsKilled.length > 0) {
      await wait(500);
    }
  }

  if (!(await canBindToPort(port))) {
    throw new Error(`Unable to free ${label} port ${port}.`);
  }

  const summaries = [];

  if (unixKilled.length > 0) {
    summaries.push(`unix pids ${unixKilled.join(', ')}`);
  }

  if (windowsKilled.length > 0) {
    summaries.push(`windows pids ${windowsKilled.join(', ')}`);
  }

  if (summaries.length === 0) {
    console.log(`[ports] ${label} port ${port} was busy, but no owning process could be identified.`);
    return;
  }

  console.log(`[ports] Cleared ${label} port ${port} by stopping ${summaries.join(' and ')}.`);
}

async function main() {
  const envValues = loadProjectEnv();
  const requestedTargets = process.argv.slice(2);
  const targets = requestedTargets.length > 0 ? requestedTargets : Object.keys(portTargets);

  for (const target of targets) {
    const config = portTargets[target];

    if (!config) {
      throw new Error(`Unknown port target "${target}". Expected one of: ${Object.keys(portTargets).join(', ')}.`);
    }

    const port = resolvePort(config.envVar, config.defaultPort, envValues);
    await freePort(config.label, port);
  }
}

void main().catch((error) => {
  console.error(`[ports] ${error.message}`);
  process.exitCode = 1;
});
