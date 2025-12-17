function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
  const q = (url.searchParams.get("q") || "").trim();
  const published = url.searchParams.get("published"); // "1" | "0" | null

  let where = "1=1";
  const params = [];

  if (q) {
    where += " AND (title LIKE ? OR slug LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  if (published === "1" || published === "0") {
    where += " AND is_published = ?";
    params.push(Number(published));
  }

  const offset = (page - 1) * limit;

  const totalRow = await env.DB
    .prepare(`SELECT COUNT(*) AS cnt FROM games WHERE ${where}`)
    .bind(...params)
    .first();

  const rows = await env.DB
    .prepare(`SELECT * FROM games WHERE ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
    .bind(...params, limit, offset)
    .all();

  return json({
    ok: true,
    page,
    limit,
    total: totalRow?.cnt || 0,
    items: rows.results || [],
  });
}
