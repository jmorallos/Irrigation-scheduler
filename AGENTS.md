# Irrigation Scheduler

React + Vite + Tailwind CSS irrigation scheduler PWA (IndexedDB client app).

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # scripts/verify-features.mjs
npm run build
npm run format   # oxfmt
```

## Tabs (domain words)

| Short | Route | Page |
|-------|-------|------|
| **Prog** | `/programs`, `/programs/:programId` | `src/pages/Programs.jsx`, `ProgramDetail.jsx` |
| **Valves** | `/valves` | `src/pages/Zones.jsx` |
| **Sched** | `/schedule` | `src/pages/WeeklySchedule.jsx` |
| **Sum** | `/summary` | `src/pages/Dashboard.jsx` |

Nav: `src/components/AppShell.jsx`. Routes: `src/AppRoutes.jsx`.

**Ownership:** Programs own dates/times. Valves, Sched, and Sum display data derived from Programs (+ valve catalog fields).

## Project structure

- `src/main.jsx` — entry; imports `src/index.css`; mounts `src/App.jsx`
- `src/App.jsx` / `src/AppRoutes.jsx` — shell and routing
- `src/components/ProgramForm.jsx`, `ZoneForm.jsx`, `ScheduleForm.jsx` — forms
- `src/db/*` — IndexedDB repositories
- `src/utils/programSchedule.js`, `wateringCalendar.js`, `programListSummary.js` — schedule domain
- `scripts/verify-features.mjs` — feature assertions (`npm test`)
- `vite.config.js` — React, Tailwind v4, `@` → `src`

## Stack

- Runtime: React 19, React DOM 19, react-router-dom
- Styling: Tailwind CSS v4 via `@tailwindcss/vite` (`@import 'tailwindcss'` in `src/index.css`)
- Build: Vite 8, `@vitejs/plugin-react`
- Format: oxfmt

## Code quality

- Use double quotes for strings containing apostrophes, or escape them.
- Keep JSX tags closed and braces balanced.
- Export components as default exports.
- Match existing patterns; do not rewrite the app for brief work.

---

## Orchestration (`/orchestrate`)

Multi-step client briefs use project subagents under `.cursor/agents/` and the skill `.cursor/skills/orchestrate/SKILL.md`.

### How to invoke

1. **Custom Mode:** press **Alt+Enter** (Windows/Linux) or **Option+Enter** (macOS), then run `/orchestrate` with the brief.
2. Or type `/orchestrate` in Agent chat and paste the checklist.
3. Specialists can also be invoked directly: `/planner`, `/implementer`, `/ui-forms`, `/verifier`, `/debugger`.

### Loop (parent does not implement large changes alone)

```
planner → implementer | ui-forms → verifier
       ↳ on fail: debugger → verifier
Stop after two failed verify rounds on the same step; report the gap.
```

- Independent steps may run in parallel; colliding file edits must not.
- `planner` and `verifier` are readonly.
- `ui-forms` owns Create Program / Zone form field order, validation, portrait layout, labels.
- `implementer` owns smallest non-form logic and display changes.
- `debugger` only after a real failure.

### Agents

| Agent | Path | Role |
|-------|------|------|
| planner | `.cursor/agents/planner.md` | Map brief → files; ordered plan |
| implementer | `.cursor/agents/implementer.md` | Smallest matching change |
| ui-forms | `.cursor/agents/ui-forms.md` | Program/valve forms and layout |
| verifier | `.cursor/agents/verifier.md` | Prove behavior; never "should work" |
| debugger | `.cursor/agents/debugger.md` | Root-cause after failure |

If `/planner` is not listed yet after adding agents, start a **new chat** so Cursor reloads project subagents before Phase 2 implementation.
