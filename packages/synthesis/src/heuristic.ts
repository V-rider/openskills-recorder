import type { Skill, SkillStep, SkillParameter, RecordingArtifact } from "@openskills/core";
import { hasDynamicId, isWeakSelector } from "@openskills/recorder";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || "value";
}

function inferParameterName(element: Record<string, unknown> | undefined, index: number): string {
  const label = String(element?.name || element?.placeholder || element?.ariaLabel || "");
  if (label) return slugify(label);
  return `param_${index}`;
}

export function synthesizeSkillFromRecording(
  artifact: RecordingArtifact,
  skillId: string,
): Skill {
  const warnings: string[] = [];
  const parameters: SkillParameter[] = [];
  const paramNameSet = new Set<string>();
  const steps: SkillStep[] = [];
  let stepIndex = 0;

  let pendingFill: {
    element?: Record<string, unknown>;
    value: string;
    selectors: SkillStep["selectors"];
    screenshot?: string;
  } | null = null;

  const flushFill = () => {
    if (!pendingFill) return;
    stepIndex += 1;
    const paramName = inferParameterName(pendingFill.element, parameters.length + 1);
    let uniqueName = paramName;
    let n = 1;
    while (paramNameSet.has(uniqueName)) {
      n += 1;
      uniqueName = `${paramName}_${n}`;
    }
    paramNameSet.add(uniqueName);

    parameters.push({
      name: uniqueName,
      type: "string",
      required: true,
      description: `Value for ${pendingFill.element?.name || pendingFill.element?.placeholder || "field"}`,
      example: pendingFill.value,
    });

    const selectors = pendingFill.selectors;
    if (isWeakSelector(selectors)) {
      warnings.push(`Step ${stepIndex}: weak selector for fill field "${uniqueName}"`);
    }

    const el = pendingFill.element;
    if (el?.id && hasDynamicId(String(el.id))) {
      warnings.push(`Step ${stepIndex}: dynamic element id detected`);
    }

    steps.push({
      id: `step-${stepIndex}`,
      action: "fill",
      selectors,
      fallbacks: selectors.slice(1),
      parameterRef: uniqueName,
      retry: { attempts: 3, delayMs: 500 },
      screenshot: pendingFill.screenshot,
      description: `Fill ${uniqueName}`,
    });
    pendingFill = null;
  };

  for (const event of artifact.events) {
    if (event.type === "input") {
      const payload = event.payload as { element?: Record<string, unknown>; value?: string };
      pendingFill = {
        element: payload.element,
        value: String(payload.value ?? ""),
        selectors: event.selectors,
        screenshot: event.screenshotPath,
      };
      continue;
    }

    flushFill();

    if (event.type === "navigate") {
      stepIndex += 1;
      const payload = event.payload as { to?: string };
      steps.push({
        id: `step-${stepIndex}`,
        action: "navigate",
        selectors: [],
        fallbacks: [],
        value: payload.to ?? event.url,
        description: `Navigate to ${payload.to ?? event.url}`,
      });
    } else if (event.type === "click") {
      stepIndex += 1;
      if (isWeakSelector(event.selectors)) {
        warnings.push(`Step ${stepIndex}: weak selector for click`);
      }
      const payload = event.payload as { element?: Record<string, unknown> };
      if (payload.element?.inIframe) {
        warnings.push(`Step ${stepIndex}: interaction inside iframe`);
      }
      steps.push({
        id: `step-${stepIndex}`,
        action: "click",
        selectors: event.selectors,
        fallbacks: event.selectors.slice(1),
        retry: { attempts: 3, delayMs: 500 },
        screenshot: event.screenshotPath,
        description: `Click ${event.visibleText || payload.element?.name || "element"}`,
      });
    } else if (event.type === "change") {
      stepIndex += 1;
      const payload = event.payload as { value?: string };
      steps.push({
        id: `step-${stepIndex}`,
        action: "select",
        selectors: event.selectors,
        fallbacks: event.selectors.slice(1),
        value: payload.value,
        retry: { attempts: 3, delayMs: 500 },
        screenshot: event.screenshotPath,
      });
    } else if (event.type === "file") {
      stepIndex += 1;
      warnings.push(`Step ${stepIndex}: file upload requires manual parameter`);
      const paramName = `file_${parameters.length + 1}`;
      parameters.push({
        name: paramName,
        type: "file",
        required: true,
        description: "Path to file for upload",
      });
      steps.push({
        id: `step-${stepIndex}`,
        action: "upload",
        selectors: event.selectors,
        fallbacks: event.selectors.slice(1),
        parameterRef: paramName,
        retry: { attempts: 2, delayMs: 500 },
      });
    } else if (event.type === "keydown") {
      stepIndex += 1;
      const payload = event.payload as { key?: string };
      steps.push({
        id: `step-${stepIndex}`,
        action: "keypress",
        selectors: [],
        fallbacks: [],
        value: payload.key,
      });
    } else if (event.type === "drag") {
      stepIndex += 1;
      const payload = event.payload as {
        from?: { x: number; y: number };
        to?: { x: number; y: number };
        element?: Record<string, unknown>;
      };
      const from = payload.from;
      const to = payload.to;
      const value = from && to ? `${from.x},${from.y},${to.x},${to.y}` : undefined;
      steps.push({
        id: `step-${stepIndex}`,
        action: "drag",
        selectors: event.selectors,
        fallbacks: event.selectors.slice(1),
        value,
        retry: { attempts: 2, delayMs: 500 },
        screenshot: event.screenshotPath,
        description: `Drag ${payload.element?.name || "element"}`,
      });
    }
  }

  flushFill();

  const firstUrl = artifact.events.find((e) => e.url)?.url;
  const lastUrl = [...artifact.events].reverse().find((e) => e.url)?.url;

  const preconditions = firstUrl
    ? [{ type: "url" as const, rule: firstUrl, message: "Start from recorded entry URL or equivalent" }]
    : [];

  const successCriteria = lastUrl
    ? [{ type: "urlContains" as const, rule: new URL(lastUrl).pathname, message: "Final page reached" }]
    : [];

  return {
    id: skillId,
    name: artifact.name,
    intent: artifact.intent,
    version: 1,
    tags: artifact.tags,
    whenToUse: artifact.intent,
    description: artifact.description,
    parameters,
    preconditions,
    steps,
    successCriteria,
    warnings,
    recordedAt: artifact.endedAt ?? artifact.startedAt,
    sourceRecordingId: artifact.id,
  };
}
