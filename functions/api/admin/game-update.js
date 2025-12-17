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

  const allowed = ["title", "genre", "platform", "cover_url", "short_desc", "is_published"];
  const sets = [];
  const args = [];

  for (const k of allowed) {
    if (!(k in b)) continue;

    if (k === "is_published") {
      sets.push(`is_published = ?`);
      args.push(b.is_published ? 1 : 0);
      continue;
    }

    // kosong -> NULL biar rapi
    const v = b[k] === "" ? null : (b[k] ?? null);
    sets.push(`${k} = ?`);
    args.push(v);
  }

  // minimal harus ada yang diubah
  if (sets.length === 0) return json({ error: "tidak ada field untuk diupdate" }, 400);

  sets.push(`updated_at = datetime('now')`);
  args.push(slug);

  await env.DB
    .prepare(`UPDATE games SET ${sets.join(", ")} WHERE slug = ?`)
    .bind(...args)
    .run();

  const game = await env.DB.prepare(`SELECT * FROM games WHERE slug = ?`).bind(slug).first();
  return json({ ok: true, game });
}
