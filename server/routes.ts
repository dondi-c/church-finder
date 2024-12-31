import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { churches, serviceTimes, reviews, insertChurchSchema, insertServiceTimeSchema, insertReviewSchema } from "@db/schema";
import { eq, desc } from "drizzle-orm";

if (!process.env.GOOGLE_MAPS_API_KEY) {
  throw new Error("GOOGLE_MAPS_API_KEY environment variable is required");
}

if (!process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || !process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
  throw new Error("GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE_ID are required for church photos");
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

  // New endpoint for church photos using Google Custom Search
  app.get("/api/churches/photos/:churchName", async (req, res) => {
    try {
      const { churchName } = req.params;
      console.log("Fetching photo for church:", churchName);

      if (!churchName) {
        console.error("No church name provided");
        return res.status(400).json({ error: "Church name is required" });
      }

      const searchQuery = `${churchName} church building exterior`;
      console.log("Search query:", searchQuery);

      const url = `https://customsearch.googleapis.com/customsearch/v1?q=${encodeURIComponent(searchQuery)}&cx=${process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID}&key=${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY}&searchType=image&num=1`;

      console.log("Making request to Google Custom Search API");
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        console.error("Google Custom Search error:", data);
        return res.status(response.status).json({ 
          error: "Failed to fetch church photo",
          details: data.error?.message || "Unknown error"
        });
      }

      if (!data.items?.[0]?.link) {
        console.log("No photos found for church:", churchName);
        return res.status(404).json({ error: "No photos found" });
      }

      console.log("Found photo URL:", data.items[0].link);
      res.json({ imageUrl: data.items[0].link });
    } catch (error) {
      console.error("Photo fetch error:", error);
      res.status(500).json({ 
        error: "Failed to fetch photo",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Church Management API endpoints
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

  app.get("/api/churches/:placeId", async (req, res) => {
    try {
      const church = await db.query.churches.findFirst({
        where: eq(churches.place_id, req.params.placeId),
        with: {
          serviceTimes: true,
          reviews: {
            orderBy: desc(reviews.created_at),
          },
        },
      });

      if (!church) {
        // If church doesn't exist in our database, create it
        const [newChurch] = await db.insert(churches)
          .values({
            place_id: req.params.placeId,
            name: req.query.name as string,
            vicinity: req.query.vicinity as string,
            lat: req.query.lat as string,
            lng: req.query.lng as string,
            rating: req.query.rating as string || null,
          })
          .returning();

        res.json({
          ...newChurch,
          serviceTimes: [],
          reviews: [],
        });
        return;
      }

      res.json(church);
    } catch (error) {
      console.error("Error fetching church:", error);
      res.status(500).json({ error: "Failed to fetch church details" });
    }
  });

  app.patch("/api/churches/:id", async (req, res) => {
    try {
      const churchId = parseInt(req.params.id);
      const { phone, website, denomination, description } = req.body;

      const [updatedChurch] = await db
        .update(churches)
        .set({
          phone,
          website,
          denomination,
          description,
        })
        .where(eq(churches.id, churchId))
        .returning();

      if (!updatedChurch) {
        res.status(404).json({ error: "Church not found" });
        return;
      }

      res.json(updatedChurch);
    } catch (error) {
      console.error("Error updating church:", error);
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

  // Add new endpoint for denominations
  app.get("/api/churches/denominations", async (_req, res) => {
    try {
      const result = await db
        .select({ denomination: churches.denomination })
        .from(churches)
        .where(eq(churches.denomination, churches.denomination))
        .orderBy(desc(churches.denomination));

      const denominations = result
        .map(r => r.denomination)
        .filter((d): d is string => d != null && d !== "");

      // Convert Set to Array before sending response
      res.json(Array.from(new Set(denominations)));
    } catch (error) {
      console.error("Error fetching denominations:", error);
      res.status(500).json({ error: "Failed to fetch denominations" });
    }
  });


  // Add new endpoint for church reviews
  app.post("/api/churches/:churchId/reviews", async (req, res) => {
    try {
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        church_id: parseInt(req.params.churchId),
      });

      const [review] = await db.insert(reviews)
        .values(reviewData)
        .returning();

      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(400).json({ error: "Invalid review data" });
    }
  });

  app.get("/api/maps/photo/:reference", async (req, res) => {
    try {
      const { reference } = req.params;
      if (!reference) {
        return res.status(400).json({ error: "Photo reference is required" });
      }

      console.log("Fetching photo for reference:", reference);
      const maxwidth = req.query.maxwidth || 400;
      const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${encodeURIComponent(reference)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error("Google Places photo error:", response.status, response.statusText);
        return res.status(response.status).json({ error: "Failed to fetch photo from Google Places" });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Set appropriate headers
      const contentType = response.headers.get('content-type');
      res.set('Content-Type', contentType || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

      // Send the buffer directly
      res.send(buffer);
    } catch (error) {
      console.error("Photo fetch error:", error);
      res.status(500).json({ error: "Failed to fetch photo" });
    }
  });
  const httpServer = createServer(app);
  return httpServer;
}