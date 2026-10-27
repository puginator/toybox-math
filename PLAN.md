## Goal

Build Toybox Math for the Meta Global AI Developer Hackathon (Oct 27–Nov 4, 2026; submit Nov 4 by 6:00 PM PT, target 3:00 PM PT): a browser camera math game where a child's stuffed-animal photo becomes their avatar, SAM 3.1 segments real table objects, and their hand slices/counts answers. Solo build, based on [SPEC.md](SPEC.md).

Locked choices: two modes polished (Ratio Counting + Fruit Ninja Math), Vite + React + TypeScript static site, SAM spike plus fallback first.

## Success Criteria

- Live public URL, no install; repo public with only hackathon-period work.
- MVP loop in ~5 minutes: upload stuffy photo → cutout → name it → trail map → Chapter 1 story naming the stuffy → Ratio Counting round → Fruit Ninja Math round → accessory unlock the stuffy wears.
- Ages 5–8 scope stated in-app: counting to 20, addition to 20, multiples of 2/3/5.
- No fail states, no timers; every problem and story beat read aloud; wrong answers get a cheerful retry.
- Camera frames never stored; only the uploaded stuffy photo is kept (localStorage). Stated on-screen and in the submission.
- 3-minute demo video per the script in Step 8; submission explicitly states it is a narrator-led game, not an education chatbot.

## Approach

Spec strengths to lean on: real objects as game pieces (only possible with SAM-class segmentation), the stuffy-to-avatar hook in the first 10 seconds, kid rules as a design point of view, staged table objects for demo reliability, and SAM-anchors-plus-tracker instead of per-frame SAM.

Architecture (browser-only plus one small serverless proxy):

- Camera: `getUserMedia` into video + canvas overlay.
- SAM client: Meta Model API via a serverless proxy (~30 lines, holds the API key; keys never ship in the client) for stuffy cutout, object segmentation/counting, and hand anchor at round start. Every call has an 8-second timeout and a fallback.
- Hand tracking: MediaPipe Hand Landmarker for Web, on-device, drives the blade/basket frame-to-frame. SAM re-anchors only at round start or when tracking is lost.
- Game loop: Canvas 2D; React for menus, HUD, trail, and story screens.
- Speech: Web Speech API `speechSynthesis` for all problems/story. Test voice quality in Step 3; pick one voice, rate ~0.95.
- Story: Muse Spark generated at session start and cached, never mid-game; 3 hand-written fallback chapters ship so the game works with zero API.
- State: localStorage only (stuffy cutout data URL, name, trail progress, accessories). No backend, no accounts.

Spec gaps this plan closes: pin ages 5–8 (above); ship "ratio" as comparison counting first ("3 red, 2 blue — which has more?") with true ratios as the advanced tier, since ratios alone are typically age 9+; add tap-to-fix counting ("tap a missed block") so SAM miscounts become play, never an error; fix the demo table setup (plain mat, 5–8 chunky separated high-contrast objects, decent lighting, one hand) and record the video in that exact setup.

## Steps

