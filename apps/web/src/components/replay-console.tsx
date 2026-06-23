"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bridgeCancelReplay } from "@/lib/desktop-bridge";
import { ScreenshotThumb } from "@/components/screenshot-thumb";

export interface ReplayLogEntry {
  stepId: string;
  sequence: number;
  status: string;
  message?: string;
  details?: { screenshotPath?: string; [key: string]: unknown };
}

export function ReplayConsole({
  logs,
  runId,
  onCancel,
}: {
  logs: ReplayLogEntry[];
  runId?: string;
  onCancel?: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "error">("all");

  if (logs.length === 0 && !runId) return null;

  const filtered = filter === "error"
    ? logs.filter((l) => l.status === "failed" || l.status === "cancelled")
    : logs;

  return (
    <div className="mt-4 space-y-2 rounded-lg border bg-zinc-50 p-3 font-mono text-xs dark:bg-zinc-900">
      <div className="flex items-center justify-between font-sans">
        <p className="text-sm font-medium">Replay console</p>
        <div className="flex gap-2">
          <select
            className="rounded border px-2 py-1 text-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "error")}
          >
            <option value="all">All</option>
            <option value="error">Errors only</option>
          </select>
          {runId && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await bridgeCancelReplay(runId);
                onCancel?.();
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
      {filtered.map((log) => (
        <div key={`${log.stepId}-${log.sequence}`} className="space-y-1">
          <div className="flex gap-2">
            <Badge
              variant={
                log.status === "success"
                  ? "success"
                  : log.status === "failed"
                    ? "destructive"
                    : "warning"
              }
            >
              {log.status}
            </Badge>
            <span>{log.stepId}</span>
            {log.message && <span className="text-red-600">{log.message}</span>}
          </div>
          {log.details?.screenshotPath && (
            <ScreenshotThumb
              path={log.details.screenshotPath as string}
              alt="Failure screenshot"
              className="h-20 w-auto rounded border"
            />
          )}
        </div>
      ))}
    </div>
  );
}
