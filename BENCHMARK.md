# Initial build-time extraction benchmark

Measured locally on macOS (Node 24.21.0), November 19, 2026. Three fresh build
processes; filesystem caches may be warm. Dependency installation, network,
and Netlify deployment time are excluded. Netlify timings may differ.

Input: **555 snapshots**, **137,991,709 bytes** (~138 MB).
Output: **17,021 per-snapshot unique URL observations**, **2,897 distinct URLs**.
All snapshots yielded at least one matching link.

| Run | Extraction wall time | Entire build wall time | Peak process RSS |
| --- | ---: | ---: | ---: |
| 1 | 3.806 s | 4.67 s | 408.3 MiB |
| 2 | 3.897 s | 4.40 s | 426.0 MiB |
| 3 | 3.584 s | 3.96 s | 430.0 MiB |

Median: **3.806 s extraction**, **4.40 s total build**.

Generated JSON: **1,079,675 bytes**. Generated table HTML: **1,420,294 bytes**.
Verified 2,897 table rows, matching the JSON record count, with no duplicate URLs.

The Origami build invokes extraction once, sharing its result between HTML and
JSON generation. Parsing is sequential, limiting simultaneous DOM retention;
RSS still reflects V8 allocation and garbage collection, not just one DOM.

Recommendation: retain build-time extraction. At this archive size, avoiding
roughly four seconds of work does not justify checked-in derived JSON or cache
invalidation rules. Re-measure as the archive grows or if Netlify builds become
slow. No parsing compute is required when visitors read the static outputs.

Reproduce with `npm run measure:extraction` or `/usr/bin/time -l npm run build`.
The macOS `time` command reported a sandbox-restricted `kern.clockrate` lookup;
its wall time and the Node memory/timing measurements above were still emitted.
