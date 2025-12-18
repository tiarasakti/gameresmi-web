function json(status, body) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function parseRange(rangeHeader, size) {
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

function safeFilename(name) {
  return String(name || "download")
    .replace(/[\/\\]/g, "_")
    .replace(/["']/g, "_");
}

export async function onRequestGet({ params, env, request }) {
  try {
    const slug = String(params?.slug || "").trim();
    if (!slug) return json(400, { error: "Missing slug" });

    // Binding kamu di Pages: FILES (sesuai screenshot)
    const BUCKET = env?.FILES || env?.GAMES_BUCKET;
    if (!BUCKET || typeof BUCKET.head !== "function" || typeof BUCKET.get !== "function") {
      return json(500, {
        error: "R2 binding missing",
        hint: "Pastikan ada R2 binding bernama FILES (atau GAMES_BUCKET).",
        found: { has_FILES: !!env?.FILES, has_GAMES_BUCKET: !!env?.GAMES_BUCKET },
      });
    }

    // ✅ Sesuaikan prefix sesuai struktur object di R2 kamu
    // Kalau kamu simpan di folder "uploads/", taruh "uploads/" di sini.
    const PREFIXES = [
      "",
      "uploads/",
      "files/",
      "games/",
      "game/",
      "archive/",
      "public/",
      "downloads/",
    ];

    // ext yang umum kamu pakai (boleh tambah)
    const EXTS = ["", ".zip", ".rar", ".7z", ".apk", ".exe", ".iso"];

    // 1) Coba HEAD dengan kombinasi prefix + slug + ext
    let keyFound = null;
    let head = null;

    // kalau slug sudah punya ekstensi, tetap dicoba dulu apa adanya
    const baseCandidates = [slug];

    for (const prefix of PREFIXES) {
      for (const base of baseCandidates) {
        for (const ext of EXTS) {
          const k = prefix + base + (ext && base.toLowerCase().endsWith(ext) ? "" : ext);
          const h = await BUCKET.head(k);
          if (h) { keyFound = k; head = h; break; }
        }
        if (keyFound) break;
      }
      if (keyFound) break;
    }

    // 2) Kalau belum ketemu, fallback: list dengan prefix yang mungkin (lebih “pinter”)
    if (!keyFound) {
      const listPrefixes = [];
      for (const p of PREFIXES) {
        listPrefixes.push(p + slug);
        listPrefixes.push(p + slug + ".");
      }

      for (const lp of listPrefixes) {
        const listed = await BUCKET.list({ prefix: lp, limit: 5 });
        const obj = listed?.objects?.[0];
        if (obj?.key) {
          const h = await BUCKET.head(obj.key);
          if (h) { keyFound = obj.key; head = h; break; }
        }
      }
    }

    if (!keyFound || !head) {
      return json(404, {
        error: "File not found in R2",
        slug,
        hint: "Artinya key object di R2 tidak cocok dengan slug. Cek nama object (key) di bucket R2 lalu sesuaikan PREFIXES/EXTS.",
        triedPrefixes: PREFIXES,
        triedExts: EXTS
      });
    }

    const size = head.size;
    const rangeHeader = request.headers.get("Range");
    const r = parseRange(rangeHeader, size);

    const obj = await BUCKET.get(
      keyFound,
      r ? { range: { offset: r.offset, length: r.length } } : undefined
    );

    if (!obj || !obj.body) {
      return json(404, { error: "File not available", key: keyFound });
    }

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    headers.set("accept-ranges", "bytes");

    const filename = safeFilename(keyFound.split("/").pop() || slug);
    headers.set("content-disposition", `attachment; filename="${filename}"`);

    if (r) {
      headers.set("content-range", `bytes ${r.offset}-${r.offset + r.length - 1}/${size}`);
      headers.set("content-length", String(r.length));
      return new Response(obj.body, { status: 206, headers });
    }

    headers.set("content-length", String(size));
    return new Response(obj.body, { status: 200, headers });

  } catch (err) {
    console.error("download error:", err);
    return json(500, { error: "Worker crashed", detail: String(err?.message || err) });
  }
}
