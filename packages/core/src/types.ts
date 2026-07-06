import type { ReactiveFlags, SystemFlags, TrackOpTypes, TriggerOpTypes } from "./constants";
import type { ReactiveEffect } from "./effect";

interface DebuggerOptions {
  onTrack?: (event: DebuggerEvent) => void;
  onTrigger?: (event: DebuggerEvent) => void;
}

export type DebuggerEventExtraInfo = {
  target: object;
  type: TrackOpTypes | TriggerOpTypes;
  key: any;
  newValue?: any;
  oldValue?: any;
  oldTarget?: Map<any, any> | Set<any> | undefined;
};

export type DebuggerEvent = {
  effect: ReactiveNode;
} & DebuggerEventExtraInfo;

type EffectScheduler = (...args: any[]) => any;

export interface Link {
  version: number;
  dep: ReactiveNode | ReactiveEffect;
  sub: ReactiveNode | ReactiveEffect;
  prevSub: Link | undefined;
  nextSub: Link | undefined;
  prevDep: Link | undefined;
  nextDep: Link | undefined;
}

export interface ReactiveEffectOptions extends DebuggerOptions {
  scheduler?: EffectScheduler | undefined;
  onStop?: (() => void) | undefined;
}

export interface ReactiveEffectRunner<T = any> {
  (): T;
  effect: ReactiveEffect;
}

export interface ReactiveNode {
  deps?: Link | undefined;
  depsTail?: Link | undefined;
  subs?: Link | undefined;
  subsTail?: Link | undefined;
  flags: SystemFlags;
}

export interface Target {
  [ReactiveFlags.SKIP]?: boolean;
  [ReactiveFlags.IS_REACTIVE]?: boolean;
  [ReactiveFlags.IS_READONLY]?: boolean;
  [ReactiveFlags.IS_SHALLOW]?: boolean;
  [ReactiveFlags.RAW]?: any;
}

// only unwrap nested ref
export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRefSimple<T>;

declare const RefSymbol: unique symbol;

export interface Ref<T = any, S = T> {
  get value(): T;
  set value(_: S);
  /**
   * Type differentiator only.
   * We need this to be in public d.ts but don't want it to show up in IDE
   * autocomplete, so we use a private Symbol instead.
   */
  [RefSymbol]: true;
}

declare const ShallowRefMarker: unique symbol;

export type ShallowRef<T = any, S = T> = Ref<T, S> & {
  [ShallowRefMarker]?: true;
};

type Primitive = string | number | boolean | bigint | symbol | undefined | null;
type Builtin = Primitive | Function | Date | Error | RegExp;

// Use a private class brand instead of a marker property so shallow-reactive
// types remain distinguishable in `UnwrapRef` without leaking the brand into
// `keyof`/indexed access types or requiring the property for plain assignment.
declare class ShallowReactiveBrandClass {
  private __shallowReactiveBrand?: never;
}

type ShallowReactiveBrand = ShallowReactiveBrandClass;

declare const RawSymbol: unique symbol;

type UnwrapRef<T> =
  T extends ShallowRef<infer V, unknown>
    ? V
    : T extends Ref<infer V, unknown>
      ? UnwrapRefSimple<V>
      : UnwrapRefSimple<T>;

type UnwrapRefSimple<T> = T extends Builtin | Ref | { [RawSymbol]?: true }
  ? T
  : T extends ShallowReactiveBrand
    ? T
    : T extends Map<infer K, infer V>
      ? Map<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof Map<any, any>>>
      : T extends WeakMap<infer K, infer V>
        ? WeakMap<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof WeakMap<any, any>>>
        : T extends Set<infer V>
          ? Set<UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof Set<any>>>
          : T extends WeakSet<infer V>
            ? WeakSet<UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof WeakSet<any>>>
            : T extends ReadonlyArray<any>
              ? { [K in keyof T]: UnwrapRefSimple<T[K]> }
              : T extends object
                ? {
                    [P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]>;
                  }
                : T;

export type CollectionTypes = IterableCollections | WeakCollections;

export type IterableCollections = (Map<any, any> | Set<any>) & Target;
type WeakCollections = (WeakMap<any, any> | WeakSet<any>) & Target;
export type SetTypes = (Set<any> | WeakSet<any>) & Target;

export type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends WeakMap<infer K, infer V>
        ? WeakMap<DeepReadonly<K>, DeepReadonly<V>>
        : T extends Set<infer U>
          ? ReadonlySet<DeepReadonly<U>>
          : T extends ReadonlySet<infer U>
            ? ReadonlySet<DeepReadonly<U>>
            : T extends WeakSet<infer U>
              ? WeakSet<DeepReadonly<U>>
              : T extends Promise<infer U>
                ? Promise<DeepReadonly<U>>
                : T extends Ref<infer U, unknown>
                  ? Readonly<Ref<DeepReadonly<U>>>
                  : T extends {}
                    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
                    : Readonly<T>;
