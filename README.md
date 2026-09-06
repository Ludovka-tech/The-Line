# The Line

A companion app to a financial literacy course. It shows your net worth as a line over time, prompts you on payday, runs a weekly check, and keeps your plan in one place.

**Try it: https://ludovka-tech.github.io/The-Line/**

Add it to your home screen and it runs like an installed app, offline included.

## Everything stays on your device

There is no account, no login, and no server. All data lives in one `localStorage` key on the device you use it on. Nothing is uploaded, and there are no analytics or third-party requests. The fonts are self-hosted for that reason.

That also means a lost phone loses the history. Settings has an export, in JSON and CSV.

## What it does

- **Home** — your net worth as a single line, plus the one thing worth doing next.
- **Check** — a short weekly review that takes a minute.
- **Plan** — your method, your automatic transfer, your emergency fund target, your goal.
- **Progress** — readings over time, and what changed since the last one.
- **Settings** — payday, currency, reminders as calendar files, export, delete.

Numbers are inspectable. Tap a figure and it shows how it was worked out.

## Build

Plain HTML, CSS, and JavaScript. No framework, no build step, no dependencies.

| File | Role |
| --- | --- |
| `index.html` | Shell and tab bar |
| `app.js` | Hash router and screens |
| `engine.js` | Budgeting maths, method fit, next action |
| `store.js` | Load, save, export, course handoff |
| `country-config.js` | Country tax and regulator profiles |
| `sw.js` | Offline cache |

Serve the folder over any static server:

```
python3 -m http.server 8000
```

## Design

Dark by default, light when the system asks for it. It follows the system appearance and text size rather than offering its own settings. Touch targets are at least 44pt. Increased contrast, reduced transparency, and reduced motion are all honoured.

Colour never carries meaning on its own: every rise and fall is also a word.

## Status

Preview. Free while it is in preview.

Education, not financial advice. It compares things; it does not recommend them, and it earns no commission on anything you open or buy.
