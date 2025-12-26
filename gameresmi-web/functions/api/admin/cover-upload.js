function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function extFromFile(file) {
  const t = (file.type || "").toLowerCase();
  if (t.includes("jpeg")) return "jpg";
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  if (t.includes("gif")) return "gif";

  const name = (file.name || "").toLowerCase();
  const m = name.match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "bin";
}

function safeSlug(s) {
  return String(s).replace(/[^a-z0-9\-_.]/gi, "");
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) return json({ error: "DB binding missing (env.DB)" }, 500);
    if (!env.FILES) return json({ error: "R2 binding missing (env.FILES)" }, 500);

    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) return json({ error: "Expected multipart/form-data" }, 400);

    const form = await request.formData();
    const slug = String(form.get("slug") || "").trim();
    const file = form.get("cover");

    if (!slug) return json({ error: "Missing slug" }, 400);
    if (!(file instanceof File)) return json({ error: "Missing cover file (field: cover)" }, 400);

    const exists = await env.DB.prepare("SELECT slug, cover_url FROM games WHERE slug = ?").bind(slug).first();
    if (!exists) return json({ error: "Game not found", slug }, 404);

    const ext = extFromFile(file);
    const id = `${safeSlug(slug)}.${ext}`;
    const key = `covers/${id}`;
    const cover_url = `/api/cover/${encodeURIComponent(id)}`;

    // hapus cover lama (best effort)
    if (exists.cover_url && String(exists.cover_url).startsWith("/api/cover/")) {
      const oldId = String(exists.cover_url).slice("/api/cover/".length);
      if (oldId && oldId !== id) {
        try { await env.FILES.delete(`covers/${oldId}`); } catch (_) {}
      }
    }

    await env.FILES.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
        cacheControl: "public, max-age=3600"
      }
    });

    await env.DB.prepare(`
      UPDATE games
      SET cover_url = ?, updated_at = datetime('now')
      WHERE slug = ?
    `).bind(cover_url, slug).run();

    return json({ ok: true, slug, cover_url, cover_key: key });
  } catch (err) {
    return json({ error: "Internal error", details: String(err?.message || err) }, 500);
  }
}

export async function onRequest() {
  return json({ error: "Method not allowed" }, 405);
}
