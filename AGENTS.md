# Irrigation Scheduler

React + Vite + Tailwind CSS irrigation scheduler PWA.

## Development Server

```bash
npm install
npm run dev
```

The Vite development server runs on http://localhost:5173.

## Project Structure

- `src/main.jsx` - React entrypoint; imports `src/index.css` and mounts `src/App.jsx` into the `#root` element
- `src/App.jsx` - Primary application component and routing
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.jsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.js` - Vite configuration with React, Tailwind CSS v4, and the `@` alias for `src`

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8 and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.js`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.jsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
