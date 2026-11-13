// Stage registry, in pipeline order. Stages never import each other (constitution Art. VIII).
import type { Stage } from "../lib/stage.ts";
import { captureStage } from "./capture.ts";
import { contextStage } from "./context.ts";
import { narrateStage } from "./narrate.ts";
import { publishStage } from "./publish.ts";
import { renderStage } from "./render.ts";

export const stages: Stage[] = [contextStage, captureStage, narrateStage, renderStage, publishStage];
