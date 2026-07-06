import type { Directive } from "@lune-js/context";
import { camelCase, isArray, isString, kebabCase } from "@lune-js/utils";
import { getElementMetadata, normalizeClass, normalizeStyle } from "./utils";

// Properties that should be set as attributes for consistency
const DOM_ATTR_PROPS = new Set(["id", "title", "lang", "dir"]);

const forceAttrRE = /^(spellcheck|draggable|form|list|type)$/;
const importantRE = /\s*!important$/;

/**
 * Drives dynamic reactive data synchronization to specific element elements via attribute properties.
 * normalizes complex class and layout style objects, maps explicit attribute fallbacks, and establishes
 * tracking side effects to synchronize raw properties instantly upon mutation updates.
 */
export const bind: Directive<Element> = ({ el, get, effect, arg, modifiers }) => {
  let prevValue: any;

  // Record static class in metadata instead of on element
  if (arg === "class") {
    const metadata = getElementMetadata(el);
    metadata.originalClass = el.className;
  }

  effect(() => {
    let value = get();
    if (arg) {
      if (modifiers?.camel) {
        arg = camelCase(arg);
      }
      setProp(el, arg, value, prevValue, modifiers?.camel);
    } else {
      for (const key in value) {
        setProp(el, key, value[key], prevValue?.[key]);
      }
      for (const key in prevValue) {
        if (!value || !(key in value)) {
          setProp(el, key, null);
        }
      }
    }
    prevValue = value;
  });
};

function handleClass(el: Element, value: any): void {
  const metadata = getElementMetadata(el);
  const originalClass = metadata.originalClass;
  const newClass = normalizeClass(originalClass ? [originalClass, value] : value) ?? "";
  el.setAttribute("class", newClass);
}

function handleStyle(el: HTMLElement, value: any, prevValue?: any): void {
  value = normalizeStyle(value);
  if (!value) {
    el.removeAttribute("style");
  } else if (isString(value)) {
    if (value !== prevValue) el.style.cssText = value;
  } else {
    for (const key in value) {
      setStyle(el.style, key, value[key]);
    }
    if (prevValue && !isString(prevValue)) {
      for (const key in prevValue) {
        if (value[key] == null) {
          setStyle(el.style, key, "");
        }
      }
    }
  }
}

function setElementAttribute(el: Element, key: string, value: any): void {
  if (key === "true-value") {
    (el as any)._trueValue = value;
  } else if (key === "false-value") {
    (el as any)._falseValue = value;
  } else if (value != null) {
    el.setAttribute(key, value);
  } else {
    el.removeAttribute(key);
  }
}

function setElementProperty(el: Element, key: string, value: any): void {
  if (DOM_ATTR_PROPS.has(key)) {
    if (value == null) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, value);
    }
  } else {
    (el as any)[key] = value;
    if (key === "value") {
      (el as any)._value = value;
    }
  }
}

function setProp(el: Element & { _class?: string }, key: string, value: any, prevValue?: any, isCamel?: boolean): void {
  switch (key) {
    case "class":
      handleClass(el, value);
      break;
    case "style":
      handleStyle(el as HTMLElement, value, prevValue);
      break;
    default: {
      if (shouldSetProperty(el, key, isCamel)) {
        setElementProperty(el, key, value);
      } else {
        setElementAttribute(el, key, value);
      }
      break;
    }
  }
}

// Use modern CSS custom properties API
function setStyle(style: CSSStyleDeclaration, name: string, val: string | string[]): void {
  if (isArray(val)) {
    val.forEach((v) => setStyle(style, name, v));
  } else if (name.startsWith("--")) {
    style.setProperty(name, val);
  } else if (importantRE.test(val)) {
    // !important
    style.setProperty(kebabCase(name), val.replace(importantRE, ""), "important");
  } else {
    style[name as any] = val;
  }
}

function shouldSetProperty(el: Element, key: string, isCamel?: boolean): boolean {
  return (
    key !== "class" &&
    key !== "style" &&
    !(el instanceof SVGElement) &&
    (key in el || !!isCamel) &&
    !forceAttrRE.test(key)
  );
}
