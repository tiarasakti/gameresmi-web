export async function onRequest({ env }) {
  return new Response(JSON.stringify({
    ok: true,
    hasAdminToken: !!env.ADMIN_TOKEN,
    hasDB: !!env.DB,
    hasFILES: !!env.FILES,
  }), { headers: { "content-type": "application/json; charset=utf-8" }});
}
