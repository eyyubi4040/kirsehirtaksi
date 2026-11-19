import { join } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const ROOT = process.cwd();

const SETTINGS_FILE = join(ROOT, "data", "settings.json");
const RESERVATIONS_FILE = join(ROOT, "data", "reservations.json");

// MIME Types
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

// Safe JSON Helpers
function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, "utf-8"));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJson(filePath: string, data: any): void {
  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Router
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;

  // 1. Health check for Dokploy / Traefik
  if (pathname === "/health" || pathname === "/ping" || pathname === "/api/health") {
    return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  // 2. API Routes
  if (pathname.startsWith("/api/")) {
    // GET /api/settings
    if (pathname === "/api/settings" && method === "GET") {
      const settings = readJson(SETTINGS_FILE, {});
      return Response.json(settings);
    }

    // POST /api/settings
    if (pathname === "/api/settings" && method === "POST") {
      try {
        const body = await req.json();
        const settings = readJson(SETTINGS_FILE, {} as any);
        if (body.opening !== undefined) settings.pricing.opening = body.opening;
        if (body.perKm !== undefined) settings.pricing.perKm = body.perKm;
        if (body.minFare !== undefined) settings.pricing.minFare = body.minFare;
        if (body.phone) settings.phone = body.phone;
        if (body.whatsapp) settings.whatsapp = body.whatsapp;
        writeJson(SETTINGS_FILE, settings);
        return Response.json({ success: true, settings });
      } catch (err: any) {
        return Response.json({ success: false, error: err.message }, { status: 400 });
      }
    }

    // GET /api/rezervasyon
    if (pathname === "/api/rezervasyon" && method === "GET") {
      const reservations = readJson(RESERVATIONS_FILE, []);
      return Response.json(reservations);
    }

    // POST /api/rezervasyon
    if (pathname === "/api/rezervasyon" && method === "POST") {
      try {
        const body = await req.json();
        const reservations = readJson<any[]>(RESERVATIONS_FILE, []);
        const newId = `REZ-${Date.now().toString().slice(-4)}`;
        const newRecord = {
          id: newId,
          createdAt: new Date().toISOString(),
          name: body.name || "Anonim",
          phone: body.phone || "",
          pickup: body.pickup || "",
          dropoff: body.dropoff || "",
          date: body.date || "",
          time: body.time || "",
          vehicleType: body.vehicleType || "Standart Sarı Taksi",
          passengers: body.passengers || "1",
          estimatedFare: body.estimatedFare || 0,
          status: "Beklemede",
          notes: body.notes || ""
        };
        reservations.unshift(newRecord);
        writeJson(RESERVATIONS_FILE, reservations);
        return Response.json({ success: true, id: newId, reservation: newRecord });
      } catch (err: any) {
        return Response.json({ success: false, error: err.message }, { status: 400 });
      }
    }

    // POST /api/rezervasyon/:id/toggle
    if (pathname.startsWith("/api/rezervasyon/") && pathname.endsWith("/toggle") && method === "POST") {
      const parts = pathname.split("/");
      const id = parts[3];
      const reservations = readJson<any[]>(RESERVATIONS_FILE, []);
      const target = reservations.find(r => r.id === id);
      if (target) {
        target.status = target.status === "Onaylandı" ? "Beklemede" : "Onaylandı";
        writeJson(RESERVATIONS_FILE, reservations);
        return Response.json({ success: true, status: target.status });
      }
      return Response.json({ success: false, message: "Kayıt bulunamadı" }, { status: 404 });
    }

    return Response.json({ error: "Endpoint not found" }, { status: 404 });
  }

  // 3. Clean URLs Enforcement & 301 Canonical Redirects
  // Case A: Redirect /index.html -> /
  if (pathname === "/index.html" || pathname === "/index") {
    return Response.redirect(url.origin + "/", 301);
  }

  // Case B: Redirect any *.html to clean URL (e.g. /duraklar.html -> /duraklar)
  if (pathname.endsWith(".html")) {
    const cleanPath = pathname.slice(0, -5);
    return Response.redirect(url.origin + (cleanPath || "/"), 301);
  }

  // Case C: Remove trailing slashes on clean routes (e.g. /duraklar/ -> /duraklar)
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const trimmedPath = pathname.slice(0, -1);
    return Response.redirect(url.origin + trimmedPath, 301);
  }

  // 4. Resolve Clean URL to Static File
  let relativePath = pathname === "/" ? "index.html" : pathname.slice(1);

  // If path doesn't have an extension, try appending .html (Clean URLs)
  if (!relativePath.includes(".")) {
    const candidateHtml = `${relativePath}.html`;
    if (existsSync(join(ROOT, candidateHtml))) {
      relativePath = candidateHtml;
    }
  }

  const filePath = join(ROOT, relativePath);

  if (existsSync(filePath)) {
    const ext = "." + relativePath.split(".").pop();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const file = Bun.file(filePath);

    // Cache headers: HTML must be fresh; assets have moderate caching with revalidation
    const isHtml = ext === ".html";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": isHtml 
        ? "no-cache, no-store, must-revalidate" 
        : "public, max-age=300, stale-while-revalidate=86400"
    };

    return new Response(file, { status: 200, headers });
  }

  // 4. Custom 404
  const notFoundFile = join(ROOT, "404.html");
  if (existsSync(notFoundFile)) {
    return new Response(Bun.file(notFoundFile), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }

  return new Response("404 Not Found", { status: 404 });
}

// Start Server
Bun.serve({
  port: PORT,
  hostname: HOST,
  fetch: handleRequest,
});

console.log(`\n========================================================`);
console.log(`🚖 KIRŞEHİR TAKSİ (kirsehirtaksi.net) - BUN SERVER`);
console.log(`🚀 Sunucu Aktif: http://${HOST}:${PORT}`);
console.log(`📁 Çalışma Dizini: ${ROOT}`);

// Dokploy Automatic Port Compatibility (Also listen on port 80 if PORT !== 80)
if (PORT !== 80) {
  try {
    Bun.serve({
      port: 80,
      hostname: HOST,
      fetch: handleRequest,
    });
    console.log(`🚀 Dokploy Otomatik Port 80 Dinleyicisi Aktif: http://${HOST}:80`);
  } catch (err) {
    // Port 80 might require root or be occupied locally
  }
}
console.log(`========================================================\n`);
