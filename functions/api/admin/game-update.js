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

  const sets = [];
  const binds = [];

  // update field kalau dikirim saja
  if ("title" in b) { sets.push("title = ?"); binds.push(String(b.title || "").trim()); }
  if ("genre" in b) { sets.push("genre = ?"); binds.push(b.genre ? String(b.genre).trim() : null); }
  if ("platform" in b) { sets.push("platform = ?"); binds.push(b.platform ? String(b.platform).trim() : null); }
  if ("cover_url" in b) { sets.push("cover_url = ?"); binds.push(b.cover_url ? String(b.cover_url).trim() : null); }
  if ("short_desc" in b) { sets.push("short_desc = ?"); binds.push(b.short_desc ? String(b.short_desc).trim() : null); }
  if ("is_published" in b) {
    const v = (b.is_published === true || b.is_published === 1 || b.is_published === "1") ? 1 : 0;
    sets.push("is_published = ?");
    binds.push(v);
  }

  if (sets.length === 0) return json({ error: "tidak ada field untuk diupdate" }, 400);

  sets.push("updated_at = datetime('now')");

  await env.DB.prepare(
    `UPDATE games SET ${sets.join(", ")} WHERE slug = ?`
  ).bind(...binds, slug).run();

  const game = await env.DB.prepare(`SELECT * FROM games WHERE slug = ?`).bind(slug).first();
  return json({ ok: true, game });
}
