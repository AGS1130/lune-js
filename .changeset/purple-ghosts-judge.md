---
"@lune-js/core": patch
"lune-js": patch
---

- Fixes bind directives that update existing attributes.
- Fixes reactivity edge case to prevent triggering updates when property assignments fail on protected or read-only properties.
