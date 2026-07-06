---
"@lune-js/context": patch
"@lune-js/utils": patch
"@lune-js/core": patch
"lune-js": patch
---

Fixes Bun Workspaces issue by removing `"workspace:*"` and `"catalog:"` throughout the monorepo.

```bash
error: Workspace dependency "*" not found

Searched in "./*"

Workspace documentation: https://bun.com/docs/install/workspaces
```
