# Benchmark results (latest run per library)

## Run details

| library | version | n (startup / other) | file |
|---|---|---|---|
| craftdriver | 1.4.0 | 10 / 20 | craftdriver-2026-07-12T12-44-20-427Z.json |
| craftdriver-optimized | 1.4.0 | 10 / 20 | craftdriver-optimized-2026-07-12T12-46-31-397Z.json |
| selenium-webdriver | 4.45.0 | 10 / 20 | selenium-webdriver-2026-07-12T12-48-52-333Z.json |
| kendo-e2e | 5.0.5 | 10 / 20 | kendo-e2e-2026-07-12T12-55-20-821Z.json |
| webdriverio | 9.29.1 | 10 / 20 | webdriverio-2026-07-12T12-51-03-430Z.json |
| playwright | 1.61.1 | 10 / 20 | playwright-2026-07-12T12-53-09-648Z.json |

| | |
|---|---|
| Date | 2026-07-12 |
| Host | Intel(R) Core(TM) i7-4750HQ CPU @ 2.00GHz, 8 cores, 8GB RAM, darwin 24.6.0 |
| Node | v24.18.0 |
| Chrome (chromedriver-driven) | 150.0.7871.101 |
| craftdriver SHA | 95f1fda |

## Results (mean / p95 ms — ratio vs craftdriver mean in parentheses)

| scenario | craftdriver | craftdriver-optimized | selenium-webdriver | kendo-e2e | webdriverio | playwright |
|---|---|---|---|---|---|---|
| startup | 2167.7 / 2183.9 | 1732.1 / 1744.2 (0.80x) | 1757.8 / 1802.6 (0.81x) | 1734.6 / 1785.3 (0.80x) | 2136.1 / 2364.0 (0.99x) | 1427.6 / 1438.9 (0.66x) |
| navigate | 30.8 / 36.0 | 23.1 / 24.5 (0.75x) | 23.9 / 27.3 (0.78x) | 23.1 / 25.6 (0.75x) | 27.0 / 31.3 (0.88x) | 12.7 / 13.9 (0.41x) |
| locate x10 | 126.8 / 134.1 | 126.4 / 131.8 (1.00x) | 126.6 / 134.1 (1.00x) | 129.6 / 135.9 (1.02x) | 197.4 / 204.6 (1.56x) | 100.8 / 103.8 (0.80x) |
| click x10 | 423.2 / 454.0 | 416.9 / 428.4 (0.99x) | 416.0 / 421.9 (0.98x) | 417.3 / 423.3 (0.99x) | 483.6 / 508.8 (1.14x) | 352.9 / 366.3 (0.83x) |
| keyboard: type+tab+type+enter | 93.4 / 95.2 | 94.9 / 99.8 (1.02x) | 94.2 / 98.2 (1.01x) | 92.3 / 96.9 (0.99x) | 161.5 / 167.2 (1.73x) | 79.2 / 81.9 (0.85x) |
| combo: nav+fill+click+wait-visible+screenshot | 317.1 / 331.6 | 298.0 / 308.3 (0.94x) | 459.0 / 464.5 (1.45x) | 306.4 / 324.1 (0.97x) | 405.0 / 430.9 (1.28x) | 173.8 / 195.7 (0.55x) |
| wait for visible (delayed reveal) | 99.2 / 112.3 | 98.6 / 100.1 (0.99x) | 267.7 / 269.0 (2.70x) | 98.6 / 100.4 (0.99x) | 106.8 / 179.2 (1.08x) | 71.0 / 81.4 (0.72x) |
| heavy network: navigate+wait-visible | 200.6 / 225.8 | 140.9 / 143.0 (0.70x) | 268.2 / 272.0 (1.34x) | 136.6 / 139.9 (0.68x) | 172.6 / 177.2 (0.86x) | 176.2 / 242.6 (0.88x) |
| screenshot to disk (viewport) | 58.2 / 68.9 | 58.3 / 69.6 (1.00x) | 57.4 / 68.5 (0.99x) | 57.4 / 71.4 (0.99x) | 57.4 / 69.6 (0.99x) | 50.0 / 55.1 (0.86x) |
