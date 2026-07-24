import { hasChanged, hasOwn, isArray, isObject, isSymbol, warn } from "@lune-js/utils";
import { arrayInstrumentations } from "./arrayInstrumentations";
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from "./constants";
import { ITERATE_KEY, track, trigger } from "./dep";
import { reactive, reactiveMap, readonly, readonlyMap, shallowReactiveMap, shallowReadonlyMap } from "./reactive";
import type { Target } from "./types";
import { isIntegerKey, isReadonly, isShallow, makeMap, toRaw } from "./utils";

const isNonTrackableKeys = /*@__PURE__*/ makeMap(`__proto__,__isLune`);

const builtInSymbols = new Set(
  /*@__PURE__*/
  Object.getOwnPropertyNames(Symbol)
    // ios10.x Object.getOwnPropertyNames(Symbol) can enumerate 'arguments' and 'caller'
    // but accessing them on Symbol leads to TypeError because Symbol is a strict mode
    // function
    .filter((key) => key !== "arguments" && key !== "caller")
    .map((key) => Symbol[key as keyof SymbolConstructor])
    .filter(isSymbol)
);

function hasOwnProperty(this: object, key: unknown): boolean {
  // https://github.com/vuejs/core/issues/10455
  // hasOwnProperty may be called with non-string values
  if (!isSymbol(key)) key = String(key);
  const obj = toRaw(this);
  track(obj, TrackOpTypes.HAS, key);
  return hasOwn(obj, key as string);
}

/**
 * Intercepts reflective actions against observed targets, delegating `get` executions
 * to dynamic dependency resolution pipelines and `set` mutations to the engine updater loop.
 */
class BaseReactiveHandler implements ProxyHandler<Target> {
  constructor(
    protected readonly _isReadonly = false,
    protected readonly _isShallow = false
  ) {}

  /**
   * Trap for reading property values. Transparently handles nested proxy conversions,
   * skips untrackable keys, tracks reads, and overrides native behavior for array instrumentation.
   */
  get(target: Target, key: string | symbol, receiver: object): any {
    if (key === ReactiveFlags.SKIP) return target[ReactiveFlags.SKIP];

    const isReadonly = this._isReadonly,
      isShallow = this._isShallow;

    switch (key) {
      case ReactiveFlags.IS_REACTIVE:
        return !isReadonly;
      case ReactiveFlags.IS_READONLY:
        return isReadonly;
      case ReactiveFlags.IS_SHALLOW:
        return isShallow;
      case ReactiveFlags.RAW: {
        const proxyObj = (
          isReadonly ? (isShallow ? shallowReadonlyMap : readonlyMap) : isShallow ? shallowReactiveMap : reactiveMap
        ).get(target);

        if (
          receiver === proxyObj ||
          // receiver is not the reactive proxy, but has the same prototype
          // this means the receiver is a user proxy of the reactive proxy
          Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)
        ) {
          return target;
        }

        // early return undefined
        return;
      }
    }

    if (!isReadonly) {
      let fn: Function | undefined;
      if (isArray(target) && (fn = arrayInstrumentations[key])) {
        return fn;
      }

      if (key === "hasOwnProperty") return hasOwnProperty;
    }

    const res = Reflect.get(target, key, receiver);

    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res;
    }

    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key);
    }

    if (isShallow) return res;

    if (isObject(res)) {
      // Convert returned value into a proxy as well. we do the isObject check
      // here to avoid invalid value warning. Also need to lazy access readonly
      // and reactive here to avoid circular dependency.
      return isReadonly ? readonly(res) : reactive(res);
    }

    return res;
  }
}

class MutableReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    super(false, isShallow);
  }

  set(target: Record<string | symbol, unknown>, key: string | symbol, value: unknown, receiver: object): boolean {
    let oldValue = target[key];
    const isArrayWithIntegerKey = isArray(target) && isIntegerKey(key);
    if (!this._isShallow) {
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue);
        value = toRaw(value);
      }
    } else {
      // in shallow mode, objects are set as-is regardless of reactive or not
    }

    const hadKey = isArrayWithIntegerKey ? Number(key) < target.length : hasOwn(target, key);
    const result = Reflect.set(target, key, value, receiver);
    // don't trigger if target is something up in the prototype chain of original
    if (target === toRaw(receiver) && result) {
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value);
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue);
      }
    }
    return result;
  }

  deleteProperty(target: Record<string | symbol, unknown>, key: string | symbol): boolean {
    const hadKey = hasOwn(target, key);
    const oldValue = target[key];
    const result = Reflect.deleteProperty(target, key);
    if (result && hadKey) {
      trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue);
    }
    return result;
  }

  has(target: Record<string | symbol, unknown>, key: string | symbol): boolean {
    const result = Reflect.has(target, key);
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
      track(target, TrackOpTypes.HAS, key);
    }
    return result;
  }

  ownKeys(target: Record<string | symbol, unknown>): (string | symbol)[] {
    track(target, TrackOpTypes.ITERATE, isArray(target) ? "length" : ITERATE_KEY);
    return Reflect.ownKeys(target);
  }
}

class ReadonlyReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    super(true, isShallow);
  }

  set(target: object, key: string | symbol): boolean {
    if (import.meta.env.DEV) {
      warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
    }
    return true;
  }

  deleteProperty(target: object, key: string | symbol): boolean {
    if (import.meta.env.DEV) {
      warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
    }
    return true;
  }
}

export const mutableHandlers: ProxyHandler<object> = /*@__PURE__*/ new MutableReactiveHandler();
export const readonlyHandlers: ProxyHandler<object> = /*@__PURE__*/ new ReadonlyReactiveHandler();

export const shallowReactiveHandlers: MutableReactiveHandler = /*@__PURE__*/ new MutableReactiveHandler(true);

// Props handlers are special in the sense that it should not unwrap top-level
// refs (in order to allow refs to be explicitly passed down), but should
// retain the reactivity of the normal readonly object.
export const shallowReadonlyHandlers: ReadonlyReactiveHandler = /*@__PURE__*/ new ReadonlyReactiveHandler(true);
