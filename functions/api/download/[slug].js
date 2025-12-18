function parseRange(rangeHeader, size) {
  // Range: bytes=start-end
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) return null;

  const raw = rangeHeader.slice(6).trim();
  const [a, b] = raw.split("-");

  let start = a ? Number(a) : NaN;
  let end = b ? Number(b) : NaN;

  // suffix bytes: "-500"
  if (Number.isNaN(start) && !Number.isNaN(end)) {
    const length = Math.min(end, size);
    return { offset: Math.max(0, size - length), length };
  }

  if (Number.isNaN(start)) return null;
  if (Number.isNaN(end)) end = size - 1;

  if (start < 0 || end < start) return null;
  if (start >= size) return null;

  end = Math.min(end, size - 1);
  return { offset: start, length: end - start + 1, start, end };
}

function json(status, body) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequestGet({ params, env, request }) {
  try {
    const slug = String(params?.slug || "").trim();
    if (!slug) return json(400, { error: "Missing slug" });

    // ✅ Sesuai screenshot kamu: R2 binding = FILES
    // (support juga kalau suatu saat kamu rename jadi GAMES_BUCKET)
    const BUCKET = env?.FILES || env?.GAMES_BUCKET;

    if (!BUCKET || typeof BUCKET.head !== "function" || typeof BUCKET.get !== "function") {
      return json(500, {
        error: "R2 binding missing",
        hint: "Di Pages Settings > Bindings, pastikan R2 bucket binding ada. Saat ini kode mencari env.FILES atau env.GAMES_BUCKET.",
        found: {
          has_FILES: !!env?.FILES,
          has_GAMES_BUCKET: !!env?.GAMES_BUCKET,
        },
      });
    }

    // Key di R2: default = slug
    // Kalau file kamu sebenarnya punya ekstensi, kamu bisa ubah jadi `${slug}.zip` dll.
    const triedKeys = [slug, `${slug}.zip`, `${slug}.rar`, `${slug}.7z`];

    let key = null;
    let head = null;

    for (const k of triedKeys) {
      const h = await BUCKET.head(k);
      if (h) { key = k; head = h; break; }
    }

    if (!head || !key) {
      return json(404, {
        error: "File not found in R2",
        slug,
        triedKeys,
        note: "Sesuaikan penamaan key di function ini dengan nama object di R2.",
      });
    }

    const size = head.size;
    const rangeHeader = request.headers.get("Range");
    const r = parseRange(rangeHeader, size);

    const obj = await BUCKET.get(
      key,
      r ? { range: { offset: r.offset, length: r.length } } : undefined
    );

    if (!obj || !obj.body) {
      return json(404, { error: "File not available", key });
    }

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    headers.set("accept-ranges", "bytes");

    // filename: pakai key yang ketemu (biar ada .zip kalau memang itu)
    const safeName = key.replace(/["\\]/g, "_");
    headers.set("content-disposition", `attachment; filename="${safeName}"`);

    if (r) {
      headers.set("content-range", `bytes ${r.offset}-${r.offset + r.length - 1}/${size}`);
      headers.set("content-length", String(r.length));
      return new Response(obj.body, { status: 206, headers });
    }

    headers.set("content-length", String(size));
    return new Response(obj.body, { status: 200, headers });

  } catch (err) {
    console.error("download error:", err);
    return json(500, {
      error: "Worker crashed",
      detail: String(err?.message || err),
    });
  }
}
