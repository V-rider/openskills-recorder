"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ExportImportDialog({
  skillId,
  onImported,
}: {
  skillId?: string;
  onImported?: (skillId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport(file: File) {
    setMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch("/api/skills/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: parsed.skill ?? parsed }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessage(`Imported skill ${data.skillId}`);
      onImported?.(data.skillId);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleExport() {
    if (!skillId) return;
    const res = await fetch(`/api/skills/${skillId}/export`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skill.zip";
    a.click();
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Import / Export
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Import / Export</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {skillId && (
          <Button variant="outline" onClick={handleExport}>Export zip</Button>
        )}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
        </div>
        {message && <p className="text-sm text-zinc-600">{message}</p>}
      </CardContent>
    </Card>
  );
}
