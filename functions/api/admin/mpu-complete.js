const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const body = await request.json().catch(() => ({}));
  const key = String(body.key || "").trim();
  const uploadId = String(body.uploadId || "").trim();
  const parts = Array.isArray(body.parts) ? body.parts : null;

  if (!key || !uploadId || !parts || parts.length === 0) {
    return json({ error: "key, uploadId, parts wajib" }, 400);
  }

  const cleanParts = parts
    .map((p) => ({ partNumber: Number(p.partNumber), etag: String(p.etag || "") }))
    .filter((p) => Number.isInteger(p.partNumber) && p.partNumber > 0 && p.etag)
    .sort((a, b) => a.partNumber - b.partNumber);

  if (cleanParts.length === 0) return json({ error: "parts tidak valid" }, 400);

  const mpu = env.FILES.resumeMultipartUpload(key, uploadId);
  await mpu.complete(cleanParts);

  return json({ ok: true, key });
}
