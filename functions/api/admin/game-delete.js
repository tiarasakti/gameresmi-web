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
  const delete_file = !!b.delete_file;

  if (!slug) return json({ error: "slug wajib" }, 400);

  const game = await env.DB.prepare(`SELECT slug, file_key FROM games WHERE slug = ?`).bind(slug).first();
  if (!game) return json({ error: "game tidak ditemukan" }, 404);

  await env.DB.prepare(`DELETE FROM games WHERE slug = ?`).bind(slug).run();

  if (delete_file && game.file_key) {
    await env.FILES.delete(game.file_key);
  }

  return json({ ok: true, deleted: slug, deleted_file: delete_file });
}
