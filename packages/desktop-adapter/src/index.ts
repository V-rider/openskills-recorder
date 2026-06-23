export class DesktopNotSupportedError extends Error {
  constructor() {
    super("Desktop recording is not yet supported. Use browser tab or session scope.");
    this.name = "DesktopNotSupportedError";
  }
}

export interface DesktopEvent {
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface DesktopRecorder {
  start(opts: Record<string, unknown>): AsyncIterable<DesktopEvent>;
  stop(): Promise<void>;
}

export interface StepResult {
  success: boolean;
  message?: string;
}

export interface DesktopExecutor {
  execute(step: Record<string, unknown>): Promise<StepResult>;
}

export class StubDesktopRecorder implements DesktopRecorder {
  async *start(): AsyncIterable<DesktopEvent> {
    throw new DesktopNotSupportedError();
  }

  async stop(): Promise<void> {
    throw new DesktopNotSupportedError();
  }
}

export class StubDesktopExecutor implements DesktopExecutor {
  async execute(): Promise<StepResult> {
    throw new DesktopNotSupportedError();
  }
}
