import type { SelectorCandidate } from "@openskills/core";

interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  testId?: string;
  ariaLabel?: string;
  role?: string;
  name?: string;
  placeholder?: string;
  type?: string;
  text?: string;
  xpath?: string;
  inIframe?: boolean;
}

export function buildSelectorCandidates(info: ElementInfo): SelectorCandidate[] {
  const candidates: SelectorCandidate[] = [];

  if (info.testId) {
    candidates.push({
      strategy: "testid",
      value: `[data-testid="${info.testId}"]`,
      confidence: 0.95,
    });
  }

  if (info.ariaLabel) {
    candidates.push({
      strategy: "aria",
      value: `[aria-label="${info.ariaLabel}"]`,
      confidence: 0.9,
    });
  }

  if (info.role && info.name) {
    candidates.push({
      strategy: "role",
      value: `role=${info.role}[name="${info.name}"]`,
      confidence: 0.88,
    });
  }

  if (info.id && !info.id.match(/^(react|mui|ember|ng)-/)) {
    candidates.push({
      strategy: "css",
      value: `#${info.id}`,
      confidence: 0.75,
    });
  }

  if (info.text && info.text.length < 80) {
    candidates.push({
      strategy: "text",
      value: info.text.trim(),
      confidence: 0.7,
    });
  }

  if (info.className) {
    const classes = info.className.split(/\s+/).filter(Boolean).slice(0, 2);
    if (classes.length > 0) {
      candidates.push({
        strategy: "css",
        value: `${info.tagName}.${classes.join(".")}`,
        confidence: 0.5,
      });
    }
  }

  if (info.xpath) {
    candidates.push({
      strategy: "xpath",
      value: info.xpath,
      confidence: 0.35,
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

export function isWeakSelector(candidates: SelectorCandidate[]): boolean {
  if (candidates.length === 0) return true;
  return candidates[0]!.confidence < 0.6;
}

export function hasDynamicId(id?: string): boolean {
  if (!id) return false;
  return /[0-9a-f]{8,}|[0-9]{4,}/i.test(id);
}
