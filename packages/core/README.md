# @lune-js/core

The core reactive package for Lune.js.

## Acknowledgements

This package is a modified port of the upcoming minor release
<a href="https://github.com/vuejs/core/tree/minor/packages/reactivity" target="_blank">`@vue/reactivity`</a>
that introduces <a href="https://github.com/stackblitz/alien-signals" target="_blank">Alien Signals</a>.

In an effort to provide a lightweight and focused reactive implementation, this package excludes the following:

- All [`ref`](https://vuejs.org/api/reactivity-core.html#ref) related APIs, including `shallowRef`, `triggerRef`, and `unref`.
- [`computed`](https://vuejs.org/api/reactivity-core.html#computed)
- [`effectScope`](https://vuejs.org/api/reactivity-advanced.html#effectscope)
- [`watch`](https://vuejs.org/api/reactivity-core.html#watch)
- The ability to use collections (e.g., `Map`, `Set`, `WeakMap`, `WeakSet`) as reactive sources.

For more robust functionality and features, **it is recommended to install [`@vue/reactivity`](https://www.npmjs.com/package/@vue/reactivity)**.
