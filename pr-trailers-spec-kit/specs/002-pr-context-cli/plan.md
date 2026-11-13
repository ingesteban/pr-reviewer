# Plan · 002 — CLI skeleton and PR context

## Technical context
- Root `package.json` (type: module) with dev deps: `tsx`, `typescript`, `zod`, `picomatch`, `picocolors`, `dotenv`.
- GitHub data via the `gh` CLI (already authenticated), using `execa` or `node:child_process`.

## Approach
1. `src/lib/fs.ts`: `outDir(pr)` → `.trailer/<pr>/`, plus `readJson`, `writeJson` and `exists` helpers.
2. `src/lib/log.ts`: stage banners with a spinner/timer (`▶ capture … ✔ 12.4s`). This output is visible in the live demo, so make it look good.
3. `src/stages/index.ts`: a `Stage` interface `{ name, output: (pr) => string, run: (pr, cfg) => Promise<void> }`, plus a runner that implements FR-1/2/3/7.
4. `src/cli.ts`: parse `<PR#> [--stage x] [--force]` with `node:util` `parseArgs`, load `.env` and `trailer.config.json`, then call the runner.
5. `src/stages/context.ts`:
   - `gh pr view <n> --json number,title,body,author,baseRefName,headRefName,url,files`
   - `gh pr diff <n>`, truncated to `MAX_DIFF_CHARS`
   - route mapping with `picomatch` against `routes[].sources` and `globalSources`
6. Stub files for `capture`, `narrate`, `render` and `publish`.

## Contracts
`trailer.config.json`:
```json
{
  "app": { "dir": "apps/demo-app", "build": "npm run build", "preview": "npm run preview -- --port {port}", "basePort": 4173, "headPort": 4174 },
  "routes": [
    { "path": "/", "sources": ["apps/demo-app/index.html"] },
    { "path": "/pricing.html", "sources": ["apps/demo-app/pricing.html", "apps/demo-app/src/pricing.ts"] }
  ],
  "globalSources": ["apps/demo-app/styles.css"],
  "viewports": [ { "name": "desktop", "width": 1280, "height": 800 }, { "name": "mobile", "width": 390, "height": 844 } ]
}
```
`.trailer/<pr>/context.json`:
```ts
{ pr: { number, title, body, author, base, head, url }, files: { path, additions, deletions }[], diff: string, routes: string[] }
```

## Constitution alignment
Art. III (stages and caching), Art. VI (TS + gh), Art. VII (`.env` loaded with dotenv; `.env.example` committed).

## Risks
- `gh pr view --json` field names differ → check them with `gh pr view 1 --json` (it lists the valid fields).

## Cut line
Drop the spinner; plain `console.log` is fine.
