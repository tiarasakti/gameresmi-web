export async function onRequest({ request, env }) {
  if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  const url = new URL(request.url);
  const key = (url.searchParams.get("key") || "").trim();

  // basic safety: hanya izinkan folder covers/
  if (!key.startsWith("covers/") || key.includes("..")) {
    return new Response("Bad Request", { status: 400 });
  }

  const obj = await env.FILES.get(key);
  if (!obj) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  headers.set("content-type", obj.httpMetadata?.contentType || "application/octet-stream");
  headers.set("cache-control", "public, max-age=86400"); // 1 hari

  return new Response(obj.body, { status: 200, headers });
}
