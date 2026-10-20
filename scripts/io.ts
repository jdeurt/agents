import { chmod } from "node:fs/promises";

/**
Read a file as UTF-8 text or as bytes through Bun.
@param file - Filesystem path or file URL to read.
@param encoding - UTF-8 selects text output. Omit it to read bytes.
@returns The UTF-8 text when the caller selects encoding, or the file bytes as a buffer.
*/
export function readFile(file: string | URL, encoding: "utf8"): Promise<string>;
export function readFile(file: string | URL): Promise<Buffer>;
export async function readFile(file: string | URL, encoding?: "utf8"): Promise<string | Buffer> {
  const source = Bun.file(file);

  return encoding ? source.text() : Buffer.from(await source.arrayBuffer());
}

/**
Write file contents through Bun and apply an explicit mode when provided.
@param file - Filesystem path or file URL to write.
@param data - Text or bytes to write.
@param options - Optional file mode to apply after the write.
*/
export async function writeFile(file: string | URL, data: string | Uint8Array, options?: { mode: number }) {
  await Bun.write(file, data);

  if (options?.mode !== undefined) {
    await chmod(file, options.mode);
  }
}
