# Toybox Math

A standalone camera math game for the Meta Global AI Developer Hackathon (Oct 27 - Nov 4, 2026). Solo entry.

Kids upload a photo of a stuffed animal, it becomes their avatar, and their hands become the tools for camera math games: Fruit Ninja math, ratio counting with real objects, and more, all powered by Meta's SAM 3.1 and Muse Spark.

See [SPEC.md](SPEC.md) for the full spec: modes, stuffy system, story and journey, tech approach, build plan, and open decisions.

## Run it

```bash
npm install
npm run dev   # http://127.0.0.1:5173/
npm run build # production build
```

## Status

Playable MVP loop with built-in fallbacks: stuffy upload + naming, trail map, tap-to-count Ratio Counting, pointer-slice Fruit Ninja Math (addition + multiples of 3), read-aloud, accessory unlock, localStorage progress. SAM 3.1 / Muse Spark go through `api/sam.js` once `META_MODEL_API_KEY` is set (see `.env.example` and `SPIKE.md`); without a key every game stays playable on fallbacks. See [PLAN.md](PLAN.md) and GitHub issues Step 1-10.
