import { chmod } from "node:fs/promises";

export function readFile(file: string | URL, encoding: "utf8"): Promise<string>;
export function readFile(file: string | URL): Promise<Buffer>;
export async function readFile(file: string | URL, encoding?: "utf8"): Promise<string | Buffer> {
  const source = Bun.file(file);

  return encoding ? source.text() : Buffer.from(await source.arrayBuffer());
}
export async function writeFile(file: string | URL, data: string | Uint8Array, options?: { mode: number }) {
  await Bun.write(file, data);

  if (options?.mode !== undefined) await chmod(file, options.mode);
}
