# CRA to Vite Migration Plan

## Current State

- Build tool: Create React App (react-scripts 5.0.1)
- Status: CRA is unmaintained, slow builds, outdated dependencies
- Target: Vite 5+ with React plugin

## Why Migrate

1. **Build speed**: Vite is 10-100x faster for dev server startup and HMR
2. **Active maintenance**: Vite has a large, active community
3. **Modern tooling**: Native ESM, better TypeScript integration, smaller bundles
4. **Plugin ecosystem**: Rich ecosystem of Vite plugins

## Migration Steps

### 1. Install Vite Dependencies

```bash
cd chancellor-sim
npm install --save-dev vite @vitejs/plugin-react
```

### 2. Create vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/chancellor-sim/',
  build: {
    outDir: 'build',
    sourcemap: true,
  },
})
```

### 3. Update index.html

Move `public/index.html` to project root and update:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="A five-year UK Chancellorship simulation..." />
    <title>Chancellor Sim</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.tsx"></script>
  </body>
</html>
```

### 4. Update package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css}\""
  }
}
```

### 5. Update GitHub Actions Workflow

Change `npm run build` to use Vite build command. The build output directory remains `build/` so the deploy step needs no changes.

### 6. Handle Tailwind CSS

Vite works well with Tailwind. The existing `tailwind.config.js`, `postcss.config.js`, and `src/index.css` should work without changes.

### 7. Handle Environment Variables

CRA uses `REACT_APP_*` prefix. Vite uses `VITE_*` prefix. Search and replace any `process.env.REACT_APP_*` references to `import.meta.env.VITE_*`.

### 8. Testing

CRA bundles Jest. Vite does not. Options:
- Keep Jest as-is (works fine without CRA)
- Migrate to Vitest for faster, Vite-native testing

### 9. Known Gotchas

- `public/` folder: Vite serves from `public/` at project root, not nested
- `process.env`: Replace with `import.meta.env`
- Dynamic imports: Vite handles these differently for code splitting
- `react-scripts` specific features: None used in this project

## Estimated Effort

- Low risk: 2-4 hours
- The codebase has no complex CRA-specific features
- All imports are standard ES modules
- Tailwind configuration is straightforward

## Rollback Plan

Keep `react-scripts` as a dev dependency during transition. Revert package.json scripts if issues arise.
