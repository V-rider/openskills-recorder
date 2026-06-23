import type { RawRecordingEvent } from "./schemas.js";

type RecordingEventListener = (event: RawRecordingEvent) => void;

const listeners = new Map<string, Set<RecordingEventListener>>();

export function publishRecordingEvent(recordingId: string, event: RawRecordingEvent): void {
  const subs = listeners.get(recordingId);
  if (!subs) return;
  for (const listener of subs) {
    try {
      listener(event);
    } catch {
      // ignore listener errors
    }
  }
}

export function subscribeRecordingEvents(
  recordingId: string,
  listener: RecordingEventListener,
): () => void {
  if (!listeners.has(recordingId)) {
    listeners.set(recordingId, new Set());
  }
  listeners.get(recordingId)!.add(listener);
  return () => {
    const subs = listeners.get(recordingId);
    if (subs) {
      subs.delete(listener);
      if (subs.size === 0) listeners.delete(recordingId);
    }
  };
}

export function clearRecordingEventSubscribers(recordingId: string): void {
  listeners.delete(recordingId);
}
