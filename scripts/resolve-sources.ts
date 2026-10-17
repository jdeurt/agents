import { cp, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { syncImports } from "./sync-imports.ts";

export async function withResolvedSources<T>(
  root: string,
  use: (resolved: string) => Promise<T>
): Promise<T> {
  const resolved = await realpath(
    await mkdtemp(path.join(tmpdir(), "agents-sources-"))
  );
  try {
    for (const item of ["plugins", "marketplace.toml", "imports.toml"])
      await cp(path.join(root, item), path.join(resolved, item), {
        recursive: true,
      });
    await syncImports({ root, output: resolved });
    return await use(resolved);
  } finally {
    await rm(resolved, { recursive: true, force: true });
  }
}
