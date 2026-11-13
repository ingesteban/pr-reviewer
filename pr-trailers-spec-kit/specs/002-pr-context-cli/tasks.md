# Tasks · 002 — CLI skeleton and PR context

> Every stage reads from and writes to `.trailer/<pr>/`. Nothing is passed only in memory.

## T1 — Project setup
**Files:** `package.json`, `tsconfig.json`, `.env.example`, `trailer.config.json`
**Prompt:**
> Initialize a Node ESM TypeScript project at the repo root. Add deps: tsx, typescript, zod, picomatch, picocolors, dotenv, @types/node, @types/picomatch. Add the script `"trailer": "tsx src/cli.ts"`. Create `.env.example` with `GEMINI_API_KEY=` and `GEMINI_MODEL=`. Create `trailer.config.json` exactly as in plan.md.
**Acceptance:** `npm run trailer -- --help` runs.

## T2 — Lib helpers and stage runner [depends T1]
**Files:** `src/lib/{fs.ts,log.ts,exec.ts}`, `src/stages/index.ts`, `src/cli.ts`
**Prompt:**
> Implement `src/lib/exec.ts` (constitution Art. VIII): `run(cmd, args, opts)` that logs the command dimmed, enforces a timeout, and throws on a non-zero exit with stderr included; plus `spawnBackground(cmd, args, opts)` returning `{ kill() }` for detached process groups. Then implement the Stage interface and runner from plan.md. Requirements: run all stages in order, or only `--stage <name>`; skip a stage when its output exists unless `--force`; time each stage and print `▶ name` / `✔ name 3.2s` / `⏭ name (cached)` / `✖ name: <error>` followed by the hint `re-run: npm run trailer -- <pr> --stage <name> --force`. Exit code 1 on failure.
**Acceptance:** with stub stages, the output shows all 5 stages; the second run shows cached.

## T3 — Context stage [depends T2]
**Files:** `src/stages/context.ts`
**Prompt:**
> Implement the context stage: call `gh pr view <n> --json number,title,body,author,baseRefName,headRefName,url,files` and `gh pr diff <n>`, truncate the diff to 12000 chars, map changed file paths to routes with picomatch (routes[].sources; any globalSources match → all routes; no match → all routes), and write `.trailer/<n>/context.json` matching the shape in plan.md, validated with a zod schema in `src/lib/schema.ts`.
**Acceptance:** for PR #1, `routes` includes `/pricing.html`.

## T4 — Stubs for later stages [P] [depends T2]
**Files:** `src/stages/{capture,narrate,render,publish}.ts`
**Prompt:**
> Create stubs that throw `new Error("not implemented")`, so the runner shows where the pipeline stops.

## T5 — Tests
- `npm run trailer -- 1 --stage context` → `.trailer/1/context.json` exists and has the right routes.
- Run it again → `⏭ context (cached)`; add `--force` → it re-runs.
- `npm run trailer -- 999 --stage context` → clean error message and re-run hint, exit code 1.
