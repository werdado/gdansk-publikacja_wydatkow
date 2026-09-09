export async function readText(url: URL, compressed = false): Promise<string> {
  const useGzip = compressed && typeof DecompressionStream !== 'undefined';
  const target = new URL(url);
  if (useGzip) target.pathname += '.gz';
  const response = await fetch(target);
  if (!response.ok) throw new Error(`Nie udało się pobrać danych (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const body = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(body).text();
  }
  return new TextDecoder().decode(bytes);
}
