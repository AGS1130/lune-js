import { stop } from "@lune-js/core";
import { error } from "@lune-js/utils";
import { createContext } from "./context";
import type { Context } from "./types";

export class Block {
  ctx: Context;
  template: Element | DocumentFragment;
  key?: any;
  parentCtx?: Context;
  isFragment: boolean;
  start?: Text;
  end?: Text;

  constructor(
    template: Element,
    parentCtx: Context,
    walk: (node: Node, ctx: Context) => ChildNode | null | void,
    isRoot = false
  ) {
    this.isFragment = template instanceof HTMLTemplateElement;

    if (isRoot) {
      this.template = template;
    } else if (this.isFragment) {
      this.template = (template as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment;
    } else {
      this.template = template.cloneNode(true) as Element;
    }

    if (isRoot) {
      this.ctx = parentCtx;
    } else {
      // create child context
      this.parentCtx = parentCtx;
      parentCtx.blocks.push(this);
      this.ctx = createContext(parentCtx);
    }

    walk(this.template, this.ctx);
  }

  get el(): Element | Text {
    return this.start ?? (this.template as Element);
  }

  insert(parent: ParentNode, anchor: Node | null = null) {
    if (parent == null) return;

    if (this.isFragment) {
      if (this.start) {
        // already inserted, moving
        let node: Node | null = this.start;
        let next: Node | null;

        while (node) {
          next = node.nextSibling;
          parent.insertBefore(node, anchor);
          if (node === this.end) break;
          node = next;
        }
      } else {
        this.start = new Text("");
        this.end = new Text("");
        parent.insertBefore(this.end, anchor);
        parent.insertBefore(this.start, this.end);
        parent.insertBefore(this.template, this.end);
      }
    } else {
      parent.insertBefore(this.template, anchor);
    }
  }

  remove(): void {
    if (this.parentCtx) {
      remove(this.parentCtx.blocks, this);
    }
    if (this.start) {
      const parent = this.start.parentNode;
      if (parent == null) return;

      let node: Node | null = this.start;
      let next: Node | null;
      while (node) {
        next = node.nextSibling;
        parent.removeChild(node);
        if (node === this.end) break;
        node = next;
      }
    } else {
      this.template.parentNode?.removeChild(this.template);
    }
    this.teardown();
  }

  /**
   * Cleanup all effects and child blocks
   * Enhanced with better error handling and cleanup callbacks
   */
  teardown(): void {
    // Teardown child blocks first (depth-first cleanup)
    for (const child of this.ctx.blocks) {
      try {
        child.teardown();
      } catch (e) {
        if (import.meta.env.DEV) {
          error("Failed tear down of child block:", e);
        }
      }
    }

    // Stop all reactive effects
    for (const effect of this.ctx.effects) {
      try {
        stop(effect);
      } catch (e) {
        if (import.meta.env.DEV) {
          error("Failed stop effect:", e);
        }
      }
    }

    // Run cleanup callbacks
    for (const cleanup of this.ctx.cleanups) {
      try {
        cleanup();
      } catch (e) {
        if (import.meta.env.DEV) {
          error("Failed cleanup callback:", e);
        }
      }
    }

    // Clear arrays to free memory
    this.ctx.blocks.length = 0;
    this.ctx.effects.length = 0;
    this.ctx.cleanups.length = 0;
  }
}

function remove<T>(arr: T[], el: T): void {
  const i = arr.indexOf(el);
  if (i > -1) {
    arr.splice(i, 1);
  }
}
