const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

function cleanSlug(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const b = await request.json().catch(() => ({}));

  const slug = cleanSlug(b.slug);
  const title = String(b.title || "").trim();
  const file_key = String(b.file_key || "").trim();
  const file_name = String(b.file_name || "").trim();

  if (!slug || !title || !file_key || !file_name) {
    return json({ error: "slug, title, file_key, file_name wajib" }, 400);
  }

  const is_published =
    b.is_published === true || b.is_published === 1 || b.is_published === "1" ? 1 : 0;

  const stmt = env.DB.prepare(`
    INSERT INTO games (
      title, slug, genre, platform, cover_url,
      file_key, file_name, file_size_bytes, sha256,
      short_desc, is_published, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, datetime('now')
    )
    ON CONFLICT(slug) DO UPDATE SET
      title=excluded.title,
      genre=excluded.genre,
      platform=excluded.platform,
      cover_url=excluded.cover_url,
      file_key=excluded.file_key,
      file_name=excluded.file_name,
      file_size_bytes=excluded.file_size_bytes,
      sha256=excluded.sha256,
      short_desc=excluded.short_desc,
      is_published=excluded.is_published,
      updated_at=datetime('now')
  `);

  await stmt
    .bind(
      title,
      slug,
      b.genre ?? null,
      b.platform ?? null,
      b.cover_url ?? null,
      file_key,
      file_name,
      b.file_size_bytes ?? null,
      b.sha256 ?? null,
      b.short_desc ?? null,
      is_published
    )
    .run();

  const game = await env.DB.prepare(`SELECT * FROM games WHERE slug = ?`)
    .bind(slug)
    .first();

  return json({ ok: true, game });
}
