import { BrowserRecorder, type RecordingEventHandler } from "@openskills/recorder";
import { ReplayEngine } from "@openskills/replay";
import type { StartRecordingInput } from "@openskills/core";
import { publishRecordingEvent } from "@openskills/core";
import { getArtifactBaseDir } from "@/lib/server/db-helpers";

export const activeRecorders = new Map<string, BrowserRecorder>();
export const replayEngine = new ReplayEngine();

export async function startRecordingSession(
  recordingId: string,
  input: StartRecordingInput,
  onEvent?: RecordingEventHandler,
) {
  const playwright = await import("playwright");
  const artifactBaseDir = await getArtifactBaseDir();
  const recorder = new BrowserRecorder(async (event) => {
    publishRecordingEvent(recordingId, event);
    await onEvent?.(event);
  }, artifactBaseDir);
  activeRecorders.set(recordingId, recorder);
  await recorder.start(recordingId, input, playwright);
  return recorder;
}

export function getActiveRecorder(recordingId: string) {
  return activeRecorders.get(recordingId);
}

export function clearRecorder(recordingId: string) {
  activeRecorders.delete(recordingId);
}
