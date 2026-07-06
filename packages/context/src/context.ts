import type { ReactiveEffectRunner } from "@lune-js/core";
import { effect, reactive } from "@lune-js/core";
import { hasOwn, isFunction } from "@lune-js/utils";
import { queueJob } from "./scheduler";
import type { Context } from "./types";

let inOnce = false;

/**
 * Binds all function properties on a scope object explicitly to the scope instance.
 * Ensures method invocation contexts (`this`) remain stable when called from template bindings or directives.
 * @param scope - The state or methods object containing functions to bind.
 */
export function bindContextMethods(scope: Record<string, any>): void {
  for (const key of Object.keys(scope)) {
    if (isFunction(scope[key])) {
      scope[key] = scope[key].bind(scope);
    }
  }
}

/**
 * Creates a base execution context for template tracking, expressions, and child blocks.
 * If a parent context is provided, it inherits properties from it.
 * @param parent - Optional parent context to inherit rules and parent state boundaries from.
 * @returns A fresh or derived `Context` lifecycle object.
 */
export function createContext(parent?: Context): Context {
  const ctx: Context = {
    delimiters: ["{{", "}}"],
    delimitersRE: /\{\{([^]+?)\}\}/g,
    ...parent,
    scope: parent ? parent.scope : reactive({}),
    dirs: parent ? parent.dirs : {},
    effects: [],
    blocks: [],
    cleanups: [],
    effect: (fn) => {
      if (inOnce) {
        queueJob(fn);
        return fn as any;
      }
      const e: ReactiveEffectRunner = effect(fn, {
        scheduler: () => queueJob(e)
      });
      ctx.effects.push(e);
      return e;
    }
  };
  return ctx;
}

/**
 * Derives a locally scoped child context using prototype-linked fallback logic.
 * Reads fallback to parent scopes automatically, while writes target local scope unless overridden.
 * Special handling ensures template refs (`$refs`) are localized via prototype linking.
 * @param ctx - The current parent context instance.
 * @param data - The localized data object to spawn the scope overlay from.
 * @returns An isolated, prototype-shadowed child context.
 */
export function createScopedContext(ctx: Context, data = {}): Context {
  const parentScope = ctx.scope;
  const mergedScope = Object.create(parentScope);
  Object.defineProperties(mergedScope, Object.getOwnPropertyDescriptors(data));
  mergedScope.$refs =
    typeof parentScope.$refs === "object" || parentScope.$refs === null
      ? Object.create(parentScope.$refs)
      : parentScope.$refs;
  const reactiveProxy = reactive(
    new Proxy(mergedScope, {
      set(target, key, val, receiver) {
        // when setting a property that doesn't exist on current scope,
        // do not create it on the current scope and fallback to parent scope.
        if (receiver === reactiveProxy && !hasOwn(target, key)) {
          return Reflect.set(parentScope, key, val);
        }
        return Reflect.set(target, key, val, receiver);
      }
    })
  );

  bindContextMethods(reactiveProxy);
  return {
    ...ctx,
    scope: reactiveProxy
  };
}

export function setInOnce(bool: boolean): void {
  inOnce = bool;
}
