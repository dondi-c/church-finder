import { pgTable, text, serial, integer, boolean, timestamp, time, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
});

export const churches = pgTable("churches", {
  id: serial("id").primaryKey(),
  place_id: text("place_id").unique().notNull(),
  name: text("name").notNull(),
  vicinity: text("vicinity").notNull(),
  lat: text("lat").notNull(),
  lng: text("lng").notNull(),
  rating: text("rating"),
  phone: text("phone"),
  website: text("website"),
  denomination: text("denomination"),
  description: text("description"),
});

export const serviceTimes = pgTable("service_times", {
  id: serial("id").primaryKey(),
  church_id: integer("church_id").references(() => churches.id).notNull(),
  day_of_week: integer("day_of_week").notNull(), // 0-6 for Sunday-Saturday
  start_time: time("start_time").notNull(),
  end_time: time("end_time").notNull(),
  service_type: text("service_type"), // e.g., "Sunday Mass", "Bible Study"
  language: text("language").default("English"),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  church_id: integer("church_id").references(() => churches.id).notNull(),
  user_name: text("user_name").notNull(),
  rating: decimal("rating", { precision: 2, scale: 1 }).notNull(),
  comment: text("comment"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const churchRelations = relations(churches, ({ many }) => ({
  serviceTimes: many(serviceTimes),
  reviews: many(reviews),
}));

export const serviceTimeRelations = relations(serviceTimes, ({ one }) => ({
  church: one(churches, {
    fields: [serviceTimes.church_id],
    references: [churches.id],
  }),
}));

export const reviewRelations = relations(reviews, ({ one }) => ({
  church: one(churches, {
    fields: [reviews.church_id],
    references: [churches.id],
  }),
}));

// Schemas
export const insertChurchSchema = createInsertSchema(churches);
export const selectChurchSchema = createSelectSchema(churches);
export const insertServiceTimeSchema = createInsertSchema(serviceTimes);
export const selectServiceTimeSchema = createSelectSchema(serviceTimes);
export const insertReviewSchema = createInsertSchema(reviews);
export const selectReviewSchema = createSelectSchema(reviews);

// Types
export type Church = typeof churches.$inferSelect;
export type InsertChurch = typeof churches.$inferInsert;
export type ServiceTime = typeof serviceTimes.$inferSelect;
export type InsertServiceTime = typeof serviceTimes.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;