"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Skill, SkillVersion } from "@/types/skill-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ReplayConsole } from "@/components/replay-console";
import { SkillStepTimeline } from "@/components/skill-step-timeline";
import { SkillJsonEditor } from "@/components/skill-json-editor";
import { VersionDiff } from "@/components/version-diff";
import { ExportImportDialog } from "@/components/export-import-dialog";
import { bridgeReplay } from "@/lib/desktop-bridge";

interface DiffEntry {
  field: string;
  type: "added" | "removed" | "changed";
}

export function SkillDetailClient({
  skillId,
  initialData,
}: {
  skillId: string;
  initialData: {
    name: string;
    versions: SkillVersion[];
    currentSkill: Skill | null;
    currentVersionId: string | null;
  };
}) {
  const router = useRouter();
  const [skill, setSkill] = useState<Skill | null>(initialData.currentSkill);
  const [versions, setVersions] = useState(initialData.versions);
  const [jsonText, setJsonText] = useState(JSON.stringify(initialData.currentSkill, null, 2));
  const [selectedVersionId, setSelectedVersionId] = useState(
    initialData.currentVersionId ?? initialData.versions[0]?.id ?? "",
  );
  const [compareVersionId, setCompareVersionId] = useState(initialData.versions[1]?.id ?? "");
  const [diff, setDiff] = useState<DiffEntry[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [replayLogs, setReplayLogs] = useState<
    { stepId: string; sequence: number; status: string; message?: string; details?: Record<string, unknown> }[]
  >([]);
  const [replaying, setReplaying] = useState(false);
  const [runId, setRunId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadVersion = useCallback(async (versionId: string) => {
    const res = await fetch(`/api/skills/versions/${versionId}`);
    if (!res.ok) return;
    const data = await res.json();
    setSkill(data.skill);
    setJsonText(JSON.stringify(data.skill, null, 2));
  }, []);

  const loadDiff = useCallback(async (fromId: string, toId: string) => {
    if (!fromId || !toId || fromId === toId) {
      setDiff([]);
      return;
    }
    const res = await fetch(`/api/skills/versions/${fromId}/diff?against=${toId}`);
    if (!res.ok) return;
    const data = await res.json();
    setDiff(data.diff ?? []);
  }, []);

  useEffect(() => {
    if (skill?.parameters) {
      const defaults: Record<string, string> = {};
      for (const p of skill.parameters) {
        defaults[p.name] = p.example ?? "";
      }
      setInputs(defaults);
    }
  }, [skill]);

  useEffect(() => {
    if (compareVersionId && selectedVersionId) {
      loadDiff(compareVersionId, selectedVersionId);
    }
  }, [compareVersionId, selectedVersionId, loadDiff]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const parsed = JSON.parse(jsonText);
      const res = await fetch(`/api/skills/${skillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: parsed, changelog: "Manual JSON edit" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSkill(data.skill);
      setJsonText(JSON.stringify(data.skill, null, 2));
      setMessage(`Saved as v${data.skill.version}`);
      const refresh = await fetch(`/api/skills/${skillId}`);
      const refreshed = await refresh.json();
      setVersions(refreshed.versions);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleReplay() {
    setReplaying(true);
    setReplayLogs([]);
    setMessage(null);
    setRunId(undefined);
    try {
      const result = await bridgeReplay({
        skillVersionId: selectedVersionId,
        inputs,
        headless: false,
      });
      const typed = result as {
        runId: string;
        stepLogs: typeof replayLogs;
        success: boolean;
      };
      setRunId(typed.runId);
      setReplayLogs(typed.stepLogs);
      setMessage(typed.success ? "Replay succeeded" : "Replay failed");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setReplaying(false);
    }
  }

  async function handleDelete() {
    await fetch(`/api/skills/${skillId}`, { method: "DELETE" });
    router.push("/skills");
  }

  const selectedVersion = versions.find((v) => v.id === selectedVersionId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{initialData.name}</h1>
          <p className="text-zinc-600">{skill?.whenToUse}</p>
        </div>
        <div className="flex gap-2">
          <ExportImportDialog skillId={skillId} />
          <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
          <Button variant="outline" asChild>
            <Link href="/skills">Back</Link>
          </Button>
        </div>
      </div>

      {showDeleteConfirm && (
        <Card className="border-red-200">
          <CardContent className="flex items-center justify-between pt-6">
            <p className="text-sm">Delete this skill? This cannot be undone.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Confirm delete</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {skill?.warnings && skill.warnings.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Warnings</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm text-amber-700">
            {skill.warnings.map((w) => <p key={w}>⚠ {w}</p>)}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Steps</CardTitle></CardHeader>
          <CardContent className="max-h-[28rem] overflow-y-auto">
            {skill?.steps && <SkillStepTimeline steps={skill.steps} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Replay</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Version</Label>
                <select
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={selectedVersionId}
                  onChange={(e) => {
                    setSelectedVersionId(e.target.value);
                    loadVersion(e.target.value);
                  }}
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>v{v.version}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Compare against</Label>
                <select
                  className="h-10 w-full rounded-md border px-3 text-sm"
                  value={compareVersionId}
                  onChange={(e) => setCompareVersionId(e.target.value)}
                >
                  <option value="">—</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>v{v.version}</option>
                  ))}
                </select>
              </div>
            </div>
            {compareVersionId && selectedVersion && (
              <VersionDiff
                diff={diff}
                fromVersion={versions.find((v) => v.id === compareVersionId)?.version ?? 0}
                toVersion={selectedVersion.version}
              />
            )}
            {skill?.parameters.map((p) => (
              <div key={p.name} className="space-y-1">
                <Label>{p.name}</Label>
                <Input
                  value={inputs[p.name] ?? ""}
                  onChange={(e) => setInputs({ ...inputs, [p.name]: e.target.value })}
                />
              </div>
            ))}
            <Button onClick={handleReplay} disabled={replaying || !selectedVersionId}>
              {replaying ? "Running..." : "Run Replay"}
            </Button>
            <ReplayConsole logs={replayLogs} runId={runId} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit skill.json</CardTitle>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save new version"}</Button>
        </CardHeader>
        <CardContent>
          <SkillJsonEditor value={jsonText} onChange={setJsonText} />
          {message && <p className="mt-2 text-sm text-zinc-600">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
