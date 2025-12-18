export async function onRequestGet({ params, env }) {
  const slug = params.slug;

  // contoh: ambil dari R2
  const obj = await env.BUCKET.get(slug);
  if (!obj) {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Content-Type", "application/octet-stream");
  headers.set("Content-Disposition", `attachment; filename="${slug}"`);
  headers.set("Cache-Control", "no-store");

  return new Response(obj.body, { headers });
}
