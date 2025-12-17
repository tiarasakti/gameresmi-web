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
  if (!slug) return json({ error: "slug wajib" }, 400);

  const cur = await env.DB.prepare(`SELECT * FROM games WHERE slug = ?`).bind(slug).first();
  if (!cur) return json({ error: "game tidak ditemukan" }, 404);

  const next = {
    title: (b.title ?? cur.title),
    genre: (b.genre ?? cur.genre),
    platform: (b.platform ?? cur.platform),
    short_desc: (b.short_desc ?? cur.short_desc),
    cover_url: (b.cover_url ?? cur.cover_url),
    is_published:
      (b.is_published === true || b.is_published === 1 || b.is_published === "1") ? 1 :
      (b.is_published === false || b.is_published === 0 || b.is_published === "0") ? 0 :
      (cur.is_published ?? 0),
  };

  await env.DB.prepare(`
    UPDATE games SET
      title = ?,
      genre = ?,
      platform = ?,
      short_desc = ?,
      cover_url = ?,
      is_published = ?,
      updated_at = datetime('now')
    WHERE slug = ?
  `).bind(
    String(next.title || slug),
    next.genre ?? null,
    next.platform ?? null,
    next.short_desc ?? null,
    next.cover_url ?? null,
    next.is_published,
    slug
  ).run();

  const game = await env.DB.prepare(`SELECT * FROM games WHERE slug = ?`).bind(slug).first();
  return json({ ok: true, game });
}
