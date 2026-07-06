// oxlint-disable typescript/no-for-in-array typescript/no-array-delete unicorn/no-new-array no-unused-expressions
import { describe, expect, test, vi } from "bun:test";
import { effect, reactive } from "../src";
import { isReactive, toRaw } from "../src/utils";

describe("reactiveArray", () => {
  test("should make Array reactive", () => {
    const original = [{ foo: 1 }];
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(original)).toBe(false);
    expect(isReactive(observed[0])).toBe(true);
    // get
    expect(observed[0].foo).toBe(1);
    // has
    expect(0 in observed).toBe(true);
    // ownKeys
    expect(Object.keys(observed)).toEqual(["0"]);
  });

  test("cloned reactive Array should point to observed values", () => {
    const original = [{ foo: 1 }];
    const observed = reactive(original);
    const clone = observed.slice();
    expect(isReactive(clone[0])).toBe(true);
    expect(clone[0]).not.toBe(original[0]);
    expect(clone[0]).toBe(observed[0]);
  });

  test("observed value should proxy mutations to original (Array)", () => {
    const original: any[] = [{ foo: 1 }, { bar: 2 }];
    const observed = reactive(original);
    // set
    const value = { baz: 3 };
    const reactiveValue = reactive(value);
    observed[0] = value;
    expect(observed[0]).toBe(reactiveValue);
    expect(original[0]).toBe(value);
    // delete
    delete observed[0];
    expect(observed[0]).toBeUndefined();
    expect(original[0]).toBeUndefined();
    // mutating methods
    observed.push(value);
    expect(observed[2]).toBe(reactiveValue);
    expect(original[2]).toBe(value);
  });

  test("Array identity methods should work with raw values", () => {
    const raw = {};
    const arr = reactive([{}, {}]);
    arr.push(raw);

    expect(arr.indexOf(raw)).toBe(2);
    expect(arr.indexOf(raw, 3)).toBe(-1);
    expect(arr.includes(raw)).toBe(true);
    expect(arr.includes(raw, 3)).toBe(false);
    expect(arr.lastIndexOf(raw)).toBe(2);
    expect(arr.lastIndexOf(raw, 1)).toBe(-1);

    // should work also for the observed version
    const observed = arr[2];
    expect(arr.indexOf(observed)).toBe(2);
    expect(arr.indexOf(observed, 3)).toBe(-1);
    expect(arr.includes(observed)).toBe(true);
    expect(arr.includes(observed, 3)).toBe(false);
    expect(arr.lastIndexOf(observed)).toBe(2);
    expect(arr.lastIndexOf(observed, 1)).toBe(-1);
  });

  test("Array identity methods should work if raw value contains reactive objects", () => {
    const raw = [];
    const obj = reactive({});
    raw.push(obj);
    const arr = reactive(raw);
    expect(arr.includes(obj)).toBe(true);
  });

  test("Array identity methods should be reactive", () => {
    const obj = {};
    const arr = reactive([obj, {}]);

    let index: number = -1;
    effect(() => {
      index = arr.indexOf(obj);
    });
    expect(index).toBe(0);
    arr.reverse();
    expect(index).toBe(1);
  });

  // only non-existent reactive will try to search by using its raw value
  describe("Array identity methods should not be called more than necessary", () => {
    const identityMethods = ["includes", "indexOf", "lastIndexOf"] as const;

    function instrumentArr(rawTarget: any[]) {
      const mutableTarget = rawTarget as Record<(typeof identityMethods)[number], any>;
      identityMethods.forEach((key) => {
        const spy = vi.fn(rawTarget[key] as any);
        mutableTarget[key] = spy;
      });
    }

    function searchValue(target: any[], ...args: unknown[]) {
      return identityMethods.map((key) => (target[key] as any)(...args));
    }

    function unInstrumentArr(rawTarget: any[]) {
      identityMethods.forEach((key) => {
        (rawTarget[key] as any).mockClear();
        // relink to prototype method
        rawTarget[key] = Array.prototype[key] as any;
      });
    }

    function expectHaveBeenCalledTimes(rawTarget: any[], times: number) {
      identityMethods.forEach((key) => {
        expect(rawTarget[key]).toHaveBeenCalledTimes(times);
      });
    }

    test("should be called once with a non-existent raw value", () => {
      const reactiveArr = reactive([]);
      instrumentArr(toRaw(reactiveArr));
      const searchResult = searchValue(reactiveArr, {});

      expectHaveBeenCalledTimes(toRaw(reactiveArr), 1);
      expect(searchResult).toStrictEqual([false, -1, -1]);

      unInstrumentArr(toRaw(reactiveArr));
    });

    test("should be called once with an existent reactive value", () => {
      const existReactiveValue = reactive({});
      const reactiveArr = reactive([existReactiveValue, existReactiveValue]);

      instrumentArr(toRaw(reactiveArr));
      const searchResult = searchValue(reactiveArr, existReactiveValue);

      expectHaveBeenCalledTimes(toRaw(reactiveArr), 1);
      expect(searchResult).toStrictEqual([true, 0, 1]);

      unInstrumentArr(toRaw(reactiveArr));
    });

    test("should be called twice with a non-existent reactive value", () => {
      const reactiveArr = reactive([]);
      instrumentArr(toRaw(reactiveArr));
      const searchResult = searchValue(reactiveArr, reactive({}));

      expectHaveBeenCalledTimes(toRaw(reactiveArr), 2);
      expect(searchResult).toStrictEqual([false, -1, -1]);

      unInstrumentArr(toRaw(reactiveArr));
    });

    test("should be called twice with a non-existent reactive value, but the raw value exists", () => {
      const existRaw = {};
      const reactiveArr = reactive([existRaw, existRaw]);

      instrumentArr(toRaw(reactiveArr));
      const searchResult = searchValue(reactiveArr, reactive(existRaw));

      expectHaveBeenCalledTimes(toRaw(reactiveArr), 2);
      expect(searchResult).toStrictEqual([true, 0, 1]);

      unInstrumentArr(toRaw(reactiveArr));
    });
  });

  test("delete on Array should not trigger length dependency", () => {
    const arr = reactive([1, 2, 3]);
    const fn = vi.fn();
    effect(() => {
      fn(arr.length);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    delete arr[1];
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("should track hasOwnProperty call with index", () => {
    const original = [1, 2, 3];
    const observed = reactive(original);

    let dummy: boolean | undefined;
    effect(() => {
      dummy = observed.hasOwnProperty(0);
    });

    expect(dummy).toBe(true);

    delete observed[0];
    expect(dummy).toBe(false);
  });

  test("shift on Array should trigger dependency once", () => {
    const arr = reactive([1, 2, 3]);
    const fn = vi.fn();
    effect(() => {
      for (let i = 0; i < arr.length; i++) {
        arr[i];
      }
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);
    arr.shift();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("add existing index on Array should not trigger length dependency", () => {
    const array = new Array(3);
    const observed = reactive(array);
    const fn = vi.fn();
    effect(() => {
      fn(observed.length);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    observed[1] = 1;
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("add non-integer prop on Array should not trigger length dependency", () => {
    const array: any[] & { x?: string } = new Array(3);
    const observed = reactive(array);
    const fn = vi.fn();
    effect(() => {
      fn(observed.length);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    observed.x = "x";
    expect(fn).toHaveBeenCalledTimes(1);
    observed[-1] = "x";
    expect(fn).toHaveBeenCalledTimes(1);
    observed[NaN] = "x";
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // https://github.com/vuejs/core/issues/2427
  test("track length on for ... in iteration", () => {
    const array = reactive([1]);
    let length = "";
    effect(() => {
      length = "";
      for (const key in array) {
        length += key;
      }
    });
    expect(length).toBe("0");
    array.push(1);
    expect(length).toBe("01");
  });

  // https://github.com/vuejs/core/issues/9742
  test("mutation on user proxy of reactive Array", () => {
    const array = reactive<number[]>([]);
    const proxy = new Proxy(array, {});
    proxy.push(1);
    expect(array).toHaveLength(1);
    expect(proxy).toHaveLength(1);
  });

  describe("Array subclasses", () => {
    class SubArray<T> extends Array<T> {
      lastPushed: undefined | T;
      lastSearched: undefined | T;

      push(item: T) {
        this.lastPushed = item;
        return super.push(item);
      }

      indexOf(searchElement: T, fromIndex?: number): number {
        this.lastSearched = searchElement;
        return super.indexOf(searchElement, fromIndex);
      }
    }

    test("calls correct mutation method on Array subclass", () => {
      const subArray = new SubArray(4, 5, 6);
      const observed = reactive(subArray);

      subArray.push(7);
      expect(subArray.lastPushed).toBe(7);
      observed.push(9);
      expect(observed.lastPushed).toBe(9);
    });

    test("calls correct identity-sensitive method on Array subclass", () => {
      const subArray = new SubArray(4, 5, 6);
      const observed = reactive(subArray);
      let index;

      index = subArray.indexOf(4);
      expect(index).toBe(0);
      expect(subArray.lastSearched).toBe(4);

      index = observed.indexOf(6);
      expect(index).toBe(2);
      expect(observed.lastSearched).toBe(6);
    });
  });
});
