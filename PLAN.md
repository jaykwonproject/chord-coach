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

## 2. Core loop (one screen, no modes)

```
show NEXT chord ──► you play something
                       │
       ┌───────────────┴────────────────┐
  it's the suggestion            it's something else
  green ✓                        app names it + rates the move
       └───────────────┬────────────────┘
          it becomes "YOU PLAYED" (name + its keys)
          new NEXT is suggested from there ──► repeat
```

Whatever you play counts as right. The app follows you and never says "wrong".

The **Hints** button is the only control you touch while playing (tap to cycle):

| Hints    | What happens                                                         | When           |
|----------|----------------------------------------------------------------------|----------------|
| **Show** | Next chord + keys shown right away                                   | start here     |
| **Wait** | Next stays hidden ("your move…"); appears if you don't play for 3 s  | recall practice|
| **Off**  | No suggestions. The app only names chords and rates your moves       | free play      |

Moving from Show to Off is your progress. When Off feels easy, you've reached the goal.

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
- **v1:** major, minor and diminished on all 12 roots (36 chords). That covers every chord the Basic suggestions use.
- 7ths and sus chords (v2) are harder for the mic: they get added as "experimental" and kept only if they test well.
- Spelling follows the key (B♭ in F, A♯ in B). Default when unsure: D♭ E♭ F♯ A♭ B♭.

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

### 3.5 Showing where fingers go
- Right hand, **root position**. Every triad has the same "skip a key, skip a key" shape, which is the fastest to learn. Thumb, middle finger, pinky (1-3-5).
- Two octaves from middle C. Every C key is labelled, with the reminder "C is the white key just left of the two black keys". This is already working in `mictest.html`.
- The mic can't see which keys you pressed, so "You played" shows that chord's keys in root position.

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
| Played the target | Keys go green ✓ for 250 ms, then the next chord appears |
| Played something else | Named + move rated in "You played"; Next follows from it |
| Mic blocked | One line saying how to allow it in Chrome |

**Settings:** none in v1, because there's nothing to choose yet. A ⚙ arrives with v2's chord palette and voicing options.

---

## 5. Technical

### Decision: a web app (PWA) in Chrome, listening through the mic
- It works with any keyboard and needs no cable. The phone's USB port stays free for charging.
- No Android Studio, no APK sideloading. You update with `git push` and reload.
- If the mic's limits ever get in the way, a USB cable can be added later. Chrome can read a keyboard's exact notes over USB through Web MIDI, and the rest of the app wouldn't change.

### Phone
- Chrome was removed by the debloat and restored on 2026-11-24 with `../restore.sh com.android.chrome`. It's now Chrome 157.
- Testing right now runs over Wi-Fi debugging, which needs the Mac on and on the same Wi-Fi. It switches itself off when the phone restarts.

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
- **Manifest**: `display: fullscreen`; orientation isn't locked, since both layouts work
- **localStorage**: remembers your settings

Whole app state:
```js
{ last: Chord|null, history: Chord[/*6*/], key: {tonic, mode},
  next: Suggestion[], hints: 'show'|'wait'|'off', palette: 'basic', voicing: 'root' }
// Chord = {root: 0-11, quality: '' | 'm' | 'dim'}
```

### Hosting
The phone has to load the app without the Mac. Plan: **GitHub Pages**, a public repo containing only `chord-coach/`. It's free and serves HTTPS, which the mic requires. Open the URL in Chrome on the Note 9, tap **Add to Home screen**, and it opens fullscreen like a normal app. Publishing needs your OK when v1 is ready.

---

## 6. Build phases

**v1: the core loop.** Build it, then use it for a week before adding anything.
- ~~Mic input + chord naming~~ (`listen.js`)
- ~~Key detection, suggestions (basic triads, major and minor keys)~~ (`theory.js`, `theory.test.js`)
- ~~Layout: You played with its small keyboard, Next with the big keyboard, move rating, Hints Show/Wait/Off~~ (`index.html`, `app.js`, `keys.js`)
- ~~Wake lock, PWA manifest, icon~~
- Try it on the real keyboard for a week
- GitHub Pages, so the phone works without the Mac (needs your OK)

**v2: only what a week of v1 shows you need.**
- Chords palette: **+7ths** (V7, ii7, Imaj7…) and **+Color** (E7→Am style secondary dominants, borrowed iv / ♭VII / ♭VI). Kept only if the mic tests well with them.
- Smooth voicing: the inversion closest to your last chord, so your hand barely moves
- "That was I–V–vi–IV, the pop progression": about 8 famous patterns, recognized from your last 4 chords
- Moves map: the key's 7 chords, showing the moves you've used and the ones you've never tried
- Auto-fade: once you've played a chord correctly 5 times, its keys stop showing (name only)

**v3: only if needed.**
- USB cable via Web MIDI for exact notes (inversions, 7ths, fast playing)
- Broken-chord (arpeggio) detection, left-hand bass note, key lock

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
