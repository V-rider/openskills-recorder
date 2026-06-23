import type { AppSettings, Skill } from "@openskills/core";

export interface LlmProvider {
  complete(prompt: string): Promise<string>;
}

export function createProvider(settings: AppSettings): LlmProvider {
  if (settings.llmProvider === "ollama") {
    return {
      async complete(prompt: string) {
        const res = await fetch(`${settings.ollamaBaseUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: settings.ollamaModel, prompt, stream: false }),
        });
        if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
        const data = (await res.json()) as { response?: string };
        return data.response ?? "";
      },
    };
  }

  return {
    async complete(prompt: string) {
      const res = await fetch(`${settings.openaiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(settings.openaiApiKey ? { Authorization: `Bearer ${settings.openaiApiKey}` } : {}),
        },
        body: JSON.stringify({
          model: settings.openaiModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI-compatible error: ${res.statusText}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return data.choices?.[0]?.message?.content ?? "";
    },
  };
}

export async function enhanceSkillWithLlm(
  skill: Skill,
  settings: AppSettings,
): Promise<Skill> {
  const provider = createProvider(settings);
  const prompt = `Improve this automation skill metadata. Return ONLY valid JSON with keys: whenToUse (string), description (string), parameters (array with improved name/description fields matching existing names).

Skill:
${JSON.stringify({ whenToUse: skill.whenToUse, description: skill.description, parameters: skill.parameters }, null, 2)}`;

  const response = await provider.complete(prompt);
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return skill;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<Skill>;
    return {
      ...skill,
      whenToUse: parsed.whenToUse ?? skill.whenToUse,
      description: parsed.description ?? skill.description,
      parameters: skill.parameters.map((p) => {
        const improved = parsed.parameters?.find((ip) => ip.name === p.name);
        return improved ? { ...p, ...improved } : p;
      }),
    };
  } catch {
    return skill;
  }
}
