export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

interface TimeoutHandle {
  promise: Promise<never>;
  cancel: () => void;
}

/**
 * A timeout that only counts down while the document is visible. On mobile,
 * the WebView hosting Obsidian can suspend JS execution while the app is
 * backgrounded; a plain setTimeout scheduled before that happens fires the
 * instant the app returns to the foreground, even though almost none of the
 * configured duration actually elapsed while visible. Pausing the countdown
 * on `visibilitychange` and resuming the remaining budget avoids treating a
 * backgrounded app as a dead request.
 */
export function createVisibilityAwareTimeout(
  timeoutMs: number,
  message: string,
): TimeoutHandle {
  const hasDocument = typeof document !== "undefined";

  let remainingMs = timeoutMs;
  let timer: number | null = null;
  let segmentStartedAt = Date.now();
  let settled = false;
  let reject: (reason: unknown) => void = () => {};

  const promise = new Promise<never>((_resolve, rejectFn) => {
    reject = rejectFn;
  });

  const stopTimer = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const detach = () => {
    if (hasDocument) {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };

  const pause = () => {
    if (timer === null) return;
    remainingMs = Math.max(remainingMs - (Date.now() - segmentStartedAt), 0);
    stopTimer();
  };

  const resume = () => {
    if (settled || timer !== null) return;
    segmentStartedAt = Date.now();
    timer = window.setTimeout(() => {
      settled = true;
      detach();
      reject(new TimeoutError(message));
    }, remainingMs);
  };

  function onVisibilityChange(): void {
    if (document.hidden) {
      pause();
    } else {
      resume();
    }
  }

  if (hasDocument) {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
  if (!hasDocument || !document.hidden) {
    resume();
  }

  const cancel = () => {
    settled = true;
    stopTimer();
    detach();
  };

  return { promise, cancel };
}

/**
 * Races `promise` against a {@link createVisibilityAwareTimeout}, always
 * cancelling the timeout afterwards so its timer and listener don't linger.
 */
export async function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  const handle = createVisibilityAwareTimeout(timeoutMs, message);
  try {
    return await Promise.race([promise, handle.promise]);
  } finally {
    handle.cancel();
  }
}
