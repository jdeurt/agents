import { cp, mkdtemp, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { syncImports } from "./sync-imports.ts";
import { tmpdir } from "node:os";

/**
Copy authored packaging inputs into a temporary source tree.
@param root - Authored repository containing build inputs.
@param resolved - Temporary destination for the copied inputs.
*/
async function copySources(root: string, resolved: string) {
  for (const item of ["plugins", "eslint.config.ts", "prettier.config.mjs", "marketplace.toml", "imports.toml"]) {
    await cp(path.join(root, item), path.join(resolved, item), {
      recursive: true,
    });
  }
}

/**
Resolve imports into temporary sources for one callback.
@param root - Authored repository whose sources remain unchanged.
@param use - Operation that receives the resolved source directory.
@returns The callback result after cleanup of its temporary source tree.
*/
export async function withResolvedSources<T>(root: string, use: (resolved: string) => Promise<T>): Promise<T> {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "agents-sources-"));
  const resolved = await realpath(temporaryDirectory);

  try {
    await copySources(root, resolved);

    await syncImports({ root, output: resolved });

    return await use(resolved);
  } finally {
    await rm(resolved, { recursive: true, force: true });
  }
}
