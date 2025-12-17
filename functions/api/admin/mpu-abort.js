const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const body = await request.json().catch(() => ({}));
  const key = String(body.key || "").trim();
  const uploadId = String(body.uploadId || "").trim();
  if (!key || !uploadId) return json({ error: "key, uploadId wajib" }, 400);

  const mpu = env.FILES.resumeMultipartUpload(key, uploadId);
  await mpu.abort();

  return json({ ok: true });
}
