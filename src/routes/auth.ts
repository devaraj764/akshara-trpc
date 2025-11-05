import { z } from 'zod';
import { router, publicProcedure, TRPCError } from '../trpc.js';
import { authService } from '../services/authService.js';
import { addressSchema } from '../schemas/address.js';

const organizationSetupSchema = z.object({
  academic_years: z.array(z.any()).optional(),
  subjects: z.array(z.any()).optional(),
  departments: z.array(z.any()).optional(),
  grades: z.array(z.any()).optional(),
  fee_types: z.array(z.any()).optional(),
  fee_items: z.array(z.any()).optional(),
});

const signUpSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6),
  fullName: z.string().min(1),
  organizationName: z.string().min(1),
  organizationRegistrationNumber: z.string().optional(),
  organizationAddress: addressSchema.optional(),
  organizationPhone: z.string().regex(/^\d{0,10}$/, 'Phone number must be maximum 10 digits').optional(),
  organizationEmail: z.string().email({ message: "Please enter a valid email address" }).optional().or(z.literal('')),
  organizationSetup: organizationSetupSchema.optional(),
});

const signInSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1),
});

const initialSetupSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6),
  fullName: z.string().min(1),
  organizationName: z.string().min(1),
  organizationRegistrationNumber: z.string().optional(),
  organizationAddress: addressSchema.optional(),
  organizationPhone: z.string().regex(/^\d{0,10}$/, 'Phone number must be maximum 10 digits').optional(),
  organizationEmail: z.string().email({ message: "Please enter a valid email address" }).optional().or(z.literal('')),
  organizationSetup: organizationSetupSchema.optional(),
});

export const authRouter = router({
  // Initial setup for creating the first super admin (only works if no users exist)
  initialSetup: publicProcedure
    .input(initialSetupSchema)
    .mutation(async ({ input }) => {
      // This endpoint should only be available if no users exist in the system
      const existingUsers = await authService.getUserCount();
      
      if (existingUsers > 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'System already initialized. Please contact an administrator to create new accounts.',
        });
      }
      
      // Filter out undefined values to match the initialSetup interface
      const filteredInput = {
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        organizationName: input.organizationName,
        ...(input.organizationRegistrationNumber && { organizationRegistrationNumber: input.organizationRegistrationNumber }),
        ...(input.organizationAddress && {
          organizationAddress: {
            addressLine1: input.organizationAddress.addressLine1,
            cityVillage: input.organizationAddress.cityVillage,
            district: input.organizationAddress.district,
            state: input.organizationAddress.state,
            ...(input.organizationAddress.addressLine2 && { addressLine2: input.organizationAddress.addressLine2 }),
            ...(input.organizationAddress.pincode && { pincode: input.organizationAddress.pincode }),
            ...(input.organizationAddress.country && { country: input.organizationAddress.country }),
          }
        }),
        ...(input.organizationPhone && { organizationPhone: input.organizationPhone }),
        ...(input.organizationEmail && { organizationEmail: input.organizationEmail }),
        ...(input.organizationSetup && { organizationSetup: input.organizationSetup }),
      };
      
      const result = await authService.initialSetup(filteredInput);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to initialize system',
        });
      }
      
      return result.data;
    }),

  signUp: publicProcedure
    .input(signUpSchema)
    .mutation(async ({ input }) => {
      // Check if this is initial setup (no users exist) or if there's already an admin
      const existingUsers = await authService.getUserCount();
      
      if (existingUsers > 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Registration is closed. Users must be created by administrators.',
        });
      }
      
      // Filter out undefined values to match the signUp interface
      const filteredInput = {
        ...input,
        role: 'ADMIN' as const,
        ...(input.organizationAddress && {
          organizationAddress: {
            addressLine1: input.organizationAddress.addressLine1,
            cityVillage: input.organizationAddress.cityVillage,
            district: input.organizationAddress.district,
            state: input.organizationAddress.state,
            ...(input.organizationAddress.addressLine2 && { addressLine2: input.organizationAddress.addressLine2 }),
            ...(input.organizationAddress.pincode && { pincode: input.organizationAddress.pincode }),
            ...(input.organizationAddress.country && { country: input.organizationAddress.country }),
          }
        })
      };
      
      const result = await authService.signUp(filteredInput);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create account',
        });
      }
      
      return result.data;
    }),

  signIn: publicProcedure
    .input(signInSchema)
    .mutation(async ({ input }) => {
      const result = await authService.signIn(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: result.error || 'Invalid credentials',
        });
      }
      
      return result.data;
    }),

  verify: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ input }) => {
      const result = await authService.verifyToken(input.token);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: result.error || 'Invalid token',
        });
      }
      
      return result.data;
    }),

  resetPassword: publicProcedure
    .input(z.object({
      email: z.string().email({ message: "Please enter a valid email address" }),
    }))
    .mutation(async ({ input }) => {
      const result = await authService.resetPassword(input.email);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to reset password',
        });
      }
      
      return { success: true };
    }),

  refreshToken: publicProcedure
    .input(z.object({
      refreshToken: z.string(),
    }))
    .mutation(async ({ input }) => {
      const result = await authService.refreshToken(input.refreshToken);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: result.error || 'Invalid refresh token',
        });
      }
      
      return result.data;
    }),
});