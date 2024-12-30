import type { Express } from "express";
import { createServer, type Server } from "http";
import { Readable } from "stream";

if (!process.env.GOOGLE_MAPS_API_KEY) {
  throw new Error("GOOGLE_MAPS_API_KEY environment variable is required");
}

export function registerRoutes(app: Express): Server {
  // Google Maps API endpoints
  app.get("/api/maps/script", async (_req, res) => {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      res.status(500).json({ error: "Google Maps API key is not configured" });
      return;
    }

    try {
      // Test the API key first
      const testUrl = `https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}&callback=console.log`;
      const response = await fetch(testUrl);
      if (!response.ok) {
        throw new Error("Invalid or restricted API key");
      }

      // Also test Places API access
      const placesTestUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=40.7128,-74.0060&radius=1000&type=church&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const placesResponse = await fetch(placesTestUrl);
      if (!placesResponse.ok) {
        throw new Error("Places API access is restricted");
      }

      const placesData = await placesResponse.json();
      if (placesData.error_message) {
        throw new Error(placesData.error_message);
      }

      res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY });
    } catch (error) {
      console.error("Maps API error:", error);
      res.status(500).json({ 
        error: "Failed to validate Google Maps API key. Please ensure both the Maps JavaScript API and Places API are enabled in your Google Cloud Console." 
      });
    }
  });

  app.get("/api/maps/photo/:reference", async (req, res) => {
    const { reference } = req.params;
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch photo");

      res.set("Content-Type", response.headers.get("content-type") || "image/jpeg");

      // Convert ReadableStream to Node.js stream
      const readable = Readable.fromWeb(response.body as any);
      readable.pipe(res);
    } catch (error) {
      console.error("Photo fetch error:", error);
      res.status(500).json({ error: "Failed to fetch photo" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}