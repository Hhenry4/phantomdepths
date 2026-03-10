

# Phantom Depths — Full Game Implementation Plan

## Phase 1: Foundation & Core Engine

### Game Canvas & Rendering
- Set up an HTML5 Canvas rendering engine for the 2D submarine game world
- Implement camera system that follows the submarine with depth-based parallax layers
- Create the **Dynamic Darkness System**: visibility decreases with depth, light cone from submarine attracts nearby creatures
- Procedural ocean generation: caves, trenches, wrecks, and ruins generated per dive

### Submarine Controller
- Player-controlled submarine with physics: thrust, rotation, inertia, and drift
- Engine noise system that affects monster detection
- Collision detection with terrain and creatures

### HUD (Following Sonde Design Brief)
- IBM Plex Mono for all UI labels and data readouts
- Deep Sea Black (`#101418`) panels anchored to screen edges
- Bottom telemetry strip: depth gauge, pressure meter, hull integrity, power level, oxygen — all as minimalist bar graphs and numeric readouts in Sonar Cool Gray (`#B4C5CF`)
- No icons for navigation — text-based labels only
- No background blur when menus open — game world stays sharp and visible
- Hard-cut panel transitions, no fades or eases

## Phase 2: Depth Zones & Environment

### Five Ocean Zones
1. **Sunlight Zone (0–200m)** — Bright blue-green water, gentle currents, small fish, coral
2. **Twilight Zone (200–1000m)** — Dimming visibility, bioluminescent particles, first predators
3. **Midnight Zone (1000–4000m)** — Near-black, giant creatures, pressure damage begins
4. **Abyssal Plains (4000–6000m)** — Ancient structures emerge, rare materials, massive trenches
5. **Hadal Trench (6000m+)** — Extreme pressure, Leviathan-class encounters, endgame mysteries

### Pressure Mechanics
- Hull integrity decreases when exceeding safe depth rating
- Visual cracks and warning alerts in Orangered (`#FF4500`) when hull is critical
- Requires hull upgrades to survive deeper zones

## Phase 3: Combat & Creatures

### Weapon Systems
- **Harpoon Launcher** — Projectile weapon, good for small creatures
- **Shock Cannon** — Area stun effect, electrical burst animation
- **Torpedoes** — High damage, limited ammo, explosion effects
- **Plasma Cutter** — Close-range beam weapon

### Monster AI
- Creatures with patrol, chase, and ambush behaviors
- Sound detection: monsters react to engine noise and sonar pings
- No health bars over enemies — damage shown through visual cues on creatures
- **Target Analysis** HUD window with clinical readouts: `[STRUCTURAL INTEGRITY: 73%]`

### Creature Roster
- Angler Stalkers, Giant Squid Titans, Abyss Serpents
- Boss creatures guarding zone transitions: Titan Squid, Abyssal Leviathan
- **Phantom Depth Entity** — final mystery creature

### Sonar Ping System (Signature Moment)
- Activating sonar sends a razor-sharp sweep line in Sonar Cool Gray
- Briefly illuminates terrain wireframes as it passes
- A delayed, distorted echo returns in Orangered — revealing something massive is mimicking your signal

## Phase 4: Progression & Upgrades

### Submarine Upgrade Tree
- Not a traditional tree — presented as **classified engineering schematics**
- Clicking "Hull" replaces the view with a full wireframe schematic of the submarine
- Available upgrade nodes glow in Deep Sky Blue (`#00BFFF`)
- Categories: Hull, Engine, Sonar, Power Systems

### Resource & Crafting
- Collectible resources: coral fragments, rare metals, bioluminescent crystals, alien organisms, ancient artifacts
- Crafting system for upgrades, weapons, and experimental tech

### Crew / AI Assistants
- Unlockable AI modules: Navigator (marks routes), Combat AI (auto-targeting), Engineer (auto-repairs)

### Monster Research (Bestiary)
- Scanning/defeating creatures populates a database
- Presented as clinical data files in IBM Plex Mono
- Research unlocks weaknesses and special crafting materials
- Discovered logs use Source Serif 4 font to contrast human narrative against cold data

## Phase 5: Story & Discovery

### Mystery System
- Discoverable story elements: lost submarines, ancient ruins, research logs
- Log entries rendered in Source Serif 4, contrasting the cold UI
- Artifact-related UI elements use Mauve (`#E0B0FF`) to signal the unknown
- Progressive narrative revealing something ancient lives in the deepest trench

## Phase 6: Cloud Backend (Lovable Cloud / Supabase)

### Authentication & Profiles
- User signup/login (email-based)
- Player profiles with stats and achievements

### Cloud Save System
- Save submarine state, upgrades, unlocked zones, bestiary progress
- Multiple save slots per player
- Automatic save on surface return

### Leaderboards
- Deepest dive reached
- Fastest zone clears
- Creatures discovered

## Phase 7: Polish & Advanced Features

### Audio & Atmosphere
- Ambient deep-sea soundscape
- Sonar ping sound effects
- Pressure creaking, creature sounds
- Fear system: unseen creatures trigger audio cues

### Procedural Generation
- Randomized cave layouts, wreck placements, and creature spawns per dive
- Ensures replayability across runs

### Optional Modes
- **Permadeath Mode** — run ends permanently on destruction
- **Deep Expedition Mode** — longest continuous dive challenge

---

**Note:** This is a large-scale project. We'll build it phase by phase, starting with the canvas engine, submarine controls, and HUD. Each phase will be a series of iterative prompts to refine and polish.

