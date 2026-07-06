import type { MatcherResult, Mock } from "bun:test";
import { afterEach, beforeEach, expect, vi } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

declare module "bun:test" {
  interface Matchers extends CustomMatchers {}
  interface AsymmetricMatchers extends CustomMatchers {}
}
interface CustomMatchers {
  toHaveBeenWarned(): MatcherResult;
  toHaveBeenWarnedLast(): MatcherResult;
  toHaveBeenWarnedTimes(n: number): MatcherResult;
}

expect.extend<CustomMatchers>({
  toHaveBeenWarned(expected) {
    const received = expected as string;
    const passed = warn.mock.calls.some((args) => args[0].includes(received));
    if (passed) {
      asserted.add(received);
      return {
        pass: true,
        message: () => `received "${received}" not to have been warned.`
      };
    } else {
      const msgs = warn.mock.calls.map((args) => args[0]).join("\n - ");
      return {
        pass: false,
        message: () =>
          `received "${received}" to have been warned` +
          (msgs.length ? `.\n\nActual messages:\n\n - ${msgs}` : ` but no warning was recorded.`)
      };
    }
  },

  toHaveBeenWarnedLast(expected) {
    const received = expected as string;
    const passed =
      warn.mock.calls.length > 0 ? warn.mock.calls[warn.mock.calls.length - 1][0].includes(received) : false;
    if (passed) {
      asserted.add(received);
      return {
        pass: true,
        message: () => `received "${received}" not to have been warned last.`
      };
    } else {
      const msgs = warn.mock.calls.map((args) => args[0]).join("\n - ");
      return {
        pass: false,
        message: () => `received "${received}" to have been warned last.\n\nActual messages:\n\n - ${msgs}`
      };
    }
  },

  toHaveBeenWarnedTimes(expected, n: number) {
    const received = expected as string;
    let found = 0;
    warn.mock.calls.forEach((args) => {
      if (args[0].includes(received)) {
        found++;
      }
    });

    if (found === n) {
      asserted.add(received);
      return {
        pass: true,
        message: () => `received "${received}" to have been warned ${n} times.`
      };
    } else {
      return {
        pass: false,
        message: () => `received "${received}" to have been warned ${n} times but got ${found}.`
      };
    }
  }
});

let warn: Mock<{ (...data: any[]): void; (...data: any[]): void }>;
const asserted: Set<string> = new Set();

beforeEach(() => {
  asserted.clear();
  warn = vi.spyOn(console, "warn");
  warn.mockImplementation(() => {});
});

afterEach(() => {
  const assertedArray = Array.from(asserted);
  const nonAssertedWarnings = warn.mock.calls
    .map((args) => args[0])
    .filter((received) => {
      return !assertedArray.some((assertedMsg) => {
        return received.includes(assertedMsg);
      });
    });
  warn.mockRestore();
  if (nonAssertedWarnings.length) {
    throw new Error(`test case threw unreceived warnings:\n - ${nonAssertedWarnings.join("\n - ")}`);
  }
});

GlobalRegistrator.register();
