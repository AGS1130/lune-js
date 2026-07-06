import type { Directive } from "@lune-js/context";
import type { Block } from "@lune-js/context";

export interface App {
  /** Registers a directive. */
  directive(name: string, def?: Directive): Directive | undefined | App;
  /** Installs a plugin. */
  use(plugin: Plugin, options?: any): App;
  /** Mounts the application to the DOM. */
  mount(el?: string | Element | null): App | undefined;
  /** Unmounts the application. */
  unmount(): void;
  /** The root blocks of the mounted application. */
  readonly rootBlocks: Block[];
  /** The root scope/context of the application. */
  readonly scope: any;
}

type FunctionPlugin<Options = any[]> = PluginInstallFunction<Options> & Partial<ObjectPlugin<Options>>;

type PluginInstallFunction<Options = any[]> = Options extends unknown[]
  ? (app: App, ...options: Options) => any
  : (app: App, options: Options) => any;

export type Plugin<Options extends unknown[] = any[]> = FunctionPlugin<Options> | ObjectPlugin<Options>;

type ObjectPlugin<Options = any[]> = {
  install: PluginInstallFunction<Options>;
};
