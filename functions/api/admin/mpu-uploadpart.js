const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export async function onRequest({ request, env }) {
  if (request.method !== "PUT") return new Response("Method Not Allowed", { status: 405 });

  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const uploadId = url.searchParams.get("uploadId") || "";
  const partNumber = Number(url.searchParams.get("partNumber") || "0");

  if (!key || !uploadId || !Number.isInteger(partNumber) || partNumber <= 0) {
    return json({ error: "key, uploadId, partNumber wajib" }, 400);
  }

  const chunk = await request.arrayBuffer();
  if (!chunk || chunk.byteLength === 0) return json({ error: "body chunk kosong" }, 400);

  const mpu = env.FILES.resumeMultipartUpload(key, uploadId);
  const uploaded = await mpu.uploadPart(partNumber, chunk);

  return json({ partNumber, etag: uploaded.etag });
}
