function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  const url = new URL(request.url);
  const key = (url.searchParams.get("key") || "").trim();

  if (!key || !key.startsWith("covers/")) {
    return json({ error: "invalid key" }, 400);
  }

  const obj = await env.FILES.get(key);
  if (!obj) return new Response("Not Found", { status: 404 });

  const ct = obj.httpMetadata?.contentType || "application/octet-stream";
  return new Response(obj.body, {
    headers: {
      "content-type": ct,
      "cache-control": "public, max-age=3600",
    },
  });
}
