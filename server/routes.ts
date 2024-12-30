import type { Express } from "express";
import { createServer, type Server } from "http";
import { Readable } from "stream";

if (!process.env.GOOGLE_MAPS_API_KEY) {
  throw new Error("GOOGLE_MAPS_API_KEY environment variable is required");
}

export function registerRoutes(app: Express): Server {
  // Google Maps API endpoints
  app.get("/api/maps/script", (_req, res) => {
    res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY });
  });

  app.get("/api/maps/photo/:reference", async (req, res) => {
    const { reference } = req.params;
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch photo");

      res.set("Content-Type", response.headers.get("content-type") || "image/jpeg");

      // Convert ReadableStream to Node.js stream
      const readable = Readable.fromWeb(response.body!);
      readable.pipe(res);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch photo" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}