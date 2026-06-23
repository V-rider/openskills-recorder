import pino from "pino";

export function createLogger(name: string) {
  const usePretty =
    process.env.NODE_ENV !== "production" &&
    !process.env.NEXT_RUNTIME &&
    !process.env.OPENSKILLS_NO_PRETTY_LOG;

  return pino({
    name,
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV !== "production" ? "debug" : "info"),
    transport: usePretty
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        }
      : undefined,
  });
}

export const recorderLogger = createLogger("recorder");
export const synthesisLogger = createLogger("synthesis");
export const replayLogger = createLogger("replay");
export const apiLogger = createLogger("api");
