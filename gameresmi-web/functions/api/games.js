function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function clampInt(v, def, min, max) {
  const n = Number.parseInt(v ?? "", 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DB) return json({ ok: false, error: "DB binding missing (env.DB)" }, 500);

    const url = new URL(request.url);
    const page = clampInt(url.searchParams.get("page"), 1, 1, 999999);
    const limit = clampInt(url.searchParams.get("limit"), 15, 1, 100);
    const q = (url.searchParams.get("q") || "").trim();
    const published = (url.searchParams.get("published") || "all").trim(); // all | 1 | 0

    let where = "1=1";
    const params = [];

    if (q) {
      where += " AND (title LIKE ? OR slug LIKE ? OR genre LIKE ? OR platform LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    if (published === "1" || published === "0") {
      where += " AND is_published = ?";
      params.push(Number(published));
    }

    const offset = (page - 1) * limit;

    const countRow = await env.DB
      .prepare(`SELECT COUNT(*) as total FROM games WHERE ${where}`)
      .bind(...params)
      .first();

    const total = Number(countRow?.total || 0);

    const rows = await env.DB
      .prepare(`
        SELECT
          title, slug, genre, platform, cover_url,
          file_key, file_name, file_size_bytes, sha256,
          short_desc, is_published, updated_at
        FROM games
        WHERE ${where}
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?
      `.trim())
      .bind(...params, limit, offset)
      .all();

    return json({
      ok: true,
      items: rows?.results || [],
      page,
      limit,
      total
    });
  } catch (err) {
    return json({ ok: false, error: "Internal error", details: String(err?.message || err) }, 500);
  }
}

export async function onRequest() {
  return json({ ok: false, error: "Method not allowed" }, 405);
}
