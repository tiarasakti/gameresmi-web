export async function onRequestGet({ params, env }) {
  if (!env.FILES) return new Response("R2 missing", { status: 500 });

  const id = String(params.id || "").trim(); // "<slug>.<ext>"
  if (!id) return new Response("Bad Request", { status: 400 });

  const obj = await env.FILES.get(`covers/${id}`);
  if (!obj) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  if (!headers.get("cache-control")) headers.set("cache-control", "public, max-age=3600");

  return new Response(obj.body, { status: 200, headers });
}

export async function onRequest() {
  return new Response("Method Not Allowed", { status: 405 });
}
