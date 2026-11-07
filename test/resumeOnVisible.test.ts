import { describe, it, expect, vi, afterEach } from "vitest";
import { withResumeRetry } from "../src/llm/resumeOnVisible";

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, "hidden", {
    value: hidden,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks(times = 3): Promise<void> {
  for (let i = 0; i < times; i++) await Promise.resolve();
}

describe("withResumeRetry", () => {
  afterEach(() => {
    Object.defineProperty(document, "hidden", {
      value: false,
      configurable: true,
    });
  });

  it("returns the result on success without touching visibility", async () => {
    const fn = vi.fn(async () => "ok");
    const wrapped = withResumeRetry(fn);

    expect(await wrapped()).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("rethrows immediately when the document was never hidden during the call", async () => {
    const fn = vi.fn(async () => {
      throw new Error("boom");
    });
    const wrapped = withResumeRetry(fn);

    await expect(wrapped()).rejects.toThrow("boom");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries once the app becomes visible again after a failure while hidden", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const calls = [first, second];
    let callIndex = 0;
    const fn = vi.fn(() => calls[callIndex++].promise);
    const onWaitingForResume = vi.fn();
    const onRetrying = vi.fn();
    const wrapped = withResumeRetry(fn, { onWaitingForResume, onRetrying });

    setHidden(true);
    const resultPromise = wrapped();

    first.reject(new Error("network dropped"));
    await flushMicrotasks();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(onWaitingForResume).toHaveBeenCalledTimes(1);
    expect(onRetrying).not.toHaveBeenCalled();

    setHidden(false);
    await flushMicrotasks();

    expect(fn).toHaveBeenCalledTimes(2);
    expect(onRetrying).toHaveBeenCalledTimes(1);

    second.resolve("recovered");
    expect(await resultPromise).toBe("recovered");
  });

  it("gives up and rethrows after maxAttempts retries", async () => {
    const attempts = [deferred<string>(), deferred<string>(), deferred<string>()];
    let callIndex = 0;
    const fn = vi.fn(() => attempts[callIndex++].promise);
    const wrapped = withResumeRetry(fn, { maxAttempts: 1 });

    setHidden(true);
    const resultPromise = wrapped().catch((error: unknown) => error);

    attempts[0].reject(new Error("still broken"));
    await flushMicrotasks();
    setHidden(false); // triggers the one allowed retry
    await flushMicrotasks();

    expect(fn).toHaveBeenCalledTimes(2);

    setHidden(true);
    attempts[1].reject(new Error("still broken"));
    await flushMicrotasks();

    // maxAttempts (1) exhausted: rethrows without waiting for visibility again
    const error = await resultPromise;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("still broken");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
