# SAM 3.1 Spike (Step 2) - RUN, PASS with notes

API: POST https://api.meta.ai/v1/responses, model sam-3.1, Bearer MODEL_API_KEY/META_MODEL_API_KEY (dev.meta.ai). Streamed output: `<|box;x1=..;y1=..;x2=..;y2=..|><|mask;...|>` per instance, coords 0-1000 scale. Data-URI images accepted (browser uploads work directly).

## Results (test: Britannica cat photo, prompt "cat")
| Check | Bar | Result |
|---|---|---|
| Auth + endpoint | 200 | 200, key from .env.local works |
| Latency | <8s count / <5s cutout | 1.5-2.2s total |
| Count accuracy | exact on separated objects | count=1 for 1 cat, box [3,5,888,606] |
| Data-URI upload | accepted | yes, same result as URL |

## Notes / remaining
- Mask payload is encoded text; app currently crops to the SAM box (real cutout region). Pixel-mask decode is a later polish item (docs: /docs/sam/reading-segmentation).
- URL images must be fetchable by Meta's service (some hosts rejected: unsplash/wikimedia thumb). Data URIs avoid this.
- .env contains a 19-char placeholder literal; real key is in .env.local. Loader ignores keys <30 chars. Delete .env when convenient.
