# 🎲 Pig Arcade

> A feature-rich, arcade-style browser implementation of the classic dice game *Pig* — with AI opponents, perks, streak multipliers, and persistent stat tracking.

![Game Mode](https://img.shields.io/badge/Game-Pig%20Dice-blueviolet?style=flat-square)
![Players](https://img.shields.io/badge/Players-1--2-informational?style=flat-square)
![AI Difficulty](https://img.shields.io/badge/AI-3%20Difficulty%20Levels-orange?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-pig--arcade.vercel.app-brightgreen?style=flat-square&logo=vercel)](https://pig-arcade.vercel.app/)

---

🔗 **Live Demo:** [https://pig-arcade.vercel.app/](https://pig-arcade.vercel.app/)

---

## 📖 About

**Pig Arcade** is a polished, browser-based take on the classic dice game *Pig*. Players take turns rolling a die to accumulate points — but rolling a `1` wipes your turn score and passes the turn. First to reach the target score wins.

What sets Pig Arcade apart is its full arcade layer: AI opponents with distinct personalities, a perk system with stackable effects, Fever Mode streak multipliers, live game logs, and a Champions Wall that tracks your victories over time.

---

## 🎮 Game Modes

### Player VS Player
Two human players share a device and alternate turns. Supports a configurable target score (default: 100) and an optional **Double Dice Mode** where two dice are rolled per turn.

### AI Battle Arena
Face off against one of three CPU opponents, each with a different strategy:

| CPU Core | Difficulty | Playstyle |
|----------|------------|-----------|
| Nano Core | Beginner | Conservative, holds early |
| Zenith Core | Intermediate | Balanced risk/reward |
| Kratos Core | Advanced | Aggressive, high-risk rolls |

---

## ✨ Features

- 🎲 **Core Pig gameplay** — roll to accumulate, hold to bank, lose on a 1
- 🤖 **Three AI difficulty levels** with distinct decision-making logic
- 🔥 **Fever Mode** — triggered after 3 consecutive successful rolls, applying streak multipliers
- 🃏 **Holo Codex Perks** — collectible power-ups that alter gameplay:
  - **Aura Shield** — protection utility
  - **Double Down** — 2× score multiplier for the next 3 rolls
  - **Energy Siphon** — drain-based effect
  - **Lucky 7** — luck-based scoring boost
- 🎰 **Double Dice Mode** — toggle to roll two dice simultaneously
- 📊 **Stats & Rankings** — lifetime tracking of high scores, heartbreaks, total rolls, and best turn scores
- 🏆 **Champions Wall** — match victory history with scores, opponents, game modes, and dates
- 📟 **Action Terminal** — live scrolling game log narrating every event in real time
- 🔊 **Audio toggle** — sound effects with on/off control
- ✏️ **Editable player names** — rename players before or during a match

---

## 🕹️ How to Play

1. Choose a game mode — **Player VS Player** or **AI Battle Arena**
2. On your turn, click **Roll Dice** to roll
   - A roll of `2–6` adds to your current turn score
   - A roll of `1` wipes your turn score and passes the turn
3. Click **Hold Points** to bank your turn score into your total
4. First player to reach the **target score** wins
5. Use **perks** strategically to multiply your score or protect your turn

---

## 📊 Stats Tracked

| Stat | Description |
|------|-------------|
| High Score Record | Highest winning score across all matches |
| Highest Turn Score | Most points accumulated in a single turn |
| Total Rolls Played | Lifetime dice rolls recorded |
| Heartbreaks | Total times a `1` was rolled |

---

## 🚀 Getting Started

```bash
git clone https://github.com/your-username/pig-arcade.git
cd pig-arcade
open index.html
```

Or serve with any static file server:

```bash
npx serve .
# or
python -m http.server 8000
```

---

## 🛠️ Tech Stack

- **HTML / CSS / JavaScript** — vanilla, no frameworks
- **localStorage** — persistent stats and champions history
- **CSS animations** — Fever Mode pulses, avatar effects, and perk previews

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-idea`)
3. Commit your changes (`git commit -m 'Add: your feature'`)
4. Push and open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">Built with 🎲 and a love for arcade games</p>
