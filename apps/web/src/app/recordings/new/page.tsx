"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { LiveStepFeed } from "@/components/live-step-feed";
import { useRecordingStore } from "@/lib/recording-store";
import {
  bridgeStartRecording,
  bridgeStopRecording,
  bridgeSynthesize,
  connectRecordingEvents,
  isElectron,
} from "@/lib/desktop-bridge";

const SCOPES = [
  { value: "tab", label: "Browser tab only", desc: "Record interactions in the launched tab" },
  { value: "session", label: "Browser session", desc: "Persistent context across navigations" },
  { value: "desktop", label: "Desktop (coming soon)", desc: "Native app recording — not yet supported", disabled: true },
];

export default function NewRecordingPage() {
  const router = useRouter();
  const { recordingId, events, isRecording, setRecordingId, addEvent, setIsRecording, reset } =
    useRecordingStore();
  const [name, setName] = useState("");
  const [intent, setIntent] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [scope, setScope] = useState("session");
  const [startUrl, setStartUrl] = useState("http://localhost:4321");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isRecording || !recordingId) return;
    const disconnect = connectRecordingEvents(recordingId, (msg) => {
      if (msg.type === "recording:event" && msg.event) {
        addEvent(msg.event);
      }
    });
    return disconnect;
  }, [isRecording, recordingId, addEvent]);

  async function handleStart() {
    setError(null);
    setLoading(true);
    try {
      if (isElectron() && window.openskills) {
        const ok = await window.openskills.dialog.permission();
        if (!ok) return;
      }

      const result = await bridgeStartRecording({
        name,
        intent,
        description: description || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        scope,
        startUrl: startUrl || undefined,
      });

      setRecordingId(result.recordingId);
      setIsRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    if (!recordingId) return;
    setLoading(true);
    setError(null);
    try {
      await bridgeStopRecording(recordingId);
      setIsRecording(false);
      const synth = await bridgeSynthesize(recordingId);
      reset();
      router.push(`/skills/${(synth as { skillId: string }).skillId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Recording</h1>
        <p className="text-zinc-600">Demonstrate a workflow in the browser. We will capture steps and synthesize a skill.</p>
      </div>

      {!isRecording ? (
        <Card>
          <CardHeader>
            <CardTitle>Recording setup</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Skill name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="File expense report" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intent">Short intent</Label>
              <Input id="intent" value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="Upload receipt and submit form" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Domain tags (comma-separated)</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="finance, ops" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startUrl">Start URL</Label>
              <Input id="startUrl" value={startUrl} onChange={(e) => setStartUrl(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Recording scope</Label>
              <div className="grid gap-2 md:grid-cols-3">
                {SCOPES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    disabled={s.disabled}
                    onClick={() => setScope(s.value)}
                    className={`rounded-lg border p-3 text-left text-sm ${
                      scope === s.value ? "border-zinc-900 ring-2 ring-zinc-900" : "border-zinc-200"
                    } ${s.disabled ? "opacity-50" : ""}`}
                  >
                    <div className="font-medium">{s.label}</div>
                    <div className="text-zinc-500">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
            <div className="md:col-span-2">
              <Button
                onClick={handleStart}
                disabled={loading || !name || !intent || scope === "desktop"}
                className="w-full md:w-auto"
              >
                {loading ? "Starting..." : "Start Recording"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="font-medium">Recording in progress</p>
                <p className="text-sm text-zinc-500">ID: {recordingId}</p>
              </div>
              <Button variant="destructive" onClick={handleStop} disabled={loading}>
                {loading ? "Stopping..." : "Stop & Synthesize"}
              </Button>
            </CardContent>
          </Card>
          <LiveStepFeed events={events} />
        </div>
      )}
    </div>
  );
}
