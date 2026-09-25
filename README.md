# LLM website demos

A gallery of website-generation output from every model in Jason's day-0 benchmark runs. Each
model was given the same battery of website prompts (hand-drawn journal, risograph print site,
Swiss/brutalist/art-deco microsites, a Virtual Boy retro page, and a few model-specific extras) as
part of a full benchmark campaign. Every site is a single self-contained `index.html` with no
build step and no framework: open it directly in a browser, or browse the gallery live via GitHub
Pages.

Sites are unedited model output, straight from the benchmark results tree, except cells whose
gallery badge says otherwise: **Self-fix** (the model was sent its own error and given a repair
turn) or **Hand-patched** (a human applied a small fix, recorded in that cell's `meta.json`).
**Unvalidated** means the take was published but never passed an execution/visual audit; **Audited**
means it did.

## Models

| Model | Variants | Sites |
|---|---|---|
| Claude Fable 5.1 | api | 3 |
| DeepSeek V4.1 Flash | api | 4 |
| GLM 5.3 Flash | fp8 | 16 |
| Muse Glimmer 30B | bf16, q8 | 11 |
| Muse Spark 1.3 | api | 4 |
| Ox Alpha | api | 5 |
| Qwen 3.6 27B | bf16, q4, q8 | 18 |
| Qwen 3.8 27B | bf16, nvfp4, q8 | 17 |
| Qwen 3.8 Max Preview | api | 6 |
| Qwen 3.8 Flash Next | fp8 | 8 |

That's 92 website cells across 10 models, plus the original 32-demo Qwen 3.8 27B release-day
gallery this repo started as (kept at the repo root, unchanged).

Astra (`gpt-6-astra` via the Codex CLI) ran its own self-benchmark, but its serving session never
reached a verified-ready state and its outputs stayed in campaign staging rather than the published
results tree, so it has no cells in this gallery.

## Layout

```
sites/<model>/<variant>/<cell>/index.html   # one benchmarked cell, plus its meta.json and any assets
<original-qwen-cell>/index.html             # the original Qwen 3.8 27B demos, unchanged
mimo-flash-website-journey/index.html       # a one-off showcase, outside the benchmark battery, with a video preview in thumbs/
```

## How these were generated

Each cell comes from a day-0 benchmark campaign: a model is served behind an OpenAI-compatible
endpoint (a rented GPU pod, a quantized local build, or a hosted API) and given the same prompt
from the campaign's website battery, with a fixed seed and no system prompt beyond the benchmark
harness defaults. The raw output is published to the results tree immediately; an audit pass then
flags whether it renders cleanly. A `meta.json` sits alongside each `index.html` with the serving
details (model, precision/variant, seed, token counts, timing) and audit outcome.

Live gallery: https://loktar00.github.io/llm-website-demos/

Source: https://github.com/loktar00/llm-website-demos


## Prompts

The prompts themselves are not published here; they are available to subscribers only.
