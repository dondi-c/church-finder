import type { Express } from "express";
import { createServer, type Server } from "http";
import { Readable } from "stream";
import { db } from "@db";
import { churches, serviceTimes, insertChurchSchema, insertServiceTimeSchema } from "@db/schema";
import { eq } from "drizzle-orm";

if (!process.env.GOOGLE_MAPS_API_KEY) {
  throw new Error("GOOGLE_MAPS_API_KEY environment variable is required");
}

export function registerRoutes(app: Express): Server {
  // Google Maps API endpoints
  app.get("/api/maps/script", (_req, res) => {
    try {
      res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY });
    } catch (error) {
      console.error("Maps API error:", error);
      res.status(500).json({ 
        error: "Failed to provide Google Maps API key" 
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

  // Church Management API endpoints
  app.get("/api/churches", async (_req, res) => {
    try {
      const allChurches = await db.query.churches.findMany({
        with: {
          serviceTimes: true,
        },
      });
      res.json(allChurches);
    } catch (error) {
      console.error("Error fetching churches:", error);
      res.status(500).json({ error: "Failed to fetch churches" });
    }
  });

  app.get("/api/churches/:placeId", async (req, res) => {
    try {
      const church = await db.query.churches.findFirst({
        where: eq(churches.place_id, req.params.placeId),
        with: {
          serviceTimes: true,
        },
      });

      if (!church) {
        res.status(404).json({ error: "Church not found" });
        return;
      }

      res.json(church);
    } catch (error) {
      console.error("Error fetching church:", error);
      res.status(500).json({ error: "Failed to fetch church details" });
    }
  });

  app.post("/api/churches", async (req, res) => {
    try {
      const churchData = insertChurchSchema.parse(req.body);
      const [church] = await db.insert(churches).values(churchData).returning();
      res.status(201).json(church);
    } catch (error) {
      console.error("Error creating church:", error);
      res.status(400).json({ error: "Invalid church data" });
    }
  });

  app.post("/api/churches/:churchId/service-times", async (req, res) => {
    try {
      const serviceTimeData = insertServiceTimeSchema.parse({
        ...req.body,
        church_id: parseInt(req.params.churchId),
      });

      const [serviceTime] = await db.insert(serviceTimes)
        .values(serviceTimeData)
        .returning();

      res.status(201).json(serviceTime);
    } catch (error) {
      console.error("Error creating service time:", error);
      res.status(400).json({ error: "Invalid service time data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}