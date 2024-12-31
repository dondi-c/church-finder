import { z } from "zod";

export const reviewSchema = z.object({
  id: z.number(),
  church_id: z.number(),
  user_name: z.string(),
  rating: z.number(),
  comment: z.string().nullable(),
  created_at: z.string(),
});

export const serviceTimeSchema = z.object({
  id: z.number(),
  church_id: z.number(),
  day_of_week: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  service_type: z.string().nullable(),
  language: z.string(),
});

export const churchDetailsSchema = z.object({
  id: z.number(),
  place_id: z.string(),
  name: z.string(),
  vicinity: z.string(),
  lat: z.string(),
  lng: z.string(),
  rating: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  denomination: z.string().nullable(),
  description: z.string().nullable(),
  serviceTimes: z.array(serviceTimeSchema),
  reviews: z.array(reviewSchema),
});

export type Review = z.infer<typeof reviewSchema>;
export type ServiceTime = z.infer<typeof serviceTimeSchema>;
export type ChurchDetails = z.infer<typeof churchDetailsSchema>;