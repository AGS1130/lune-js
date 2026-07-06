let queued = false;
const queue: Function[] = [];

/**
 * Flushes all deferred microtask jobs sequentially and resets execution locks.
 * @internal
 */
function flushJobs(): void {
  for (const job of queue) {
    job();
  }
  queue.length = 0;
  queued = false;
}

/**
 * Defers execution of a callback function to the end of the current microtask cycle.
 * Effectively guarantees synchronization after a round of reactive data mutation loops.
 * @param fn - Optional function payload to execute asynchronously.
 */
export function nextTick(fn?: () => void): void {
  window.queueMicrotask(() => fn?.());
}

/**
 * Adds a unique job function to the asynchronous scheduling queue to prevent redundant evaluations.
 * Flushes the collection automatically inside a single deferred microtask frame.
 * @param job - The subscriber runtime runner function to register.
 */
export function queueJob(job: Function): void {
  if (!queue.includes(job)) queue.push(job);
  if (!queued) {
    queued = true;
    window.queueMicrotask(flushJobs);
  }
}
