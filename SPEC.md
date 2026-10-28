# Toybox Math

A standalone camera math game for the Meta Global AI Developer Hackathon (Cerebral Valley, Oct 27 - Nov 4, 2026). Solo entry.

One line: kids upload a photo of a stuffed animal, it becomes their avatar, and their hands become the tools for camera math games.

## Track

Build for Your World: Meta's models in a domain the builder knows firsthand (kids' math games), making something possible that wasn't before.

## Audience and kid rules

- Players: young kids learning early math (counting, addition, ratios, times tables).
- No fail states. Wrong answers get a cheerful retry, never a life lost or a timer running out.
- Read-aloud everywhere: every problem and story beat is spoken as well as shown.
- Streaks and progression are cosmetic only. Nothing that affects math difficulty is locked behind a paywall or a grind.
- Camera frames are processed live and never stored. The only photo kept is the stuffed animal the player uploads.

## Core loop

1. Upload a photo of a stuffed animal. SAM 3.1 segments it out of the background and it becomes the player's avatar and companion.
2. The avatar travels a story trail. Each stop on the trail is a camera math game.
3. Finishing games advances the story and unlocks more stuffies and accessories.
4. The same avatar appears in every mode: it cheers, holds the ratio boxes, and celebrates wins.

## Stuffy system

- Upload: one photo per stuffy, SAM cutout, player names it.
- Persistent companion: the avatar follows the player across all modes.
- Progression (locked Oct 26): the first stuffy unlocks fast through a short rescue quest in the first session, never a long grind before seeing your own toy. After that, more stuffy slots unlock with play, and each stuffy earns cosmetic accessories (hats, capes, glasses).

## Game modes

### Core

**Ratio counting.** Point the camera at real objects (blocks, toys, fruit). SAM segments and counts them, and the player sorts the counts into ratio boxes (for example, red to blue is 3 to 2). Turn-based, no real-time loop, the most SAM-native mode.

**Fruit Ninja math, with real objects.** Instead of sprite fruit, the slicing targets are real objects SAM 3.1 segments from the camera feed. The game asks the player to put a few things on the table (toys, blocks, cups); SAM segments each one and a number label is overlaid on it. The player's hand is the blade: SAM segments the hand and the hand's path slices the object carrying the right answer. Objects stay put until sliced, so there is never a "you ran out of time" moment. Math variants:
- Slice the answer: a problem shows (7 + 5 = ?), objects carry candidate answers, slice the right one.
- Slice to build: collect 3 blocks and 4 blocks, then answer 7.
- Slice the set: times tables version, slice all multiples of 3 and leave the rest.
- Catch variant: same setup, but the hand is a basket and the player catches the right answer. Gentler for younger kids.
- Room-scan variant (stretch, not the default): instead of staged objects, SAM scans whatever is in the room and picks targets from it. More magical, less predictable, so it waits until staged slicing is solid.
- Fallback: if SAM finds too few objects on the table, the game falls back to sprite fruit so the round never stalls.

### Extra modes (same segment-and-count pipeline, cheap adds once counting works)

- **Show me:** "show me 7" with fingers, blocks, or toys. SAM counts what is held up.
- **Build the number:** arrange real blocks to make 10 (6 + 4). SAM counts and verifies.
- **Sort by color or size:** SAM segments toys on the table, player sorts them into bins. Comparison language: more, fewer, bigger, smaller.
- **Balance sides:** two zones on camera, SAM counts each side, which side has more?
- **Estimation jar:** player estimates first, then SAM counts the pile and reveals. Estimation is a real skill almost no kids' app teaches.
- **Pattern copy:** SAM sees a row of colored blocks, player copies the pattern.

## Story and journey

- The trail map is the journey: chapters with stops, each stop a game, finishing a chapter rescues a stuffy or unlocks an accessory.
- Muse Spark (Meta Model API) writes the story layer, and only the story layer: chapter intros, quest text, celebration lines. Nothing else in the game waits on a model call.
- Chapter intro: one short intro per rescued stuffy, 2 to 4 sentences in simple read-aloud language: why this stuffy needs rescuing, what its little world looks like, what the quest is. Tailored to the stuffy's kind and color.
- Quest text: the prompts kids see at each stop (example shape: help a named stuffy find a counted set of objects to rebuild something). Written for the trail, not improvised.
- Celebration lines: a small bank of variants per chapter so praise does not repeat every time a chapter clears.
- Personality: each stuffy gets a trait (brave, silly, shy) that colors its lines. Accessory unlocks can add new lines for that stuffy later.
- Caching rule: one cached call per chapter, generated once and stored with the chapter, reused every session. Never per frame, never mid-game, so games never wait on the model. Cost is fractions of a cent per story, and because stories are cached they are reviewable: nothing is improvised live in front of a kid.
- Prompt constraints: age-appropriate, no scary villains, no personal data. The story prompt gets the stuffy's kind and color, never the kid's photo or anything about the kid.
- The story is a narrator, not a chatbot. The game tells the story, the kid plays. No open-ended chat. This keeps the game clear of the hackathon's banned "simple AI for Education chatbot" category.

## Tech approach

- Web app with camera access. No install for judges to open, same as Math Buddies' browser play.
- SAM 3.1 through the Meta Model API: stuffy cutout, object segmentation and counting, hand segmentation.
- Muse Spark through the Meta Model API: story and quest text.
- Fruit Ninja real-time loop: SAM as the anchor plus a lightweight on-device hand tracker for frame-to-frame play. SAM per frame over an API is not a 60fps slicing loop, so SAM segments the hand at calibration and whenever tracking is lost, and the tracker follows it in between. Demo at a table with decent lighting and one hand in frame.
- The hackathon rule is to incorporate Meta's models, not to use only them. Hand trackers, game engines, and other libraries are fine alongside SAM and Spark.

## Hackathon compliance

- Repo public, new work only. Standalone game, not built on Math Buddies code, so there is no "what's new vs existing" ambiguity.
- 3-minute demo video highlighting only what was built during the event.
- Not a banned category: not a nutrition coach, not a simple image analyzer, not an education chatbot, not a medical advisor.
- Submission due Wed Nov 4, 2026, 6:00 PM PT via the Cerebral Valley platform.

## Build plan (Oct 27 - Nov 4)

- Oct 27-28: scaffold plus SAM spike. Photo upload to stuffy cutout working, ratio counting prototype working. Validate SAM latency and counting accuracy on real photos before building on top of it. Claim the $150 Meta Model API credits day one, since distribution runs in batches.
- Oct 29-30: Fruit Ninja prototype, SAM anchor plus tracker, math layer, real-object slicing, kid rules.
- Oct 31-Nov 2: lighter stretch (Oct 31 is Halloween). Progression (first rescue, accessories), polish, second mode only if the first two are stable.
- Nov 3: full playtest, 3-minute demo video, repo public, submission page.
- Nov 4: buffer and submit by 6:00 PM PT.

## Open decisions

- Fruit Ninja targets: staged objects on the table (proposed default) vs room scan. Staged is controllable and demo-reliable; room scan is the wow stretch.
