// /functions/api/download/[slug].js

function parseRange(rangeHeader, size){
  // Range: bytes=start-end
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) return null;
  const raw = rangeHeader.slice(6).trim();
  const [a,b] = raw.split("-");
  let start = a ? Number(a) : NaN;
  let end   = b ? Number(b) : NaN;

  // suffix bytes: "-500"
  if (isNaN(start) && !isNaN(end)) {
    const length = Math.min(end, size);
    return { offset: Math.max(0, size - length), length };
  }

  if (isNaN(start)) return null;
  if (isNaN(end)) end = size - 1;

  if (start < 0 || end < start) return null;
  if (start >= size) return null;

  end = Math.min(end, size - 1);
  return { offset: start, length: (end - start + 1), start, end };
}

export async function onRequestGet(context){
  const { params, env, request } = context;

  try{
    const slug = String(params.slug || "").trim();
    if (!slug) {
      return new Response(JSON.stringify({ error:"Missing slug" }), {
        status: 400,
        headers: { "content-type":"application/json; charset=utf-8" }
      });
    }

    // TODO: sesuaikan key sesuai penyimpanan kamu
    // contoh 1: key = slug
    // contoh 2: key = `${slug}.zip`
    const key = slug;

    // HEAD metadata dulu biar tau size (buat Range)
    const head = await env.GAMES_BUCKET.head(key);
    if (!head) {
      return new Response(JSON.stringify({ error:"File not found" }), {
        status: 404,
        headers: { "content-type":"application/json; charset=utf-8" }
      });
    }

    const size = head.size;
    const rangeReq = request.headers.get("Range");
    const r = parseRange(rangeReq, size);

    const obj = await env.GAMES_BUCKET.get(key, r ? { range: { offset: r.offset, length: r.length } } : undefined);
    if (!obj || !obj.body) {
      return new Response(JSON.stringify({ error:"File not available" }), {
        status: 404,
        headers: { "content-type":"application/json; charset=utf-8" }
      });
    }

    const headers = new Headers();
    obj.writeHttpMetadata(headers);                 // contentType, cacheControl, dll :contentReference[oaicite:3]{index=3}
    headers.set("etag", obj.httpEtag);              // rekomendasi Cloudflare :contentReference[oaicite:4]{index=4}
    headers.set("accept-ranges", "bytes");
    headers.set("content-disposition", `attachment; filename="${slug}"`);

    if (r){
      headers.set("content-range", `bytes ${r.offset}-${r.offset + r.length - 1}/${size}`);
      headers.set("content-length", String(r.length));
      return new Response(obj.body, { status: 206, headers });
    }

    headers.set("content-length", String(size));
    return new Response(obj.body, { status: 200, headers });

  }catch(err){
    // ini yang biasanya bikin 1101 kalau tidak ditangkap
    console.error("download error:", err);
    return new Response(JSON.stringify({ error:"Worker crashed", detail:String(err?.message || err) }), {
      status: 500,
      headers: { "content-type":"application/json; charset=utf-8" }
    });
  }
}
