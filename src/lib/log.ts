import pc from "picocolors";

// Console output is part of the live demo (constitution Art. XIII).

const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

export const log = {
  title(text: string): void {
    console.log(`\n${pc.bold(pc.magenta("🎬 PR Trailers"))} ${pc.dim("·")} ${text}\n`);
  },
  start(stage: string): void {
    console.log(`${pc.cyan("▶")} ${pc.bold(stage)}`);
  },
  done(stage: string, ms: number, detail = ""): void {
    console.log(`${pc.green("✔")} ${pc.bold(stage)} ${pc.dim(seconds(ms))}${detail ? pc.dim(` · ${detail}`) : ""}`);
  },
  cached(stage: string): void {
    console.log(`${pc.dim("⏭")} ${pc.dim(`${stage} (cached)`)}`);
  },
  info(text: string): void {
    console.log(`  ${pc.dim(text)}`);
  },
  warn(text: string): void {
    console.log(`${pc.yellow("⚠")} ${pc.yellow(text)}`);
  },
  fail(stage: string, error: unknown, rerun: string): void {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`${pc.red("✖")} ${pc.bold(stage)}: ${pc.red(message)}`);
    if (process.env.DEBUG === "1" && error instanceof Error && error.stack) console.log(pc.dim(error.stack));
    console.log(`  ${pc.dim("re-run:")} ${pc.bold(rerun)}`);
  },
  command(cmd: string, args: string[]): void {
    if (process.env.QUIET === "1") return;
    console.log(pc.dim(`  $ ${[cmd, ...args].join(" ")}`));
  },
  success(text: string): void {
    console.log(`\n${pc.green(pc.bold(text))}`);
  },
};
