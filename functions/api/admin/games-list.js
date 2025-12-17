function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function clampInt(v, def, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const published = (url.searchParams.get("published") || "all").trim(); // all | 1 | 0
  const page = clampInt(url.searchParams.get("page"), 1, 1, 9999);
  const limit = clampInt(url.searchParams.get("limit"), 15, 1, 100);
  const offset = (page - 1) * limit;

  const where = [];
  const binds = [];

  if (q) {
    where.push("(title LIKE ? OR slug LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`);
  }
  if (published === "1" || published === "0") {
    where.push("is_published = ?");
    binds.push(Number(published));
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM games ${whereSql}`
  ).bind(...binds).first();

  const items = await env.DB.prepare(
    `SELECT
      title, slug, genre, platform, cover_url,
      short_desc, is_published,
      file_key, file_name, file_size_bytes,
      updated_at
     FROM games
     ${whereSql}
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();

  return json({
    ok: true,
    page,
    limit,
    total: totalRow?.n ?? 0,
    items: items?.results ?? [],
  });
}
