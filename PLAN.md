# Chord Coach: plan

A phone app for the Note 9 that sits on the keyboard's music stand. It **listens** through the mic, names every chord you play, shows where it goes, and suggests what can come next, until you no longer need it.

> **Mic test, 2026-11-24:** `mictest.html` on your keyboard got chords mostly right. So the mic is the input: no cable needed, and the phone can charge while you play.

---

## 1. The goal

"Play freely" means that from any chord you know which chords can naturally come next. That is a small, learnable thing. In any key there are 7 chords and about a dozen common moves between them. You don't need songs or lessons, only many repetitions of those moves, each one explained in a couple of words.

You're starting from zero: no chord names, no note names. So the app **always shows the keys**, never just a name.

The app does three things, and only these:

1. **Names** whatever you play and shows it on a keyboard.
2. **Suggests** the next chord and says *why* in a couple of words.
3. **Fades out.** Hints step back as you improve, until the app only listens and tells you how natural your move was.

The one idea it keeps repeating, under every chord:

**Home → Away → Tension → Home**

| Job         | Major key       | Minor key       | Feels like              |
|-------------|-----------------|-----------------|-------------------------|
| **Home**    | I, vi, (iii)    | i, III          | rest                    |
| **Away**    | IV, ii          | iv, VI, ii°     | leaving home            |
| **Tension** | V, vii°         | V, VII          | wants to go back home   |

Once you have this idea, free play is just choosing where to go next on that loop. The roman numerals sit beside it in small type, for when you want them.

What the app does **not** have: songs, lessons, scores, streaks, accounts.

---

## 2. Core loop: practise, then move on when you're ready

Changed 2026-11-24, after your feedback. Before, the app jumped to a new chord every time you played, which was too fast.

```
PRACTISE one chord (coloured keys, fingers) ──► play it, dots fill ●●○
        │ after 3 plays
        ▼
NEXT chord appears in pink (keys + name), plus 2 alternatives to tap
        │ keep practising as long as you like…
        ▼
play the pink chord ──► it becomes the one you practise (●○○) ──► repeat
```

- **A different chord once** (a slip, or the mic mishearing): it's named in "You played", and nothing else changes.
- **The same different chord twice in a row:** the app switches to practising that chord, with 2 plays already counted. You can still wander off and it follows.
- Nothing is ever "wrong".

**Hints** (tap to cycle) sets how much of the next chord you see:

| Hints    | What happens                                                         | When              |
|----------|----------------------------------------------------------------------|-------------------|
| **Keys** | Next chord's name + pink keys after 3 plays                          | start here        |
| **Off**  | Free play: no practising; the app follows every chord, names it, rates the move | the goal |

Moving from Keys to Off is your progress.

**Level** (tap to cycle) sets how many notes you play:

| Level      | Jazz                                           | Pop                    |
|------------|------------------------------------------------|------------------------|
| **Easy**   | left pinky on the root + right hand 3rd & 7th (2 notes, "shells") | right-hand triad only |
| **Medium** | left root + right hand 3 notes above the root  | left root + right triad |
| **Full**   | left root + 4-note rootless jazz voicing       | left root + right triad |

---

## 3. Music logic

### 3.1 Hearing what you play (microphone): built and tested in `listen.js`
- The phone mic, with Android's voice processing (echo cancellation, noise suppression, auto-gain) turned off so held notes don't get filtered away.
- On start it measures the room for 1 second; you stay quiet.
- A **strike** is a sudden jump in loudness. After one, the app waits about 0.2 s for a clean slice of the new sound, then names it. That's the small delay you feel.
- **How it names a chord:** the sound is split into frequencies and folded into the 12 note names (C … B). That pattern is compared with each chord's expected pattern, including a piano's natural overtones, and the closest one wins.
- It only names a chord when it's sure (score ≥ 0.85). Otherwise nothing changes; it never guesses.
- A single key counts as a note, never a chord.
- Tuning knobs (constants in code): strike sensitivity, noise gate, certainty, retry time. `mictest.html` stays in the repo for re-tuning.
- **Limits:**
  - can't tell inversions or which octave you played in
  - broken (arpeggiated) chords aren't recognized; strike the chord
  - TV or talking can confuse it
  - the keyboard's rhythm and accompaniment must be off

