# craftdriver-perf

Browser automation benchmarks comparing:

- craftdriver (bidi): default craftdriver APIs
- craftdriver (classic): WebDriver Classic mode with BiDi features disabled
- selenium-webdriver
- @progress/kendo-e2e
- WebdriverIO
- Playwright

All suites run against the same local fixtures, Chrome setup, and scenario
loop.

The benchmark covers common E2E automation work: startup, navigation, element
lookup, clicks, keyboard input, waits, network-heavy app readiness, combined
flows, and screenshots.

## Running The Benchmarks

```sh
npm install
export CHROMEDRIVER_PATH=~/.cache/craftdriver/chromedriver/<version>/mac-x64/chromedriver
npm run bench:fresh
```

`npm run bench:fresh` starts the fixture server, runs every benchmark variant,
and writes JSON results into `results/`.

The heavy-network scenario uses `fixtures/heavy-network.html`, which issues 96
cache-busted local payload requests in batches of 12 and reveals
`#network-ready` after the last payload has been parsed and rendered. Tune it
manually with query parameters such as `?requests=144&batch=8`.

```sh
npm run summary
```

This regenerates the full mean / p95 report at
[`results/summary.md`](results/summary.md).

## Latest Mean Results

Mean duration in milliseconds. Lower is better.

| Scenario | craftdriver<br>(bidi) | craftdriver<br>(classic) | selenium-webdriver | @progress/<br>kendo-e2e | WebdriverIO | Playwright |
|---|---:|---:|---:|---:|---:|---:|
| Startup | 2167.7 | 1732.1 | 1757.8 | 1734.6 | 2136.1 | 1427.6 |
| Navigate | 30.8 | 23.1 | 23.9 | 23.1 | 27.0 | 12.7 |
| Locate x10 | 126.8 | 126.4 | 126.6 | 129.6 | 197.4 | 100.8 |
| Click x10 | 423.2 | 416.9 | 416.0 | 417.3 | 483.6 | 352.9 |
| Keyboard | 93.4 | 94.9 | 94.2 | 92.3 | 161.5 | 79.2 |
| Combo flow | 317.1 | 298.0 | 459.0 | 306.4 | 405.0 | 173.8 |
| Wait visible | 99.2 | 98.6 | 267.7 | 98.6 | 106.8 | 71.0 |
| Heavy network | 200.6 | 140.9 | 268.2 | 136.6 | 172.6 | 176.2 |
| Screenshot | 58.2 | 58.3 | 57.4 | 57.4 | 57.4 | 50.0 |

Data measured with [craftdriver@1.4.0](https://www.npmjs.com/package/craftdriver).
