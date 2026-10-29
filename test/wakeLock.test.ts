import { describe, it, expect, vi, afterEach } from "vitest";
import { requestWakeLock, releaseWakeLock } from "../src/utils/wakeLock";

describe("wakeLock", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("requestWakeLock", () => {
    it("returns null when the Wake Lock API is unavailable", async () => {
      vi.stubGlobal("navigator", {});
      expect(await requestWakeLock()).toBeNull();
    });

    it("requests a screen wake lock when the API is available", async () => {
      const sentinel = { release: vi.fn(), released: false };
      const request = vi.fn().mockResolvedValue(sentinel);
      vi.stubGlobal("navigator", { wakeLock: { request } });

      const result = await requestWakeLock();

      expect(request).toHaveBeenCalledWith("screen");
      expect(result).toBe(sentinel);
    });

    it("returns null and does not throw if the request fails", async () => {
      vi.stubGlobal("navigator", {
        wakeLock: { request: vi.fn().mockRejectedValue(new Error("denied")) },
      });
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      expect(await requestWakeLock()).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe("releaseWakeLock", () => {
    it("does nothing when given null", async () => {
      await expect(releaseWakeLock(null)).resolves.toBeUndefined();
    });

    it("does nothing when the sentinel is already released", async () => {
      const sentinel = { release: vi.fn(), released: true } as unknown as WakeLockSentinel;
      await releaseWakeLock(sentinel);
      expect(sentinel.release).not.toHaveBeenCalled();
    });

    it("releases an active sentinel", async () => {
      const sentinel = { release: vi.fn().mockResolvedValue(undefined), released: false } as unknown as WakeLockSentinel;
      await releaseWakeLock(sentinel);
      expect(sentinel.release).toHaveBeenCalled();
    });

    it("does not throw if release fails", async () => {
      const sentinel = {
        release: vi.fn().mockRejectedValue(new Error("already released")),
        released: false,
      } as unknown as WakeLockSentinel;
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await expect(releaseWakeLock(sentinel)).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