### 3.2 Chord set and spelling
- **Style: Pop** — major, minor and diminished triads.
- **Style: Jazz** (default; covers bossa nova) — maj7, 6, m7, m6, 7, m7♭5, dim7, plus 9th/13th versions the mic may hear (Cmaj9, G13).
- Detection compares chord *families* (Cmaj9 counts as Cmaj7, G13 as G7).
- The mic also finds your **left-hand bass note** (lowest strong note below middle C), which settles look-alikes: A + C E G is Am7, C + E G A is C6.
- It leans slightly toward the chord it just suggested.
- Spelling follows the key (B♭ in F, A♯ in B). Roots from outside the key are flats (D♭7, B♭7), except passing diminished chords (C♯dim7).

### 3.3 Figuring out the key
- Score all 24 keys over the **last 6 chords**, with newer chords counting more:
  - +1 if the chord belongs to the key
  - +1.5 if it is the key's home chord
  - +1 for the current key (stickiness, so the key doesn't flip back and forth)
- The very first chord is treated as home: C → C major, Am → A minor.
- Minor keys include major **V** (E in A minor), so E → Am makes sense to the app.
- The key is shown in small type and changes on its own when you wander.

### 3.4 Suggesting the next chord
A move table with weights: **3** strong, **2** common, **1** occasional.

**Major key**

| From | Strong (3) | Common (2) | Occasional (1) |
|------|------------|------------|----------------|
| I    | IV, V      | vi, ii     | iii            |
| ii   | V          | IV         | iii            |
| iii  | vi         | IV         | ii             |
| IV   | V, I       | ii, vi     | iii            |
| V    | I          | vi         | IV             |
| vi   | IV         | ii, V      | iii            |
| vii° | I          | –          | iii            |

**Minor key**

| From | Strong (3)  | Common (2) | Occasional (1) |
|------|-------------|------------|----------------|
| i    | iv, VI, VII | V, III     | –              |
| ii°  | V           | –          | –              |
| III  | VI          | iv, VII    | –              |
| iv   | V, i        | VII        | –              |
| V    | i           | VI         | –              |
| VI   | VII         | III, iv    | ii°            |
| VII  | III, i      | VI         | –              |

- **Next** (big) is the strongest move. A tie goes to the chord you played least recently. That spreads your practice and stops the I–V–I–V ping-pong.
- **Alternatives** (two small chips) are the next two best moves. Tapping one makes it the target.
- **Why** label: the target's job plus a few named moves, e.g. V→I *"home: strongest pull"*, IV→I *"soft landing"*, V→vi *"fake-out"*, ii→V *"sets up home"*, vi→IV *"pop staple"*.
- **Chord outside the key**: if it is major and its resolution a 5th down is in the key, suggest that (E → Am in C). Otherwise suggest home (I), then IV.
- **Rating your move** (always shown): *strong · common · occasional · unusual · outside the key*.

### 3.5 Both hands, with fingers
- **Left hand (blue):** pinky (5) on the root, in the octave below middle C.
- **Right hand (orange):** a close voicing starting between middle C and the B above it.
  - **Jazz** uses rootless voicings: 3-5-7-9 or 7-9-3-5, and 3-13-♭7-9 for dominants.
  - **Pop** uses triads.
- **Voice leading:** each new chord picks the shape closest to the last one, so the hand barely moves. A ii–V–I is Dm9 F A C E → G13 F A B E → Cmaj9 E G B D.
- **Finger numbers** on every key: 1 thumb … 5 pinky. Four notes are fingered 1-2-3-5; three notes are 1-3-5, or 1-2-5 when the bottom two notes are close.
- Three octaves are drawn, from the C below middle C. Every C is labelled, and middle C says "mid C".
- The mic can't see which keys you pressed, so "You played" shows the app's own voicing of that chord.

---

## 4. UI / UX

**Physical setup:** Note 9 in landscape on the music stand, about 60 cm from your eyes. Usable screen is **740 × 360 CSS px**. Upright also works: Next, then the big keyboard, then what you played. Your hands are on the keys, so the app runs on what you play; touch is only for Hints and settings.

```
┌────────────────────────┬─────────────────────────────────────────────┐
│ YOU PLAYED             │ NEXT                                          │
│ Am    home · vi        │ F       away · IV            or  C   Dm      │
│ ┃▌┃▌┃┃▌┃▌┃▌┃ (A C E)    │ "pop staple"                                  │
│ C → Am  common move    │                                               │
├────────────────────────┴─────────────────────────────────────────────┤
│  ┃▌┃▌┃ ┃▌┃▌┃▌┃ ┃▌┃▌┃ ┃▌┃▌┃▌┃ ┃     big keyboard, 2 octaves              │
│  C        ●F  ●A  ●C                ● = keys of NEXT, orange, named     │
├──────────────────────────────────────────────────────────────────────┤
│ Key of C major    ● listening                       [Hints: Show]  ⚙  │
└──────────────────────────────────────────────────────────────────────┘
```

**Visual rules**
- **The big keyboard shows only the Next chord**: orange keys with note names. "You played" gets its own small one-octave keyboard, so the two never overlap.
- **Playing the target**: its keys turn green with a ✓ for 250 ms, so it isn't signalled by colour alone.
- **Chord names in lead-sheet style:** huge root letter (~110 px, bold), quality as a smaller raised suffix: A**m**, B**dim**.
- **One typeface** (system Roboto) in three sizes: 110 / 28 / 18 px. Nothing smaller than 18 px, because it's read from arm's length.
- **Colour:** dark background (#121212), off-white text, one amber accent for targets, green for correct.
- **What it doesn't have:** gradients, shadows, cards, emojis, glows, confetti, or animation beyond a 150 ms fade.

**States**
| State | Screen |
|---|---|
| First open | Big "Start" (Chrome needs one tap before it can use the mic), then 1 s "stay quiet" while it measures the room. Next shows **C** (all white keys). |
| Single key | Shown as a note, not a chord: `C (one note)` in grey |
| Unclear sound | Nothing changes; it never guesses |
| Played the chord you're practising | Keys flash green, one more dot fills (●●○); after 3 the next chord shows in pink (keys it shares with this one get a pink stripe: that finger stays) |
| Played the pink chord | It becomes the one you practise |
| Played something else | Named in "You played"; twice in a row switches to practising it |
| Mic blocked | One line saying how to allow it in Chrome |

**Controls:** three buttons in the bottom bar, all remembered between sessions.
- **Style:** Jazz / Pop. Changing it starts over on C.
- **Level:** Easy / Medium / Full.
- **Hints:** Next: keys / Free play. (A name-only middle setting was removed on 2026-11-24: it hid the keys and was too easy to switch on by accident.)

**Then** (once unlocked) shows the best move, plus two alternatives you can tap:
- the next-best chord from the key
- one colour move from outside it (secondary dominant, tritone sub, backdoor, bossa lift)

---

## 5. Technical

### Decision: a web app (PWA) in Chrome, listening through the mic
- It works with any keyboard and needs no cable. The phone's USB port stays free for charging.
- No Android Studio, no APK sideloading. You update with `git push` and reload.
- If the mic's limits ever get in the way, a USB cable can be added later. Chrome can read a keyboard's exact notes over USB through Web MIDI, and the rest of the app wouldn't change.

### Phone
- Chrome was removed by the debloat and restored on 2026-11-24 with `../restore.sh com.android.chrome`. It's now Chrome 157.
- The app loads from GitHub Pages, so the Mac isn't needed. For local testing, serve this folder and run `adb reverse tcp:8000 tcp:8000`, then open `localhost:8000` on the phone.

### Stack: no framework, no build step, no dependencies
```
chord-coach/
  index.html       the app: markup + CSS
  app.js           mic loop, state, rendering (SVG keyboards)
  listen.js        sound → chord             (done)
  theory.js        key, suggestions, spelling
  listen.test.js   node checks               (done)  run: node listen.test.js
  theory.test.js   node checks
  mictest.html     mic test page, kept for re-tuning (done)
  manifest.json    fullscreen + landscape, home-screen icon
  icon.png
```
Built-in browser features used:
- **Microphone**: `getUserMedia` with voice processing off, read through two Web Audio `AnalyserNode`s (a fine one for pitch, a quick one for strikes)
- **Screen Wake Lock**: keeps the screen from sleeping while you play
- **Manifest**: `display: fullscreen`, `orientation: landscape` (three octaves for two hands need the width; in a plain Chrome tab, upright still works, just smaller)
- **localStorage**: remembers your settings

Whole app state:
```js
{ last: Chord|null, history: Chord[/*6*/], key: {tonic, mode},
  next: Suggestion[], hints: 'show'|'wait'|'off', palette: 'basic', voicing: 'root' }
// Chord = {root: 0-11, quality: '' | 'm' | 'dim'}
```

### Hosting
**Live at https://jaykwonproject.github.io/chord-coach/**, served by GitHub Pages from the public repo `jaykwonproject/chord-coach` (`main` branch, root folder). It's free and serves HTTPS, which the mic requires.
- Open the URL in Chrome on the Note 9, tap **Add to Home screen**, and it opens fullscreen like a normal app.
- To update:
  1. Bump `v=` in the import map in `index.html`.
  2. Push to `main`. Pages redeploys in about a minute.
- Why the version bump: Pages lets browsers keep files for 10 minutes, and a refresh only re-fetches the page, not its code files. Without a new `v=`, a phone can run the new page with old code. The bottom bar shows which version is running.

---

## 6. Build phases

**v1: the core loop.** Build it, then use it for a week before adding anything.
- ~~Mic input + chord naming~~ (`listen.js`)
- ~~Key detection, suggestions (basic triads, major and minor keys)~~ (`theory.js`, `theory.test.js`)
- ~~Layout: You played with its small keyboard, Next with the big keyboard, move rating, Hints Show/Wait/Off~~ (`index.html`, `app.js`, `keys.js`)
- ~~Wake lock, PWA manifest, icon~~
- Try it on the real keyboard for a week
- ~~GitHub Pages, so the phone works without the Mac~~

**v2: jazz, both hands, fingers.** Done 2026-11-24, after your feedback that the suggestions weren't the progressions you wanted. You like jazz and bossa, but don't want to be limited to them.
- ~~Style switch: Jazz (default) / Pop~~
- ~~Jazz moves:~~
  - ~~circle-of-fifths table (I–vi–ii–V, iii–vi–ii–V, minor ii°–V–i)~~
  - ~~ii–V, secondary dominants, tritone subs, backdoor ♭VII7~~
  - ~~bossa lift and turn (I → II7 → ii7 → ♭II7 → I), borrowed minor iv, passing diminished~~
  - ~~each move named on screen~~
- ~~Key detection that understands cadences (G7 → C) and isn't thrown off by secondary dominants~~
- ~~Two-hand voicings with voice leading, and finger numbers on every key~~
- ~~Left-hand bass detection in the mic~~

**Still open, only if you want it:**
- "That was I–V–vi–IV, the pop progression": about 8 famous patterns, recognized from your last 4 chords
- Moves map: the key's 7 chords, showing the moves you've used and the ones you've never tried
- Auto-fade: once you've played a chord correctly 5 times, its keys stop showing (name only)
- More styles: Blues (I7–IV7–V7), Soul / neo-soul (maj9, m11, ♭VII), each as another Style button setting

**v3: only if needed.**
- USB cable via Web MIDI for exact notes (inversions, 7ths, fast playing)
- Broken-chord (arpeggio) detection, key lock, left hand plays shells (root + 7th)

---

## 7. How we know it works

- `node listen.test.js` (passing). It checks:
  - C E G, E G C, and with a left-hand C → **C**
  - **Am**, **Dm**, **F**, **G**, **Bdim** each named correctly
  - a single C → a note, not a chord
  - **G7** found when 7ths are allowed
- `node theory.test.js` will check:
  - key of [C Am F G] → **C major**
  - key of [Am Dm E Am] → **A minor**
  - from C in C major, Next is in **{F, G}**
  - E in C major resolves to **Am**
- `mictest.html` on your keyboard: mostly right (2026-11-24).

On the phone:
- [ ] Play a chord → it's named within about a quarter second
- [ ] Play the suggestion → green ✓ and it moves on
- [ ] Play a chord from outside the key → it's named, rated, and the app follows
- [ ] Screen stays on through 20 minutes of playing
- [ ] Readable from playing position
