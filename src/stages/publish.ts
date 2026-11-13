import { writeFileSync } from "node:fs";
import pc from "picocolors";
import { run } from "../lib/exec.ts";
import { outPath, readJson, writeJson } from "../lib/fs.ts";
import { log } from "../lib/log.ts";
import { type Published, PublishedSchema, ScriptSchema } from "../lib/schema.ts";
import type { Stage } from "../lib/stage.ts";
import { MARKER, buildBody } from "./publish/body.ts";
import { repoInfo, uploadAssets } from "./publish/release.ts";

/** Id of the existing PR Trailers comment on this PR, if any (FR-3). */
async function findTrailerComment(repo: string, pr: number): Promise<string | undefined> {
  const { stdout } = await run(
    "gh",
    ["api", `repos/${repo}/issues/${pr}/comments`, "--paginate", "--jq", `.[] | select(.body | contains("${MARKER}")) | .id`],
    { timeoutMs: 30_000 },
  );
  return stdout.trim().split("\n").filter(Boolean)[0];
}

export const publishStage: Stage = {
  name: "publish",
  output: (pr) => outPath(pr, "published.json"),
  async run({ pr }) {
    const script = await readJson(outPath(pr, "script.json"), ScriptSchema);
    const repo = await repoInfo();
    if (repo.visibility !== "PUBLIC") log.warn(`${repo.nameWithOwner} is ${repo.visibility.toLowerCase()}: the GIF only renders inline on public repos`);

    const urls = await uploadAssets(pr, repo);
    log.info(`uploaded pr-${pr}-trailer.mp4, pr-${pr}-preview.gif, pr-${pr}-poster.png to the "trailers" release`);

    const bodyFile = outPath(pr, "comment.md");
    writeFileSync(bodyFile, buildBody(script, urls));

    const existing = await findTrailerComment(repo.nameWithOwner, pr);
    let commentUrl: string;
    let action: Published["action"];
    if (existing) {
      const { stdout } = await run(
        "gh",
        ["api", "-X", "PATCH", `repos/${repo.nameWithOwner}/issues/comments/${existing}`, "-F", `body=@${bodyFile}`, "--jq", ".html_url"],
        { timeoutMs: 30_000 },
      );
      commentUrl = stdout.trim();
      action = "updated";
    } else {
      const { stdout } = await run("gh", ["pr", "comment", String(pr), "--body-file", bodyFile], { timeoutMs: 30_000 });
      commentUrl = stdout.trim().split("\n").pop() ?? "";
      action = "created";
    }

    const published: Published = { commentUrl, action, assets: urls, publishedAt: new Date().toISOString() };
    await writeJson(this.output(pr), published, PublishedSchema);
    console.log(`\n  ${pc.bold(pc.green(`🎬 Trailer ${action} on PR #${pr}:`))} ${pc.bold(commentUrl)}\n`);
    return `comment ${action}`;
  },
};
