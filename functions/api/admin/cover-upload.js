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

function getExt(name = "") {
  const n = String(name);
  const i = n.lastIndexOf(".");
  if (i <= 0) return "jpg";
  return n.slice(i + 1).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const form = await request.formData();
  const slug = safeSlug(form.get("slug"));
  const file = form.get("cover");

  if (!slug) return json({ error: "slug wajib" }, 400);
  if (!file || typeof file.arrayBuffer !== "function") return json({ error: "cover file wajib" }, 400);

  const ext = getExt(file.name);
  const key = `covers/${slug}.${ext}`;
  const contentType = file.type || "application/octet-stream";

  const buf = await file.arrayBuffer();
  await env.FILES.put(key, buf, { httpMetadata: { contentType } });

  const cover_url = `/api/cover?key=${encodeURIComponent(key)}`;
  return json({ ok: true, key, cover_url });
}
