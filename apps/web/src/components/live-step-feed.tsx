"use client";

import type { RawRecordingEvent } from "@openskills/core";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScreenshotThumb } from "@/components/screenshot-thumb";

export function LiveStepFeed({ events }: { events: RawRecordingEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Live steps ({events.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {events.length === 0 && (
            <p className="text-sm text-zinc-500">Perform actions in the browser window to capture steps.</p>
          )}
          {events.map((e) => (
            <div key={e.id} className="rounded-lg border border-zinc-100 p-3 text-sm dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Badge>{e.type}</Badge>
                <span className="text-zinc-500">#{e.sequence}</span>
                {e.selectors[0] && (
                  <span className="truncate text-xs text-zinc-400">
                    {e.selectors[0].strategy}: {e.selectors[0].value}
                  </span>
                )}
              </div>
              {e.visibleText && <p className="mt-1 text-zinc-600">{e.visibleText}</p>}
              <ScreenshotThumb path={e.screenshotPath} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
