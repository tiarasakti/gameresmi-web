function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function safeSlug(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extOf(name) {
  const s = String(name || "").toLowerCase();
  const i = s.lastIndexOf(".");
  return i > 0 ? s.slice(i + 1) : "png";
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const form = await request.formData();
  const slug = safeSlug(form.get("slug"));
  const file = form.get("file");

  if (!slug) return json({ error: "slug wajib" }, 400);
  if (!file || typeof file === "string") return json({ error: "file wajib" }, 400);

  const ext = extOf(file.name);
  const key = `covers/${slug}.${ext}`;
  const contentType = file.type || "application/octet-stream";

  const buf = await file.arrayBuffer();
  await env.FILES.put(key, buf, { httpMetadata: { contentType } });

  // URL publik (kita serve via API asset)
  const url = `/api/asset?key=${encodeURIComponent(key)}`;
  return json({ ok: true, key, url });
}
