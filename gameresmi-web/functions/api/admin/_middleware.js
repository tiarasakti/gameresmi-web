export async function onRequest({ request, env, next }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });

  const expected = env.ADMIN_TOKEN || "";
  const auth = request.headers.get("Authorization") || "";
  const ok = expected && auth === `Bearer ${expected}`;

  if (!ok) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }

  return next();
}
