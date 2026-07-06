export { isArray, isObject, toNumber, toString } from "es-toolkit/compat";
export { isDate, isFunction, isString, isSymbol } from "es-toolkit/predicate";
export { camelCase, kebabCase } from "es-toolkit/string";

/**
 * Logs an error message to the console prefixed with the [Lune] tag.
 * @param msg - The error message string.
 * @param args - Additional arguments or data to log alongside the error.
 */
export function error(msg: string, ...args: any[]): void {
  console.error(`[Lune] ERROR - ${msg}`, ...args);
}

/**
 * Compares two values to see if they have changed, correctly handling NaN comparisons.
 * @param value - The current value.
 * @param oldValue - The previous value to compare against.
 * @returns True if the values are different, false otherwise.
 */
export function hasChanged(value: any, oldValue: any): boolean {
  return !Object.is(value, oldValue);
}

/**
 * Checks if an object has a specific property as its own (not inherited).
 * @param val - The target object.
 * @param key - The property key or symbol to check.
 * @returns True if the property exists directly on the object.
 */
export function hasOwn(val: object, key: string | symbol): key is keyof typeof val {
  return Object.prototype.hasOwnProperty.call(val, key);
}

/**
 * Logs a warning message to the console prefixed with the [Lune] tag.
 * @param msg - The warning message string.
 * @param args - Additional arguments or data to log alongside the warning.
 */
export function warn(msg: string, ...args: any[]): void {
  console.warn(`[Lune] WARN - ${msg}`, ...args);
}
