import { z } from "zod";

export const RecordingScopeSchema = z.enum(["tab", "session", "desktop"]);
export type RecordingScope = z.infer<typeof RecordingScopeSchema>;

export const RecordingStatusSchema = z.enum([
  "pending",
  "recording",
  "stopped",
  "synthesized",
  "failed",
]);
export type RecordingStatus = z.infer<typeof RecordingStatusSchema>;

export const SelectorStrategySchema = z.enum([
  "testid",
  "aria",
  "role",
  "css",
  "text",
  "xpath",
]);
export type SelectorStrategy = z.infer<typeof SelectorStrategySchema>;

export const SelectorCandidateSchema = z.object({
  strategy: SelectorStrategySchema,
  value: z.string(),
  confidence: z.number().min(0).max(1),
});
export type SelectorCandidate = z.infer<typeof SelectorCandidateSchema>;

export const RetryRuleSchema = z.object({
  attempts: z.number().int().min(1).default(3),
  delayMs: z.number().int().min(0).default(500),
});
export type RetryRule = z.infer<typeof RetryRuleSchema>;

export const StepVerifySchema = z.object({
  type: z.enum(["urlContains", "urlMatches", "textVisible", "elementVisible"]),
  rule: z.string(),
  message: z.string().optional(),
});
export type StepVerify = z.infer<typeof StepVerifySchema>;

export const SkillActionSchema = z.enum([
  "navigate",
  "click",
  "fill",
  "select",
  "keypress",
  "drag",
  "upload",
  "wait",
]);
export type SkillAction = z.infer<typeof SkillActionSchema>;

export const SkillStepSchema = z.object({
  id: z.string(),
  action: SkillActionSchema,
  selectors: z.array(SelectorCandidateSchema).default([]),
  fallbacks: z.array(SelectorCandidateSchema).default([]),
  value: z.string().optional(),
  parameterRef: z.string().optional(),
  verify: StepVerifySchema.optional(),
  retry: RetryRuleSchema.optional(),
  screenshot: z.string().optional(),
  description: z.string().optional(),
});
export type SkillStep = z.infer<typeof SkillStepSchema>;

export const SkillParameterSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "file"]),
  required: z.boolean().default(true),
  description: z.string().optional(),
  example: z.string().optional(),
});
export type SkillParameter = z.infer<typeof SkillParameterSchema>;

export const PreconditionSchema = z.object({
  type: z.enum(["url", "auth", "custom"]),
  rule: z.string(),
  message: z.string().optional(),
});
export type Precondition = z.infer<typeof PreconditionSchema>;

export const SuccessCriterionSchema = z.object({
  type: z.enum(["urlContains", "urlMatches", "textVisible", "elementVisible", "custom"]),
  rule: z.string(),
  message: z.string().optional(),
});
export type SuccessCriterion = z.infer<typeof SuccessCriterionSchema>;

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  intent: z.string(),
  version: z.number().int().min(1),
  tags: z.array(z.string()).default([]),
  whenToUse: z.string(),
  description: z.string().optional(),
  parameters: z.array(SkillParameterSchema).default([]),
  preconditions: z.array(PreconditionSchema).default([]),
  steps: z.array(SkillStepSchema),
  successCriteria: z.array(SuccessCriterionSchema).default([]),
  warnings: z.array(z.string()).default([]),
  recordedAt: z.string().optional(),
  sourceRecordingId: z.string().optional(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const RecordingEventTypeSchema = z.enum([
  "click",
  "input",
  "change",
  "keydown",
  "drag",
  "navigate",
  "file",
  "screenshot",
]);
export type RecordingEventType = z.infer<typeof RecordingEventTypeSchema>;

export const RawRecordingEventSchema = z.object({
  id: z.string(),
  sequence: z.number().int(),
  type: RecordingEventTypeSchema,
  timestamp: z.string(),
  url: z.string().optional(),
  payload: z.record(z.unknown()),
  selectors: z.array(SelectorCandidateSchema).default([]),
  screenshotPath: z.string().optional(),
  visibleText: z.string().optional(),
});
export type RawRecordingEvent = z.infer<typeof RawRecordingEventSchema>;

export const RecordingArtifactSchema = z.object({
  id: z.string(),
  name: z.string(),
  intent: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  scope: RecordingScopeSchema,
  startedAt: z.string(),
  endedAt: z.string().optional(),
  events: z.array(RawRecordingEventSchema),
});
export type RecordingArtifact = z.infer<typeof RecordingArtifactSchema>;

export const StartRecordingInputSchema = z.object({
  name: z.string().min(1),
  intent: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  scope: RecordingScopeSchema.default("session"),
  startUrl: z.string().url().optional(),
});
export type StartRecordingInput = z.infer<typeof StartRecordingInputSchema>;

export const ReplayInputSchema = z.object({
  skillVersionId: z.string(),
  inputs: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
  headless: z.boolean().default(false),
});
export type ReplayInput = z.infer<typeof ReplayInputSchema>;

export const AppSettingsSchema = z.object({
  artifactDir: z.string().optional(),
  llmEnabled: z.boolean().default(false),
  llmProvider: z.enum(["ollama", "openai-compatible"]).default("ollama"),
  ollamaBaseUrl: z.string().default("http://localhost:11434"),
  openaiBaseUrl: z.string().default("http://localhost:8080/v1"),
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().default("gpt-4o-mini"),
  ollamaModel: z.string().default("llama3.2"),
  domainBlacklist: z.array(z.string()).default([]),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const SynthesisOptionsSchema = z.object({
  useLlm: z.boolean().default(false),
});
export type SynthesisOptions = z.infer<typeof SynthesisOptionsSchema>;
