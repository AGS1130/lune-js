import type { effect, ReactiveEffectRunner } from "@lune-js/core";
import type { Block } from "./block";

export interface Context {
  key?: any;
  scope: Record<string, any>;
  dirs: Record<string, Directive>;
  blocks: Block[];
  effect: typeof effect;
  effects: ReactiveEffectRunner[];
  cleanups: (() => void)[];
  delimiters: [string, string];
  delimitersRE: RegExp;
}

export interface Directive<T = Element> {
  (ctx: DirectiveContext<T>): (() => void) | void;
}

interface DirectiveContext<T = Element> {
  el: T;
  get: (exp?: string) => any;
  effect: typeof effect;
  exp: string;
  arg?: string | undefined;
  modifiers?: Record<string, true> | undefined;
  ctx: Context;
}
