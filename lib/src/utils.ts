import { isArray, isDate, isObject, isString, isSymbol } from "@lune-js/utils";

/**
 * Metadata structure for storing element-related information
 * This allows us to store additional data without polluting the DOM
 */
interface ElementMetadata {
  /** Original display value for lu-show directive */
  originalDisplay?: string;

  /** Event listeners attached to this element */
  eventListeners?: Map<string, EventListener[]>;

  /** Custom properties stored on this element */
  customProperties?: Map<string, any>;

  /** Original class value for bind directive */
  originalClass?: string;
}

type NormalizedStyle = Record<string, unknown>;

/**
 * WeakMap for storing element metadata
 * Using WeakMap ensures automatic garbage collection when elements are removed
 * This prevents memory leaks in long-running applications
 */
const elementMetadata = new WeakMap<Element, ElementMetadata>();

const listDelimiterRE = /;(?![^(]*\))/g;
const propertyDelimiterRE = /:([^]+)/;
const styleCommentRE = /\/\*[^]*?\*\//g;

export function checkAttr(el: Element, name: string): string | null {
  const val = el.getAttribute(name);
  if (val != null) el.removeAttribute(name);
  return val;
}

/**
 * Retrieves a persistent metadata tracking bag explicitly attached to an active DOM instance.
 * Backed by an efficient garbage-collected global `WeakMap` structure to prevent leaking structural reference memory.
 * @param el - The target DOM element instance.
 * @returns The dedicated instance context metadata object map.
 */
export function getElementMetadata(el: Element): ElementMetadata {
  let metadata = elementMetadata.get(el);
  if (!metadata) {
    metadata = {};
    elementMetadata.set(el, metadata);
  }
  return metadata;
}

export function listen(el: Element, event: string, handler: any, options?: any): void {
  el.addEventListener(event, handler, options);
}

/* Ported from https://github.com/vuejs/core/blob/minor/packages/shared/src/looseEqual.ts */

function looseCompareArrays(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  let equal = true;
  for (let i = 0; equal && i < a.length; i++) {
    equal = looseEqual(a[i], b[i]);
  }
  return equal;
}

export function looseEqual(a: any, b: any): boolean {
  if (a === b) return true;
  let aValidType = isDate(a);
  let bValidType = isDate(b);
  if (aValidType || bValidType) {
    return aValidType && bValidType ? a.getTime() === b.getTime() : false;
  }
  aValidType = isSymbol(a);
  bValidType = isSymbol(b);
  if (aValidType || bValidType) {
    return a === b;
  }
  aValidType = isArray(a);
  bValidType = isArray(b);
  if (aValidType || bValidType) {
    return aValidType && bValidType ? looseCompareArrays(a, b) : false;
  }
  aValidType = isObject(a);
  bValidType = isObject(b);
  if (aValidType || bValidType) {
    if (!aValidType || !bValidType) {
      return false;
    }
    const aKeysCount = Object.keys(a).length;
    const bKeysCount = Object.keys(b).length;
    if (aKeysCount !== bKeysCount) {
      return false;
    }
    for (const key in a) {
      const aHasKey = a.hasOwnProperty(key);
      const bHasKey = b.hasOwnProperty(key);
      if ((aHasKey && !bHasKey) || (!aHasKey && bHasKey) || !looseEqual(a[key], b[key])) {
        return false;
      }
    }
  }
  return String(a) === String(b);
}

export function looseIndexOf(arr: any[], val: any): number {
  return arr.findIndex((item) => looseEqual(item, val));
}

/* Ported from https://github.com/vuejs/core/blob/minor/packages/shared/src/normalizeProp.ts */

function parseStringStyle(cssText: string): NormalizedStyle {
  const ret: NormalizedStyle = {};
  cssText
    .replace(styleCommentRE, "")
    .split(listDelimiterRE)
    .forEach((item) => {
      if (item) {
        const tmp = item.split(propertyDelimiterRE);
        if (tmp.length > 1) {
          ret[tmp[0].trim()] = tmp[1].trim();
        }
      }
    });
  return ret;
}

/**
 * Normalizes user-declared class property descriptors into an explicit clean string fragment.
 * Recursively resolves standard arrays, objects with conditional truthy properties, and simple string tokens.
 * @param value - The data signature containing class assignments.
 * @returns A normalized space-separated className string.
 */
export function normalizeStyle(value: unknown): NormalizedStyle | string | object | undefined {
  if (isArray(value)) {
    const res: NormalizedStyle = {};
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const normalized = isString(item) ? parseStringStyle(item) : (normalizeStyle(item) as NormalizedStyle);
      if (normalized) {
        for (const key in normalized) {
          res[key] = normalized[key];
        }
      }
    }
    return res;
  } else if (isString(value) || isObject(value)) {
    return value;
  }
}

export function normalizeClass(value: unknown): string {
  let res = "";
  if (isString(value)) {
    res = value;
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const normalized = normalizeClass(value[i]);
      if (normalized) {
        res += normalized + " ";
      }
    }
  } else if (isObject(value)) {
    for (const name in value) {
      if (name in value && value[name as keyof typeof value]) {
        res += name + " ";
      }
    }
  }
  return res.trim();
}

export function normalizeProps(props: Record<string, any> | null): Record<string, any> | null {
  if (!props) return null;
  let { class: klass, style } = props;
  if (klass && !isString(klass)) {
    props.class = normalizeClass(klass);
  }
  if (style) {
    props.style = normalizeStyle(style);
  }
  return props;
}

export function toDisplayString(value: any): string {
  if (value == null) return "";

  if (isObject(value)) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "[Object]";
    }
  }

  return String(value);
}
