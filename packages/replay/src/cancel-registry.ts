const activeReplays = new Map<string, AbortController>();

export function registerReplay(runId: string, controller: AbortController): void {
  activeReplays.set(runId, controller);
}

export function cancelReplay(runId: string): boolean {
  const controller = activeReplays.get(runId);
  if (!controller) return false;
  controller.abort();
  activeReplays.delete(runId);
  return true;
}

export function unregisterReplay(runId: string): void {
  activeReplays.delete(runId);
}
