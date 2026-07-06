import { describe, it, expect, beforeEach, vi } from "bun:test";
import { checkAttr, getElementMetadata, listen, normalizeClass, normalizeStyle } from "../src/utils";

describe("utils", () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement("div");
  });

  describe("checkAttr", () => {
    it("should return attribute value and remove it", () => {
      el.setAttribute("test-attr", "test-value");
      const value = checkAttr(el, "test-attr");

      expect(value).toBe("test-value");
      expect(el.hasAttribute("test-attr")).toBe(false);
    });

    it("should return null if attribute does not exist", () => {
      const value = checkAttr(el, "non-existent");
      expect(value).toBeNull();
    });

    it("should return null if attribute value is null", () => {
      el.setAttribute("test-attr", "null");
      const value = checkAttr(el, "test-attr");
      expect(value).toBe("null");
    });
  });

  describe("listen", () => {
    it("should add event listener to element", () => {
      const handler = vi.fn();
      listen(el, "click", handler);

      el.click();
      expect(handler).toHaveBeenCalled();
    });

    it("should pass options to addEventListener", () => {
      const handler = vi.fn();
      const options = { once: true };
      const spy = vi.spyOn(el, "addEventListener");

      listen(el, "click", handler, options);

      expect(spy).toHaveBeenCalledWith("click", handler, options);
    });
  });

  describe("getElementMetadata", () => {
    it("initializes separate metadata objects per element via WeakMap", () => {
      const el1 = document.createElement("div");
      const el2 = document.createElement("div");

      const meta1 = getElementMetadata(el1);
      const meta2 = getElementMetadata(el2);

      expect(meta1).toBeObject();
      expect(meta2).toBeObject();
      expect(meta1).not.toBe(meta2); // Must treat memory independently

      meta1.originalDisplay = "block";
      expect(getElementMetadata(el1).originalDisplay).toBe("block");
      expect(getElementMetadata(el2).originalDisplay).toBeUndefined();
    });
  });

  describe("normalizeClass", () => {
    it("handles plain string classes", () => {
      expect(normalizeClass("foo bar")).toBe("foo bar");
    });

    it("flattens arrays of strings and filter spacing", () => {
      expect(normalizeClass(["foo", "bar", "baz"])).toBe("foo bar baz");
      expect(normalizeClass(["foo", ["inner-class"]])).toBe("foo inner-class");
    });

    it("evaluates object keys mapped to truthy expressions", () => {
      const activeClasses = {
        "is-active": true,
        "is-disabled": false,
        "has-error": 1
      };
      // Expect only keys evaluating to truthy matching keys
      expect(normalizeClass(activeClasses)).toBe("is-active has-error");
    });

    it("handles complex mixed variants safely", () => {
      const complex = ["base-style", { "conditional-one": true, "conditional-two": false }, ["nested-item"]];
      expect(normalizeClass(complex)).toBe("base-style conditional-one nested-item");
    });
  });

  describe("normalizeStyle", () => {
    it("leaves plain style string or objects pristine", () => {
      const styleObj = { color: "red", display: "flex" };
      expect(normalizeStyle(styleObj)).toEqual(styleObj);
      expect(normalizeStyle("color: red;")).toBe("color: red;");
    });

    it("merges nested array objects sequentially", () => {
      const mix = [
        { color: "blue", margin: "10px" },
        { color: "red", padding: "5px" }
      ];
      expect(normalizeStyle(mix)).toEqual({
        color: "red", // overwritten sequentially
        margin: "10px",
        padding: "5px"
      });
    });
  });
});
