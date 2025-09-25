import { z } from 'zod';
import { router, publicProcedure, TRPCError } from '../trpc.js';
import { authService } from '../services/authService.js';

const signUpSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6),
  fullName: z.string().min(1),
  organizationName: z.string().min(1),
  organizationRegistrationNumber: z.string().optional(),
  organizationAddress: z.string().optional(),
  organizationPhone: z.string().optional(),
  organizationEmail: z.string().email({ message: "Please enter a valid email address" }).optional(),
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
      
      const result = await authService.initialSetup(input);
      
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
      
      const result = await authService.signUp({ ...input, role: 'ADMIN' });
      
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