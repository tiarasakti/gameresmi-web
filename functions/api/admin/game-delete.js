function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function coverKeyFromUrl(coverUrl) {
  if (!coverUrl) return null;
  const s = String(coverUrl);
  const prefix = "/api/cover/";
  if (!s.startsWith(prefix)) return null;
  const id = s.slice(prefix.length); // "<slug>.<ext>"
  if (!id) return null;
  return `covers/${id}`;
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ error: "DB binding missing (env.DB)" }, 500);
    if (!env.FILES) return json({ error: "R2 binding missing (env.FILES)" }, 500);

    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return json({ error: "Expected application/json" }, 400);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);

    const slug = String(body.slug || "").trim();
    if (!slug) return json({ error: "Missing slug" }, 400);

    const row = await env.DB.prepare(`
      SELECT slug, file_key, cover_url
      FROM games WHERE slug = ?
    `).bind(slug).first();

    if (!row) return json({ error: "Not found", slug }, 404);

    // hapus ZIP
    try { await env.FILES.delete(String(row.file_key)); } catch (_) {}

    // hapus cover kalau format cover_url = /api/cover/<slug>.<ext>
    const coverKey = coverKeyFromUrl(row.cover_url);
    if (coverKey) {
      try { await env.FILES.delete(coverKey); } catch (_) {}
    }

    await env.DB.prepare("DELETE FROM games WHERE slug = ?").bind(slug).run();

    return json({ ok: true, deleted: { slug, file_key: row.file_key, cover_key: coverKey || null } });
  } catch (err) {
    return json({ error: "Internal error", details: String(err?.message || err) }, 500);
  }
}

export async function onRequest() {
  return json({ error: "Method not allowed" }, 405);
}
