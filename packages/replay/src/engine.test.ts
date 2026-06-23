import { describe, it, expect, vi } from "vitest";
import { cancelReplay, registerReplay } from "../src/cancel-registry.js";

describe("cancelReplay", () => {
  it("aborts registered replay", () => {
    const controller = new AbortController();
    let aborted = false;
    controller.signal.addEventListener("abort", () => {
      aborted = true;
    });
    registerReplay("run-1", controller);
    expect(cancelReplay("run-1")).toBe(true);
    expect(aborted).toBe(true);
  });

  it("returns false for unknown run", () => {
    expect(cancelReplay("unknown")).toBe(false);
  });
});
