import { CHROMEDRIVER_PATH, HEADLESS, WINDOW_SIZE_ARG } from '../../harness/config.ts';

export function createChromeCapabilities(): WebdriverIO.Capabilities {
  return {
    browserName: 'chrome',
    'wdio:enforceWebDriverClassic': true,
    'goog:chromeOptions': {
      args: [...(HEADLESS ? ['--headless=new'] : []), WINDOW_SIZE_ARG],
    },
  };
}

export function createWdioManagedChromeCapabilities(): { alwaysMatch: WebdriverIO.Capabilities } {
  return {
    alwaysMatch: {
      ...createChromeCapabilities(),
      'wdio:chromedriverOptions': {
        binary: CHROMEDRIVER_PATH,
      },
    },
  };
}
