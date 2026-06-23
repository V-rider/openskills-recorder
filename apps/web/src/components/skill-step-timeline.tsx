"use client";

import type { SkillStep } from "@openskills/core";
import { Badge, SelectorBadge } from "@/components/ui/badge";
import { ScreenshotThumb } from "@/components/screenshot-thumb";

export function SkillStepTimeline({ steps }: { steps: SkillStep[] }) {
  return (
    <div className="relative space-y-0">
      {steps.map((step, i) => (
        <div key={step.id} className="relative flex gap-4 pb-6">
          {i < steps.length - 1 && (
            <div className="absolute left-[11px] top-6 h-full w-px bg-zinc-200 dark:bg-zinc-700" />
          )}
          <div className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 bg-white text-xs font-medium dark:border-zinc-100 dark:bg-zinc-950">
            {i + 1}
          </div>
          <div className="min-w-0 flex-1 rounded-lg border border-zinc-100 p-3 text-sm dark:border-zinc-800">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{step.action}</Badge>
              {step.selectors[0] && <SelectorBadge confidence={step.selectors[0].confidence} />}
            </div>
            {step.description && <p className="mt-1 text-zinc-700 dark:text-zinc-300">{step.description}</p>}
            {step.parameterRef && (
              <p className="mt-1 font-mono text-xs text-zinc-500">{`{{${step.parameterRef}}}`}</p>
            )}
            <ScreenshotThumb path={step.screenshot} />
          </div>
        </div>
      ))}
    </div>
  );
}
