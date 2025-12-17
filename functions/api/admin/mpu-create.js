const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const body = await request.json().catch(() => ({}));
  const key = String(body.key || "").trim();
  const contentType = String(body.contentType || "application/octet-stream").trim();
  if (!key) return json({ error: "key wajib" }, 400);

  const mpu = await env.FILES.createMultipartUpload(key, { httpMetadata: { contentType } });
  return json({ key, uploadId: mpu.uploadId });
}
