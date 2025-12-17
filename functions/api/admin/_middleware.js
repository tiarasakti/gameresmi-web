export async function onRequest({ request, env, next }) {
  // Allow preflight kalau suatu saat beda origin (opsional, aman)
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: "ADMIN_TOKEN belum diset di Pages → Variables & Secrets." }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  if (!token || token !== env.ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  return next();
}
