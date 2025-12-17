function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limitRaw = Number(url.searchParams.get("limit") || "15");
  const limit = Math.min(50, Math.max(1, isFinite(limitRaw) ? limitRaw : 15));
  const offset = (page - 1) * limit;

  const q = (url.searchParams.get("q") || "").trim();
  const like = `%${q}%`;

  let total = 0;
  let items = [];

  if (q) {
    const totalRow = await env.DB.prepare(
      `SELECT COUNT(*) as total
       FROM games
       WHERE is_published = 1
         AND (title LIKE ? OR genre LIKE ? OR platform LIKE ?)`
    )
      .bind(like, like, like)
      .first();

    total = Number(totalRow?.total || 0);

    const rows = await env.DB.prepare(
      `SELECT id, title, slug, genre, platform, cover_url, short_desc, file_name, file_size_bytes, updated_at
       FROM games
       WHERE is_published = 1
         AND (title LIKE ? OR genre LIKE ? OR platform LIKE ?)
       ORDER BY datetime(updated_at) DESC
       LIMIT ? OFFSET ?`
    )
      .bind(like, like, like, limit, offset)
      .all();

    items = rows?.results || [];
  } else {
    const totalRow = await env.DB.prepare(
      "SELECT COUNT(*) as total FROM games WHERE is_published = 1"
    ).first();

    total = Number(totalRow?.total || 0);

    const rows = await env.DB.prepare(
      `SELECT id, title, slug, genre, platform, cover_url, short_desc, file_name, file_size_bytes, updated_at
       FROM games
       WHERE is_published = 1
       ORDER BY datetime(updated_at) DESC
       LIMIT ? OFFSET ?`
    )
      .bind(limit, offset)
      .all();

    items = rows?.results || [];
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return json({
    page,
    limit,
    q,
    total,
    totalPages,
    items,
  });
}
