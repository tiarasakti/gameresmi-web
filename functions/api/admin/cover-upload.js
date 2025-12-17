function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function extFrom(name = "") {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "bin";
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const form = await request.formData();
  const slug = String(form.get("slug") || "").trim();
  const file = form.get("file");

  if (!slug) return json({ error: "slug wajib" }, 400);
  if (!(file instanceof File)) return json({ error: "file cover wajib" }, 400);

  const ext = extFrom(file.name);
  const key = `covers/${slug}-${Date.now()}.${ext}`;

  const buf = await file.arrayBuffer();
  await env.FILES.put(key, buf, {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
      cacheControl: "public, max-age=3600",
    },
  });

  const coverUrl = `/api/cover?key=${encodeURIComponent(key)}`;
  return json({ ok: true, key, coverUrl });
}
