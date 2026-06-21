# Simplyai: Bash the Silos!

> One firm. Six leaders. Infinite transformation energy.

An original arcade browser game built for Simplyai. Choose an executive, bash silos and blockers, collect client badges, build combos, and trigger **One Firm Mode** — all in a three-minute transformation sprint.

---

## Technology

| Layer | Technology |
|---|---|
| Game engine | [Phaser 3](https://phaser.io/) (v3.87) |
| Build tool | [Vite](https://vitejs.dev/) (v5) |
| Language | TypeScript (strict mode) |
| Audio | Web Audio API (procedural — no external files) |
| Storage | localStorage (no backend, no tracking) |
| Assets | Programmatically generated (no external artwork) |

---

## Quick Start

### Requirements

- Node.js 18+ (or any LTS with `npm`)

### Install

```bash
cd game
npm install
```

### Run (development)

```bash
npm run dev
```

Opens at **http://localhost:3001**

### Build (production)

```bash
npm run build
```

Output is in `game/dist/`. Serve with any static file host.

### Preview production build locally

```bash
npm run preview
```

---

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Move | `WASD` or Arrow Keys | Joystick (bottom-left) |
| Bash / Dash | `Space` | BASH button (bottom-right) |
| Special Ability | `E` | POWER button |
| Pause | `P` or `Escape` | Pause button |
| Mute | `M` | Sound toggle |
| Confirm menus | `Enter` | Tap |

---

## Game Modes

### Standard (3-minute run)
The default. Score as many points as possible in three minutes. A boss (the **Silo Core**) appears in the final 30 seconds.

### Endless Mode
Available after completing a standard run. Continues indefinitely with escalating difficulty.

---

## Executive Characters

Six playable characters, each with a unique special ability:

| Character | Title | Ability |
|---|---|---|
| Jason | CEO | ONE VISION — strategic pulse, reveals routes, freezes combo decay |
| Kylie | CTRO | REVENUE RUSH — magnetises opportunities, doubles client scoring |
| Luke | COO | OPERATING RHYTHM — shockwave clears blockers, slows hazards |
| Johan | CTO | ARCHITECTURE SHIELD — destroys tech debt, neutralises security threats |
| Gina | CIO | INNOVATION BURST — converts blockers to accelerators, doubles innovation points |
| Wayne | CFO | MARGIN GUARD — converts margin leaks to value, prevents score loss |

Activate the special ability with `E` once the ability charge ring is full.

---

## Scoring

| Action | Points |
|---|---|
| AI Spark / Knowledge Orb | 25–40 |
| Capability Card | 50 |
| Cross-Skill Token | 60 |
| Client Badge | 100 |
| Qualified Opportunity | 150 |
| Market-Ready Offering | 175 |
| Client Outcome Beacon | 200 |
| Silo Cube destroyed | 40 |
| Mission completed | 500 |
| Cross-Pillar Chain | 750 |
| One Firm Mode activated | 1,000 |
| Silo Core defeated | 2,500 |

Combo multipliers increase your score by up to 10×.

---

## One Firm Mode

Fill the **Transformation Meter** (by collecting items and bashing blockers) to 100%. The meter triggers **One Firm Mode** automatically:

- Five ally executives appear and assist the player
- Score multiplier jumps to 3×
- Music intensifies
- Nearby collectibles are pulled towards you
- Duration: ~10 seconds

---

## Configuring Executives, Collectibles and Missions

All game data is defined in `src/content/`:

| File | Controls |
|---|---|
| `executives.ts` | Character stats, abilities, colours, callouts |
| `collectibles.ts` | Collectible types, points, pillars, shapes |
| `blockers.ts` | Blocker types, health, speed, damage |
| `missions.ts` | Mission pool, targets, rewards |
| `clientBadges.ts` | Fictional sector badges |
| `transformationCopy.ts` | On-screen messages, grades, thresholds |

### Changing Colours

Edit the `colour` and `accentColour` fields in `executives.ts`. All colours use hex format (`0xRRGGBB`).

Game-wide palette tokens are in `src/game/config.ts` under `PILLAR_COLOURS` and `DISTRICT_COLOURS`.

### Changing Text

All in-game labels, callouts, flash messages and grade thresholds are in `src/content/transformationCopy.ts`. No code changes needed.

### Changing Difficulty

Edit `src/game/config.ts`:

| Constant | Effect |
|---|---|
| `GAME_DURATION` | Total game time in seconds |
| `SPAWN_INTERVAL_INITIAL` | Starting spawn rate (ms) |
| `SPAWN_INTERVAL_MIN` | Fastest possible spawn rate |
| `SPAWN_ACCELERATE_RATE` | How quickly spawning accelerates |
| `ONE_FIRM_DURATION` | How long One Firm Mode lasts |

---

## Adding Approved Client Logos

By default, all client badges are fictional geometric shapes. To add approved logos later:

1. Place PNG or SVG files in `game/public/client-logos/`
   - e.g. `game/public/client-logos/banking-client.png`

2. Open `src/content/clientBadges.ts` and add `logoFile`:

```ts
{
  id: 'banking',
  sector: 'Financial Services',
  label: 'Banking Client',
  colour: 0x003366,
  accentColour: 0x004488,
  symbol: 'diamond',
  logoFile: 'client-logos/banking-client.png',  // ← add this
}
```

3. In `src/game/scenes/GameScene.ts`, update `addEntity` / `drawEntity` to load and render the texture when `logoFile` is present.

See `game/public/client-logos/README.md` for full guidance.

---

## Privacy and Content Rules

The following content is intentionally excluded:

- Real client names or logos
- Prospect names or pipeline values
- Confidential revenue, margin or deal data
- Personal or performance-related employee data
- Board, shareholder or acquisition details
- Any information implying a client relationship without consent

The six executive call-outs are fictional game dialogue, not attributed quotations.

Transformation themes appear as playful game mechanics only — not as training content or internal documentation.

---

## Deployment

The production build (`npm run build`) produces a fully static `dist/` folder.

Serve it with any static host:

```bash
# Nginx, Apache, Caddy, Vercel, Netlify, S3+CloudFront, etc.
# No server-side processing required.
```

The game makes no external network requests at runtime.

---

## Architecture

```
game/
├── src/
│   ├── main.ts                   Entry point — Phaser config
│   ├── game/
│   │   ├── config.ts             Global constants and tokens
│   │   ├── events.ts             Event name registry
│   │   └── scenes/
│   │       ├── BootScene.ts      Asset generation (programmatic)
│   │       ├── MainMenuScene.ts  Title screen
│   │       ├── CharacterSelectScene.ts
│   │       ├── GameScene.ts      Core gameplay
│   │       └── ResultsScene.ts   End-of-run summary
│   ├── systems/
│   │   ├── AudioManager.ts       Procedural music and SFX
│   │   ├── ScoreManager.ts       Score, combo, multiplier
│   │   ├── MissionManager.ts     Mission tracking
│   │   └── TransformationManager.ts  One Firm Mode logic
│   └── content/
│       ├── executives.ts         Character definitions
│       ├── collectibles.ts       Collectible and power-up defs
│       ├── blockers.ts           Blocker / enemy defs
│       ├── missions.ts           Mission pool
│       ├── clientBadges.ts       Sector badge config
│       └── transformationCopy.ts All on-screen text
├── public/
│   └── client-logos/             Optional logo directory
├── index.html
├── vite.config.ts
└── package.json
```

---

## Known Limitations

- **No Endless Mode UI** — Endless Mode is flagged in results data but does not yet have a distinct mode launch; replaying routes through the same session loop provides the effect.
- **Audio requires user interaction** — browsers block autoplay; audio starts on the first click/keypress, which is the correct behaviour.
- **Boss scaling** — the Silo Core boss has fixed health (20 hits). In a future version, health could scale with game difficulty.
- **No save state** — only the high score and accessibility preferences are persisted. Mid-run state is not saved.
