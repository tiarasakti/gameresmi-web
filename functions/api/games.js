function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  const url = new URL(request.url);
  const page = clamp(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1, 999999);
  const limit = clamp(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1, 100);
  const q = (url.searchParams.get("q") || "").trim();
  const genre = (url.searchParams.get("genre") || "").trim();
  const published = (url.searchParams.get("published") || "all").trim(); // all | 1 | 0

  let where = "1=1";
  const args = [];

  if (q) {
    where += " AND (title LIKE ? OR slug LIKE ?)";
    const like = `%${q}%`;
    args.push(like, like);
  }
  if (genre) {
    where += " AND genre = ?";
    args.push(genre);
  }
  if (published === "1" || published === "0") {
    where += " AND is_published = ?";
    args.push(Number(published));
  }

  const offset = (page - 1) * limit;

  const countRow = await env.DB
    .prepare(`SELECT COUNT(*) AS n FROM games WHERE ${where}`)
    .bind(...args)
    .first();

  const total = Number(countRow?.n || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const rows = await env.DB
    .prepare(`
      SELECT
        title, slug, genre, platform, cover_url, short_desc,
        file_key, file_name, file_size_bytes, is_published,
        updated_at
      FROM games
      WHERE ${where}
      ORDER BY datetime(updated_at) DESC
      LIMIT ? OFFSET ?
    `)
    .bind(...args, limit, offset)
    .all();

  return json({
    ok: true,
    page,
    limit,
    total,
    totalPages,
    items: rows?.results || [],
  });
}