1. **Setup and credits.** Claim the $150 Meta Model API credits in the first hour. Scaffold Vite + React + TS, deploy hello-world to a static host so a live URL exists in Step 1. Build the API-key proxy. Validation: live URL loads; proxy returns a test SAM/Spark response with the key server-side only.
2. **SAM spike (go/no-go, see Risks).** Test 5 real photos (stuffy on couch, 6 blocks on table, hand over table) for cutout quality, object count accuracy, and hand mask; record results in `SPIKE.md`. Validation: cutout clean in <5s; count exact on separated objects in <8s; each failure maps to its named fallback, not a redesign.
3. **Stuffy flow + Ratio Counting.** Upload → SAM cutout → name → localStorage; capture → SAM count → sort into ratio/comparison boxes → celebrate or cheerful retry, with tap-to-fix. Validation: one full ratio round completed start-to-finish with no developer help; a deliberate miscount is recoverable by tapping.
4. **Fruit Ninja core.** MediaPipe hand tracking in the canvas loop; SAM labels staged table objects once per round; problem generator (addition to 20); hand path crossing a labeled object slices it. Validation: hand slices a labeled object; right and wrong slices both resolve cheerfully with speech.
5. **Fruit Ninja variants + fallback.** Add Slice the Set (multiples of 2/3/5) and the sprite-fruit fallback when SAM finds fewer than 3 objects; read-aloud on every problem. Validation: both variants playable end-to-end; covering the camera/table objects triggers the sprite fallback and the round never stalls.
6. **Trail and story.** Trail map with Chapter 1, first-rescue quest (first stuffy unlocks fast, per spec), Muse Spark chapter text generated at session start and cached, hand-written fallbacks. Validation: trail → game → trail loop works; story names the stuffy; blocking the Spark API still yields a full chapter.
7. **Progression and polish.** Accessory unlock on chapter clear (hat the stuffy wears), second stuffy slot only if time, WebAudio pop sounds, celebration animations. Validation: full MVP loop from Success Criteria played in one sitting (~5 min) by someone other than the builder if possible.
8. **Feature freeze + demo script lock.** If and only if the MVP is stable, add one stretch in this order: Show Me → Build the Number → Balance Sides. Otherwise polish only. Record the 3-minute video script: 0:00 hook (real stuffy → upload → cutout → named avatar), 0:20 why-now (SAM segments the table; Ratio Counting live), 0:50 Fruit Ninja Math (spoken "7 + 5 = ?", hand slices 12, one cheerful wrong-answer retry, brief Slice the Set), 2:00 trail + Spark intro naming the stuffy + hat unlock, 2:30 kid rules and privacy close ("built solo for the hackathon on SAM 3.1 + Muse Spark"). Validation: freeze decision and stretch go/no-go written down; bug list triaged to demo-blockers only.
9. **Video and submission draft.** AM: demo-blocker fixes only. PM: record the video (two takes minimum, keep a wrong-answer moment) in the tested table setup; write submission text (Build for Your World track, ages 5–8, not-a-chatbot statement, privacy statement, how SAM 3.1 + Muse Spark are used); README with live URL, run instructions, and "built during the event" scope; repo public. Validation: video + submission + public repo all exist before the final buffer step.
10. **Buffer and submit.** Re-watch video, re-read submission, submit ahead of the deadline via the Cerebral Valley platform. No code changes after submission except critical fixes.

## Validation Plan

- Per-step validation checks are listed in Steps 1–10; a step is done only when its check passes on the deployed URL (or localhost for pre-deploy spike work), not in code alone.
- Highest-risk validation: the SAM spike (Step 2). It gates the architecture, so it runs before any game code.
- End-to-end check (Step 7 and again Step 9): fresh browser profile, camera allowed, complete the full MVP loop; then repeat with the Meta API unreachable (proxy off) to prove fallbacks keep every round playable.
- Kid-rules check: force a wrong answer in each mode and a SAM miscount; confirm no timer, no life loss, spoken encouragement, and a retry path in all cases.
- Submission check (Step 9): repo public, live URL opens with no install, video is ≤3 minutes and shows only hackathon-built work.

## Risks / Open Questions

- **SAM 3.1 via Meta Model API is unverified** (endpoint shape, latency, rate limits, hand-segmentation availability, credit timing). Mitigation: Step 2 spike with per-feature fallbacks — cutout fails → center-crop blob mask; counting fails → tap-to-count for Ratio and sprite fruit for Fruit Ninja; hand anchor fails → MediaPipe alone. Any single failure degrades one feature, not the app. Exact API behavior stays conditional until the spike records it in `SPIKE.md`.
- **Counting accuracy:** overlapping or same-color objects merge. Mitigation: separated chunky objects in the demo setup plus tap-to-fix (Step 3).
- **Muse Spark story quality/latency:** mitigated by session-start generation, caching, and hand-written chapters (Step 6).
- **Kill list (not building):** room-scan mode before the Step 8 gate, open-ended stuffy chat, accounts/cloud saves, multiplayer, custom music production, difficulty settings screens, more than 2 stuffy slots, any extra mode before the Step 8 gate.
- Open questions: None. Room-scan vs staged is resolved (staged default, room scan only after the Step 8 gate); the remaining unknowns are factual (SAM API behavior) and are answered by the Step 2 spike rather than by decision.

## Sources

- [Vite Getting Started](https://vite.dev/guide/)
- [MediaPipe Hand Landmarker for Web](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js)
- [MDN SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
