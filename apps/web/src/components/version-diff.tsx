"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DiffEntry {
  field: string;
  type: "added" | "removed" | "changed";
  before?: unknown;
  after?: unknown;
}

export function VersionDiff({
  diff,
  fromVersion,
  toVersion,
}: {
  diff: DiffEntry[];
  fromVersion: number;
  toVersion: number;
}) {
  if (diff.length === 0) {
    return <p className="text-sm text-zinc-500">No differences between v{fromVersion} and v{toVersion}.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Diff v{fromVersion} → v{toVersion}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-48 overflow-y-auto">
        {diff.map((entry) => (
          <div key={entry.field} className="rounded border p-2 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant={entry.type === "added" ? "success" : entry.type === "removed" ? "destructive" : "warning"}>
                {entry.type}
              </Badge>
              <span className="font-mono">{entry.field}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
