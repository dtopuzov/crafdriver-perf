import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import net from 'node:net';
import { BASE_URL, CHROMEDRIVER_PATH } from '../../harness/config.ts';
import { createChromeCapabilities } from './capabilities.ts';
import { transformRequest } from './wdio-compat.ts';

const CHROMEDRIVER_PORT = 4321;

let chromedriverProcess: ChildProcessWithoutNullStreams | undefined;

process.env.WDIO_SKIP_DRIVER_SETUP = '1';

function normalizeSessionCapabilities(capabilities: WebdriverIO.Capabilities): void {
  const caps = capabilities as WebdriverIO.Capabilities & {
    alwaysMatch?: WebdriverIO.Capabilities;
    firstMatch?: WebdriverIO.Capabilities[];
  };
  const browserCaps = caps.alwaysMatch ?? { ...caps };

  for (const key of Object.keys(browserCaps)) {
    if (key.startsWith('wdio:') && key !== 'wdio:enforceWebDriverClassic') {
      delete browserCaps[key as keyof typeof browserCaps];
    }
  }

  for (const key of Object.keys(caps)) {
    delete caps[key as keyof typeof caps];
  }
  caps.alwaysMatch = browserCaps;
}

async function waitForPort(port: number, timeoutMs = 10000): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for chromedriver on port ${port}`);
}

function canConnect(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./bench.wdio.spec.ts'],
  maxInstances: 1,
  capabilities: [createChromeCapabilities()],
  onWorkerStart(_cid, capabilities) {
    normalizeSessionCapabilities(capabilities as WebdriverIO.Capabilities);
  },
  beforeSession(_config, capabilities) {
    normalizeSessionCapabilities(capabilities as WebdriverIO.Capabilities);
  },
  async onPrepare() {
    chromedriverProcess = spawn(
      CHROMEDRIVER_PATH!,
      [`--port=${CHROMEDRIVER_PORT}`, '--allowed-origins=*', '--allowed-ips=0.0.0.0'],
      { stdio: 'ignore' }
    );
    await waitForPort(CHROMEDRIVER_PORT);
  },
  onComplete() {
    chromedriverProcess?.kill('SIGKILL');
    chromedriverProcess = undefined;
  },
  logLevel: 'warn',
  baseUrl: BASE_URL,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  transformRequest,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 600000,
  },
  autoCompileOpts: {
    autoCompile: true,
  },
};
