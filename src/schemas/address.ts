import { z } from 'zod';

// Shared address schema that matches the AddressForm component
// This should be used across all tRPC routes to ensure consistency
export const addressSchema = z.object({
  addressLine1: z.string().min(1, 'Address line 1 is required').max(255),
  addressLine2: z.string().max(255).optional(),
  pincode: z.string().max(10).optional(),
  cityVillage: z.string().min(1, 'City/Village is required').max(128),
  district: z.string().min(1, 'District is required').max(128),
  state: z.string().min(1, 'State is required').max(128),
  country: z.string().max(128).optional(),
});

export type Address = z.infer<typeof addressSchema>;