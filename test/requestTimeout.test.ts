import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TimeoutError,
  createVisibilityAwareTimeout,
  raceWithTimeout,
} from "../src/llm/requestTimeout";

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, "hidden", {
    value: hidden,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("createVisibilityAwareTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setHidden(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, "hidden", {
      value: false,
      configurable: true,
    });
  });

  it("rejects with a TimeoutError once the duration elapses while visible", async () => {
    const handle = createVisibilityAwareTimeout(1000, "timed out after 1 minute");
    const result = handle.promise.catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(1000);

    const error = await result;
    expect(error).toBeInstanceOf(TimeoutError);
    expect((error as Error).message).toBe("timed out after 1 minute");
  });

  it("pauses the countdown while the document is hidden", async () => {
    const handle = createVisibilityAwareTimeout(1000, "timed out");
    const rejected = vi.fn();
    handle.promise.catch(rejected);

    await vi.advanceTimersByTimeAsync(400); // 400ms elapsed while visible
    setHidden(true);
    await vi.advanceTimersByTimeAsync(10000); // long stretch backgrounded
    expect(rejected).not.toHaveBeenCalled();

    setHidden(false); // resumes with 600ms remaining
    await vi.advanceTimersByTimeAsync(599);
    expect(rejected).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(rejected).toHaveBeenCalledTimes(1);

    handle.cancel();
  });

  it("does not start counting down while created hidden, until it becomes visible", async () => {
    setHidden(true);
    const handle = createVisibilityAwareTimeout(1000, "timed out");
    const rejected = vi.fn();
    handle.promise.catch(rejected);

    await vi.advanceTimersByTimeAsync(5000);
    expect(rejected).not.toHaveBeenCalled();

    setHidden(false);
    await vi.advanceTimersByTimeAsync(999);
    expect(rejected).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(rejected).toHaveBeenCalledTimes(1);
  });

  it("cancel() prevents the timeout from firing", async () => {
    const handle = createVisibilityAwareTimeout(1000, "timed out");
    const rejected = vi.fn();
    handle.promise.catch(rejected);

    handle.cancel();
    await vi.advanceTimersByTimeAsync(5000);

    expect(rejected).not.toHaveBeenCalled();
  });

  it("cancel() detaches the visibilitychange listener", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const handle = createVisibilityAwareTimeout(1000, "timed out");
    handle.cancel();

    expect(removeSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
  });
});

describe("raceWithTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setHidden(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with the inner promise's value when it finishes first", async () => {
    const inner = Promise.resolve("done");
    const result = await raceWithTimeout(inner, 1000, "timed out");
    expect(result).toBe("done");
  });

  it("rejects with TimeoutError when the inner promise is too slow", async () => {
    const inner = new Promise<string>(() => {}); // never resolves
    const result = raceWithTimeout(inner, 1000, "timed out after 1 minute").catch(
      (error: unknown) => error,
    );

    await vi.advanceTimersByTimeAsync(1000);

    const error = await result;
    expect(error).toBeInstanceOf(TimeoutError);
  });

  it("does not time out an in-flight request just because the app was backgrounded", async () => {
    let resolveInner!: (value: string) => void;
    const inner = new Promise<string>((resolve) => {
      resolveInner = resolve;
    });

    const resultPromise = raceWithTimeout(inner, 1000, "timed out");

    await vi.advanceTimersByTimeAsync(400);
    setHidden(true);
    await vi.advanceTimersByTimeAsync(60000); // app backgrounded for a minute
    setHidden(false);

    resolveInner("completed after resume");
    const result = await resultPromise;

    expect(result).toBe("completed after resume");
  });
});
