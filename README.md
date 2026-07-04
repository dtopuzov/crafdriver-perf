# craftdriver-perf

Browser automation benchmarks comparing:

- craftdriver: default craftdriver APIs
- craftdriver optimized: WebDriver Classic mode with BiDi features disabled
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

| Scenario | craftdriver | craftdriver<br>optimized | selenium-webdriver | @progress/<br>kendo-e2e | WebdriverIO | Playwright |
|---|---:|---:|---:|---:|---:|---:|
| Startup | 2162.7 | 1700.6 | 1735.9 | 1726.5 | 2097.9 | 1438.7 |
| Navigate | 33.2 | 22.8 | 22.5 | 22.1 | 26.0 | 52.7 |
| Locate x10 | 124.4 | 124.5 | 125.5 | 126.9 | 192.6 | 101.2 |
| Click x10 | 433.0 | 406.6 | 409.6 | 411.2 | 482.7 | 349.5 |
| Keyboard | 97.3 | 94.4 | 95.3 | 92.2 | 154.2 | 79.4 |
| Combo flow | 359.8 | 345.3 | 411.0 | 295.7 | 395.8 | 198.8 |
| Wait visible | 97.6 | 96.5 | 265.7 | 97.0 | 116.9 | 68.6 |
| Heavy network | 199.5 | 136.3 | 267.6 | 136.4 | 168.5 | 230.2 |
| Screenshot | 54.0 | 56.6 | 52.6 | 56.6 | 50.9 | 50.0 |
