function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const b = await request.json().catch(() => ({}));
  const slug = String(b.slug || "").trim();
  const deleteFile = !!b.deleteFile;

  if (!slug) return json({ error: "slug wajib" }, 400);

  // ambil file_key dulu
  const row = await env.DB.prepare(`SELECT file_key FROM games WHERE slug = ?`).bind(slug).first();

  await env.DB.prepare(`DELETE FROM games WHERE slug = ?`).bind(slug).run();

  let r2Deleted = false;
  if (deleteFile && row?.file_key) {
    await env.FILES.delete(row.file_key);
    r2Deleted = true;
  }

  return json({ ok: true, slug, r2Deleted });
}
