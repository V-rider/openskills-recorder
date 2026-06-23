"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

interface Settings {
  artifactDir?: string;
  llmEnabled: boolean;
  llmProvider: "ollama" | "openai-compatible";
  ollamaBaseUrl: string;
  openaiBaseUrl: string;
  openaiApiKey?: string;
  openaiModel: string;
  ollamaModel: string;
  domainBlacklist: string[];
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [blacklist, setBlacklist] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setBlacklist((data.domainBlacklist ?? []).join(", "));
      });
  }, []);

  async function handleSave() {
    if (!settings) return;
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        domainBlacklist: blacklist.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    setSettings(data);
    setMessage("Settings saved");
  }

  if (!settings) return <p>Loading...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader><CardTitle>LLM enhancement (optional)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.llmEnabled}
              onChange={(e) => setSettings({ ...settings, llmEnabled: e.target.checked })}
            />
            Enable LLM enhancement during synthesis
          </label>
          <div className="space-y-2">
            <Label>Provider</Label>
            <select
              className="h-10 w-full rounded-md border px-3 text-sm"
              value={settings.llmProvider}
              onChange={(e) =>
                setSettings({ ...settings, llmProvider: e.target.value as Settings["llmProvider"] })
              }
            >
              <option value="ollama">Ollama (local)</option>
              <option value="openai-compatible">OpenAI-compatible API</option>
            </select>
          </div>
          {settings.llmProvider === "ollama" ? (
            <div className="space-y-2">
              <Label>Ollama base URL</Label>
              <Input
                value={settings.ollamaBaseUrl}
                onChange={(e) => setSettings({ ...settings, ollamaBaseUrl: e.target.value })}
              />
              <Label>Model</Label>
              <Input
                value={settings.ollamaModel}
                onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>API base URL</Label>
              <Input
                value={settings.openaiBaseUrl}
                onChange={(e) => setSettings({ ...settings, openaiBaseUrl: e.target.value })}
              />
              <Label>API key</Label>
              <Input
                type="password"
                value={settings.openaiApiKey ?? ""}
                onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
              />
              <Label>Model</Label>
              <Input
                value={settings.openaiModel}
                onChange={(e) => setSettings({ ...settings, openaiModel: e.target.value })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Storage</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label>Artifact directory (optional)</Label>
          <Input
            value={settings.artifactDir ?? ""}
            onChange={(e) => setSettings({ ...settings, artifactDir: e.target.value || undefined })}
            placeholder="~/.openskills/artifacts (default)"
          />
          <p className="text-xs text-zinc-500">Recordings, skills, and screenshots are stored here.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Privacy</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label>Domain blacklist (comma-separated)</Label>
          <Input value={blacklist} onChange={(e) => setBlacklist(e.target.value)} placeholder="bank.com, internal.corp" />
          <p className="text-xs text-zinc-500">Recording will be blocked on these domains.</p>
        </CardContent>
      </Card>

      <Button onClick={handleSave}>Save settings</Button>
      {message && <p className="text-sm text-green-600">{message}</p>}
    </div>
  );
}
