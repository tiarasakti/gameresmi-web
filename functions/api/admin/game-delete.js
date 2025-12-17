function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function extractCoverKey(cover_url = "") {
  try {
    const u = new URL(cover_url, "https://x.local");
    const key = u.searchParams.get("key") || "";
    return key.startsWith("covers/") ? key : "";
  } catch {
    return "";
  }
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const b = await request.json().catch(() => ({}));
  const slug = String(b.slug || "").trim();
  const delete_files = !!b.delete_files;

  if (!slug) return json({ error: "slug wajib" }, 400);

  const game = await env.DB.prepare(`SELECT * FROM games WHERE slug = ?`).bind(slug).first();
  if (!game) return json({ error: "game tidak ditemukan" }, 404);

  await env.DB.prepare(`DELETE FROM games WHERE slug = ?`).bind(slug).run();

  if (delete_files) {
    const tasks = [];
    if (game.file_key) tasks.push(env.FILES.delete(String(game.file_key)).catch(() => null));
    const ck = extractCoverKey(String(game.cover_url || ""));
    if (ck) tasks.push(env.FILES.delete(ck).catch(() => null));
    await Promise.all(tasks);
  }

  return json({ ok: true });
}
