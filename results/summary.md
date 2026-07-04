# Benchmark results (latest run per library)

## Run details

| library | version | n (startup / other) | file |
|---|---|---|---|
| craftdriver | 1.0.1 | 10 / 20 | craftdriver-2026-07-05T20-48-01-071Z.json |
| craftdriver-optimized | 1.0.1 | 10 / 20 | craftdriver-optimized-2026-07-05T20-50-11-842Z.json |
| selenium-webdriver | 4.45.0 | 10 / 20 | selenium-webdriver-2026-07-05T20-52-30-757Z.json |
| kendo-e2e | 5.0.5 | 10 / 20 | kendo-e2e-2026-07-05T20-59-03-147Z.json |
| webdriverio | 9.29.1 | 10 / 20 | webdriverio-2026-07-05T20-54-41-068Z.json |
| playwright | 1.61.1 | 10 / 20 | playwright-2026-07-05T20-56-52-590Z.json |

| | |
|---|---|
| Date | 2026-07-05 |
| Host | Intel(R) Core(TM) i7-4750HQ CPU @ 2.00GHz, 8 cores, 8GB RAM, darwin 24.6.0 |
| Node | v24.18.0 |
| Chrome (chromedriver-driven) | 149.0.7827.201 |
| craftdriver SHA | e695142 |

## Results (mean / p95 ms — ratio vs craftdriver mean in parentheses)

| scenario | craftdriver | craftdriver-optimized | selenium-webdriver | kendo-e2e | webdriverio | playwright |
|---|---|---|---|---|---|---|
| startup | 2162.7 / 2203.7 | 1700.6 / 1757.2 (0.79x) | 1735.9 / 1746.1 (0.80x) | 1726.5 / 1747.3 (0.80x) | 2097.9 / 2334.9 (0.97x) | 1438.7 / 1448.1 (0.67x) |
| navigate | 33.2 / 41.9 | 22.8 / 25.4 (0.69x) | 22.5 / 24.5 (0.68x) | 22.1 / 26.2 (0.67x) | 26.0 / 30.7 (0.78x) | 52.7 / 53.8 (1.59x) |
| locate x10 | 124.4 / 130.7 | 124.5 / 130.3 (1.00x) | 125.5 / 131.3 (1.01x) | 126.9 / 133.0 (1.02x) | 192.6 / 202.7 (1.55x) | 101.2 / 104.4 (0.81x) |
| click x10 | 433.0 / 513.3 | 406.6 / 417.7 (0.94x) | 409.6 / 417.1 (0.95x) | 411.2 / 421.3 (0.95x) | 482.7 / 498.1 (1.11x) | 349.5 / 350.4 (0.81x) |
| keyboard: type+tab+type+enter | 97.3 / 102.5 | 94.4 / 100.5 (0.97x) | 95.3 / 98.2 (0.98x) | 92.2 / 96.0 (0.95x) | 154.2 / 160.0 (1.58x) | 79.4 / 81.9 (0.82x) |
| combo: nav+fill+click+wait-visible+screenshot | 359.8 / 372.7 | 345.3 / 361.2 (0.96x) | 411.0 / 415.7 (1.14x) | 295.7 / 306.8 (0.82x) | 395.8 / 412.2 (1.10x) | 198.8 / 200.4 (0.55x) |
| wait for visible (delayed reveal) | 97.6 / 105.5 | 96.5 / 98.8 (0.99x) | 265.7 / 267.5 (2.72x) | 97.0 / 99.0 (0.99x) | 116.9 / 178.2 (1.20x) | 68.6 / 79.9 (0.70x) |
| heavy network: navigate+wait-visible | 199.5 / 220.3 | 136.3 / 142.8 (0.68x) | 267.6 / 273.5 (1.34x) | 136.4 / 140.9 (0.68x) | 168.5 / 175.1 (0.84x) | 230.2 / 272.6 (1.15x) |
| screenshot to disk (viewport) | 54.0 / 67.6 | 56.6 / 69.3 (1.05x) | 52.6 / 67.0 (0.97x) | 56.6 / 71.7 (1.05x) | 50.9 / 53.4 (0.94x) | 50.0 / 53.5 (0.93x) |
