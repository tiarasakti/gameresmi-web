export async function onRequest({ request, env }) {
  if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";

  // keamanan: hanya boleh covers/
  if (!key.startsWith("covers/") || key.includes("..")) {
    return new Response("Forbidden", { status: 403 });
  }

  const obj = await env.FILES.get(key);
  if (!obj) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  headers.set("cache-control", "public, max-age=86400");
  if (obj.httpMetadata?.contentType) headers.set("content-type", obj.httpMetadata.contentType);
  headers.set("etag", obj.etag);

  return new Response(obj.body, { status: 200, headers });
}
