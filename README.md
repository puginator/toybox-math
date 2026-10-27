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

Live: https://toybox-math.pages.dev/

The Nightstand Adventure: a SAM 3.1 camera math game. Upload a stuffy photo and SAM cuts it out (pixel mask via Meta's `@meta-sam/parser`) to become your companion; Muse Spark 1.3 writes the story. Nine stops on a winding bedroom map - counting real objects, slicing numbered toys, Show Me, Build-a-Number, Balance, Estimation Jar (SAM counts the real jar), Pattern Path, SAM Scavenger Hunt, SAM Spotlight (SAM follows your toy across 5 photos) - plus the Warm Lamp finale, portrait puzzle, prizes, confetti. Fallbacks (tap blocks, sprite fruit, handwritten story) keep every game playable with no API key. Run `npm run test:cutout` for the SAM mask regression check. See [PLAN.md](PLAN.md) and GitHub issues Step 1-10.
