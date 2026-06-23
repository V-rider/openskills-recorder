import type { RawRecordingEvent } from "@openskills/core";

declare global {
  interface Window {
    openskills?: {
      recorder: {
        start: (input: unknown) => Promise<{ recordingId: string }>;
        stop: (recordingId: string) => Promise<unknown>;
      };
      synthesis: {
        run: (payload: { recordingId: string; useLlm?: boolean }) => Promise<unknown>;
      };
      replay: {
        run: (input: unknown) => Promise<unknown>;
        cancel: (runId: string) => Promise<unknown>;
      };
      settings: {
        get: () => Promise<unknown>;
        save: (data: unknown) => Promise<unknown>;
      };
      dialog: {
        permission: () => Promise<boolean>;
      };
      wsPort: number;
    };
  }
}

export function isElectron(): boolean {
  return typeof window !== "undefined" && Boolean(window.openskills);
}

export async function bridgeStartRecording(input: unknown) {
  if (window.openskills) {
    return window.openskills.recorder.start(input);
  }
  const res = await fetch("/api/recordings/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function bridgeStopRecording(recordingId: string) {
  if (window.openskills) {
    return window.openskills.recorder.stop(recordingId);
  }
  const res = await fetch(`/api/recordings/${recordingId}/stop`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function bridgeSynthesize(recordingId: string, useLlm?: boolean) {
  if (window.openskills) {
    return window.openskills.synthesis.run({ recordingId, useLlm });
  }
  const res = await fetch(`/api/recordings/${recordingId}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ useLlm }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function bridgeReplay(input: unknown) {
  if (window.openskills) {
    return window.openskills.replay.run(input);
  }
  const res = await fetch("/api/replays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function bridgeCancelReplay(runId: string) {
  if (window.openskills?.replay?.cancel) {
    return window.openskills.replay.cancel(runId);
  }
  const res = await fetch(`/api/replays/${runId}/cancel`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function connectRecordingEvents(
  recordingId: string,
  onMessage: (data: { type: string; event?: RawRecordingEvent; recordingId?: string }) => void,
): () => void {
  if (typeof window !== "undefined" && window.openskills) {
    const port = window.openskills.wsPort ?? 3847;
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.onmessage = (msg) => {
      try {
        onMessage(JSON.parse(msg.data as string));
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }

  const es = new EventSource(`/api/recordings/${recordingId}/events`);
  es.onmessage = (msg) => {
    try {
      onMessage(JSON.parse(msg.data));
    } catch {
      // ignore
    }
  };
  return () => es.close();
}

/** @deprecated use connectRecordingEvents */
export function connectRecordingWs(
  onMessage: (data: { type: string; event?: unknown; recordingId?: string }) => void,
): () => void {
  const port = window.openskills?.wsPort ?? 3847;
  const ws = new WebSocket(`ws://localhost:${port}`);
  ws.onmessage = (msg) => {
    try {
      onMessage(JSON.parse(msg.data as string));
    } catch {
      // ignore
    }
  };
  return () => ws.close();
}

export function artifactUrl(absolutePath: string): string | null {
  if (!absolutePath) return null;
  const match = absolutePath.match(/artifacts\/(.+\.png)$/);
  if (!match) return null;
  return `/api/artifacts/${match[1]}`;
}
