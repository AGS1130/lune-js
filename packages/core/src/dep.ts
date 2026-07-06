import { isArray, isSymbol } from "@lune-js/utils";
import { SystemFlags, TrackOpTypes, TriggerOpTypes } from "./constants";
import { onTrack, triggerEventInfos } from "./debug";
import { activeSub, endBatch, link, propagate, shallowPropagate, startBatch } from "./system";
import type { Link, ReactiveNode } from "./types";
import { isIntegerKey } from "./utils";

class Dep implements ReactiveNode {
  _subs: Link | undefined = undefined;
  subsTail: Link | undefined = undefined;
  flags: SystemFlags = SystemFlags.None;

  constructor(
    private map: KeyToDepMap,
    private key: unknown
  ) {}

  get subs(): Link | undefined {
    return this._subs;
  }

  set subs(value: Link | undefined) {
    this._subs = value;
    if (value === undefined) {
      this.map.delete(this.key);
    }
  }
}

// The main WeakMap that stores {target -> key -> dep} connections.
// Conceptually, it's easier to think of a dependency as a Dep class
// which maintains a Set of subscribers, but we simply store them as
// raw Maps to reduce memory overhead.
type KeyToDepMap = Map<any, Dep>;

const targetMap: WeakMap<object, KeyToDepMap> = new WeakMap();

export const ITERATE_KEY: unique symbol = Symbol(import.meta.env.DEV ? "Object iterate" : "");
export const ARRAY_ITERATE_KEY: unique symbol = Symbol(import.meta.env.DEV ? "Array iterate" : "");

/**
 * Connects the active global `effect` subscriber context with a targeted object dependency property.
 * Called inside proxy `get`, `has`, or iteration traps.
 * @param target - The underlying raw object.
 * @param type - The operation flavor (e.g., TrackOpTypes.GET).
 * @param key - The property symbol or identifier string.
 */
export function track(target: object, type: TrackOpTypes, key: unknown): void {
  if (activeSub !== undefined) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()));
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, (dep = new Dep(depsMap, key)));
    }
    if (import.meta.env.DEV) {
      onTrack(activeSub!, {
        target,
        type,
        key
      });
    }
    link(dep, activeSub!);
  }
}

/**
 * Sweeps through registered graph links to evaluate changes and schedule runs for tracking subscribers.
 * Triggered on proxy modifications like `set`, `add`, or `deleteProperty`.
 * @param target - The target raw source tracking the update.
 * @param type - The operation specification (e.g., TriggerOpTypes.SET).
 * @param key - The mutation property indicator.
 * @param newValue - The incoming property assignment.
 * @param oldValue - The prior matching value.
 */
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
): void {
  const depsMap = targetMap.get(target);
  if (!depsMap) return; // never been tracked

  const run = (dep: ReactiveNode | undefined) => {
    if (dep !== undefined && dep.subs !== undefined) {
      if (import.meta.env.DEV) {
        triggerEventInfos.push({
          target,
          type,
          key,
          newValue,
          oldValue,
          oldTarget
        });
      }
      propagate(dep.subs);
      shallowPropagate(dep.subs);
      if (import.meta.env.DEV) {
        triggerEventInfos.pop();
      }
    }
  };

  startBatch();

  if (type === TriggerOpTypes.CLEAR) {
    // collection being cleared
    // trigger all effects for target
    depsMap.forEach(run);
  } else {
    const targetIsArray = isArray(target);
    const isArrayIndex = targetIsArray && isIntegerKey(key);

    if (targetIsArray && key === "length") {
      const newLength = Number(newValue);
      depsMap.forEach((dep, key) => {
        if (key === "length" || key === ARRAY_ITERATE_KEY || (!isSymbol(key) && key >= newLength)) {
          run(dep);
        }
      });
    } else {
      // schedule runs for SET | ADD | DELETE
      if (key !== void 0 || depsMap.has(void 0)) {
        run(depsMap.get(key));
      }

      // schedule ARRAY_ITERATE for any numeric key change (length is handled above)
      if (isArrayIndex) {
        run(depsMap.get(ARRAY_ITERATE_KEY));
      }

      // also run for iteration key on ADD | DELETE
      switch (type) {
        case TriggerOpTypes.ADD: {
          if (!targetIsArray) {
            run(depsMap.get(ITERATE_KEY));
          } else if (isArrayIndex) {
            // new index added to array -> length changes
            run(depsMap.get("length"));
          }
          break;
        }
        case TriggerOpTypes.DELETE: {
          if (!targetIsArray) {
            run(depsMap.get(ITERATE_KEY));
          }
          break;
        }
      }
    }
  }

  endBatch();
}
