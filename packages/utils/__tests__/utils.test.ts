import { describe, it, expect, vi, beforeEach, afterEach } from "bun:test";
import { error, warn, hasChanged, hasOwn } from "../src";

describe("Lune Utils Package", () => {
  describe("Console Logging Utilities", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should log error with [Lune] prefix", () => {
      error("Failed to parse", { technicalDetails: true });
      expect(console.error).toHaveBeenCalledWith("[Lune] ERROR - Failed to parse", { technicalDetails: true });
    });

    it("should log warning with [Lune] prefix", () => {
      warn("Reactive scope fallback activated");
      expect(console.warn).toHaveBeenCalledWith("[Lune] WARN - Reactive scope fallback activated");
    });
  });

  describe("Value Comparison Utilities", () => {
    it("hasChanged should flag true for strict primitive differences", () => {
      expect(hasChanged(1, 2)).toBe(true);
      expect(hasChanged("a", "b")).toBe(true);
    });

    it("hasChanged should identify NaN as unchanged when compared to NaN", () => {
      expect(hasChanged(NaN, NaN)).toBe(false);
    });

    it("hasChanged should return false for identical references or values", () => {
      const obj = {};
      expect(hasChanged(obj, obj)).toBe(false);
      expect(hasChanged(100, 100)).toBe(false);
    });

    it("hasOwn should verify direct object properties correctly", () => {
      const obj = { reactiveKey: true };
      expect(hasOwn(obj, "reactiveKey")).toBe(true);
      expect(hasOwn(obj, "toString")).toBe(false); // Inherited
    });
  });
});
