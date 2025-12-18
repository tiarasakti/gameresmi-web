function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ error: "DB binding missing (env.DB)" }, 500);

    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return json({ error: "Expected application/json" }, 400);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);

    const slug = String(body.slug || "").trim();
    if (!slug) return json({ error: "Missing slug" }, 400);

    // kolom yang ada di tabel kamu
    const allowed = {
      title: body.title,
      genre: body.genre,
      platform: body.platform,
      short_desc: body.short_desc,
      is_published: body.is_published,
      sha256: body.sha256,
      cover_url: body.cover_url
    };

    const sets = [];
    const params = [];

    for (const [k, v] of Object.entries(allowed)) {
      if (v === undefined) continue;
      if (k === "is_published") {
        sets.push(`${k} = ?`);
        params.push(v ? 1 : 0);
      } else {
        sets.push(`${k} = ?`);
        params.push(v === null ? null : String(v));
      }
    }

    if (sets.length === 0) return json({ error: "No fields to update" }, 400);

    await env.DB.prepare(`
      UPDATE games
      SET ${sets.join(", ")},
          updated_at = datetime('now')
      WHERE slug = ?
    `).bind(...params, slug).run();

    const item = await env.DB.prepare(`
      SELECT
        title, slug, genre, platform, cover_url,
        file_key, file_name, file_size_bytes, sha256,
        short_desc, is_published, updated_at
      FROM games WHERE slug = ?
    `).bind(slug).first();

    if (!item) return json({ error: "Not found", slug }, 404);
    return json({ ok: true, item });
  } catch (err) {
    return json({ error: "Internal error", details: String(err?.message || err) }, 500);
  }
}

export async function onRequest() {
  return json({ error: "Method not allowed" }, 405);
}
