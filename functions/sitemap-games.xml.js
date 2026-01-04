export async function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;

  const escXml = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const toLastmod = (s) => {
    // input contoh: "2026-01-04 12:30:00" atau iso
    if (!s) return "";
    const t = String(s).includes("T") ? String(s) : String(s).replace(" ", "T") + "Z";
    const d = new Date(t);
    if (isNaN(d.getTime())) return "";
    // sitemap lastmod aman pakai YYYY-MM-DD
    return d.toISOString().slice(0, 10);
  };

  async function fetchPage(page, limit) {
    const u = new URL("/api/games", origin);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    // q kosong = semua
    const res = await fetch(u.toString(), {
      headers: { "accept": "application/json" },
      cf: { cacheTtl: 300, cacheEverything: true }
    });

    const ct = res.headers.get("content-type") || "";
    const text = await res.text();

    if (!res.ok) {
      throw new Error(`API /api/games error ${res.status}: ${text.slice(0, 200)}`);
    }
    if (!ct.includes("application/json")) {
      throw new Error(`API /api/games bukan JSON. content-type=${ct}, snippet=${text.slice(0, 200)}`);
    }

    return text ? JSON.parse(text) : {};
  }

  try {
    const LIMIT = 100; // aman & cepat
    let page = 1;
    let totalPages = 1;

    const seen = new Set();
    const urls = [];

    while (page <= totalPages) {
      const data = await fetchPage(page, LIMIT);
      const items = Array.isArray(data.items) ? data.items : [];

      totalPages = Number(data.totalPages || totalPages || 1) || 1;

      for (const it of items) {
        const slug = String(it?.slug || "").trim();
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);

        const loc = new URL(`/download.html?slug=${encodeURIComponent(slug)}`, origin).toString();
        const lastmod = toLastmod(it?.updated_at);

        urls.push({ loc, lastmod });
      }

      // safety brake kalau API aneh
      if (page > 500) break;
      page++;
    }

    // Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const u of urls) {
      xml += `  <url>\n`;
      xml += `    <loc>${escXml(u.loc)}</loc>\n`;
      if (u.lastmod) xml += `    <lastmod>${escXml(u.lastmod)}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.5</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>\n`;

    return new Response(xml, {
      headers: {
        "content-type": "application/xml; charset=UTF-8",
        "cache-control": "public, max-age=300"
      }
    });
  } catch (e) {
    // fallback: tetap valid XML biar nggak bikin Search Console ngamuk
    const msg = String(e?.message || e);
    const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- ERROR generating sitemap-games.xml: ${msg.replace(/--/g, "-")} -->
</urlset>`;
    return new Response(xml, {
      headers: { "content-type": "application/xml; charset=UTF-8" },
      status: 200
    });
  }
}
