import { spawn } from "node:child_process";
import { log } from "./log.ts";

// Every external command (git, gh, ffmpeg, HyperFrames, npm) goes through here (constitution Art. VIII).

export interface RunOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
  /** Log the command line (default true). */
  echo?: boolean;
  /** Called for every complete line of stdout/stderr (e.g. to stream render progress). */
  onLine?: (line: string) => void;
}

export interface RunResult {
  stdout: string;
  stderr: string;
}

export class ExecError extends Error {
  readonly command: string;
  readonly exitCode: number | null;
  readonly stderr: string;

  constructor(command: string, exitCode: number | null, stderr: string) {
    const detail = stderr.trim().split("\n").slice(-5).join(" | ") || `exit code ${exitCode}`;
    super(`\`${command}\` failed: ${detail}`);
    this.command = command;
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

/** Run a command to completion. Throws ExecError on a non-zero exit or timeout. */
export function run(cmd: string, args: string[], opts: RunOptions = {}): Promise<RunResult> {
  const { cwd, timeoutMs = 120_000, env, echo = true, onLine } = opts;
  const line = [cmd, ...args].join(" ");
  if (echo) log.command(cmd, args);

  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let partial = "";
    const feed = (text: string) => {
      if (!onLine) return;
      const lines = (partial + text).split(/\r?\n|\r/);
      partial = lines.pop() ?? "";
      for (const line of lines) onLine(line);
    };
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      feed(chunk.toString());
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      feed(chunk.toString());
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new ExecError(line, null, `timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new ExecError(line, null, error.message));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolvePromise({ stdout, stderr });
      else reject(new ExecError(line, code, stderr || stdout));
    });
  });
}

export interface BackgroundProcess {
  pid: number;
  kill(): void;
}

/** Start a long-running process (e.g. a preview server) in its own process group. */
export function spawnBackground(cmd: string, args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): BackgroundProcess {
  log.command(cmd, args);
  const child = spawn(cmd, args, {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    detached: true,
    stdio: "ignore",
  });
  if (child.pid === undefined) throw new ExecError([cmd, ...args].join(" "), null, "failed to start");
  const pid = child.pid;
  return {
    pid,
    kill() {
      try {
        process.kill(-pid, "SIGTERM"); // whole process group (npm → vite)
      } catch {
        // already exited
      }
    },
  };
}
