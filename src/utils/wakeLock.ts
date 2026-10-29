/**
 * Keeps the screen awake while a long transcript fetch/LLM processing run is in
 * progress, using the browser Screen Wake Lock API. On Android this avoids the
 * OS locking the screen mid-fetch, which otherwise suspends Obsidian and can
 * break network requests or chunked LLM processing.
 */
export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  if (!("wakeLock" in navigator)) {
    return null;
  }
  try {
    return await navigator.wakeLock.request("screen");
  } catch (error) {
    console.warn("Failed to acquire screen wake lock:", error);
    return null;
  }
}

export async function releaseWakeLock(
  sentinel: WakeLockSentinel | null,
): Promise<void> {
  if (!sentinel || sentinel.released) {
    return;
  }
  try {
    await sentinel.release();
  } catch (error) {
    console.warn("Failed to release screen wake lock:", error);
  }
}
