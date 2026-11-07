export interface ResumeRetryOptions {
  /** Extra attempts after the first failure, only while backgrounding was involved. Default 2. */
  maxAttempts?: number;
  onWaitingForResume?: () => void;
  onRetrying?: () => void;
}

/**
 * Wraps an async function so that, if it rejects after the document was
 * hidden at any point during the call, it is retried once the app becomes
 * visible again instead of surfacing the error immediately. A failure that
 * happened while the app was always in the foreground is rethrown as-is, so
 * normal errors (invalid request, rate limit, a genuine timeout) are
 * unaffected: this only smooths over the case where backgrounding the app
 * plausibly killed the connection.
 */
export function withResumeRetry<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
  options: ResumeRetryOptions = {},
): (...args: Args) => Promise<R> {
  const maxAttempts = options.maxAttempts ?? 2;

  return async (...args: Args): Promise<R> => {
    for (let attempt = 0; ; attempt++) {
      const tracker = trackHiddenDuringCall();
      try {
        const result = await fn(...args);
        tracker.stop();
        return result;
      } catch (error) {
        const wasBackgrounded = tracker.stop();
        if (!wasBackgrounded || attempt >= maxAttempts) throw error;
        options.onWaitingForResume?.();
        await waitUntilVisible();
        options.onRetrying?.();
      }
    }
  };
}

function trackHiddenDuringCall(): { stop: () => boolean } {
  const hasDocument = typeof document !== "undefined";
  let wasHidden = hasDocument && document.hidden;

  const onVisibilityChange = () => {
    if (document.hidden) wasHidden = true;
  };

  if (hasDocument) {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  return {
    stop: () => {
      if (hasDocument) {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
      return wasHidden;
    },
  };
}

function waitUntilVisible(): Promise<void> {
  if (typeof document === "undefined" || !document.hidden) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const onVisibilityChange = () => {
      if (!document.hidden) {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        resolve();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
  });
}
