import { z } from 'zod';
import { router, branchAdminProcedure, publicProcedure, TRPCError } from '../trpc.js';
import { PeriodsService } from '../services/periodsService.js';

const createPeriodSchema = z.object({
  name: z.string().min(1, 'Period name is required'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format (HH:MM)'),
  order: z.number().int().min(1).optional(),
  isBreak: z.boolean().optional().default(false),
});

const updatePeriodSchema = z.object({
  id: z.number().int().min(1),
  name: z.string().min(1, 'Period name is required').optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format (HH:MM)').optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format (HH:MM)').optional(),
  order: z.number().int().min(1).optional(),
  isBreak: z.boolean().optional(),
});

const reorderPeriodsSchema = z.object({
  periods: z.array(z.object({
    id: z.number().int().min(1),
    order: z.number().int().min(1),
  })),
});

export const periodsRouter = router({
  // Create a new period - Branch Admin and above can create
  create: branchAdminProcedure
    .input(createPeriodSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await PeriodsService.create({
          ...input,
          branchId: ctx.user.branchId || ctx.user.organizationId, // Use branchId if available, fallback to organizationId
        });

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to create period'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create period'
        });
      }
    }),

  // Get all periods for current branch - Available to all authenticated users
  getByBranch: publicProcedure
    .query(async ({ ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        const branchId = ctx.user.branchId || ctx.user.organizationId;
        const result = await PeriodsService.getByBranch(branchId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch periods'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch periods'
        });
      }
    }),

  // Get period by ID - Available to all authenticated users
  getById: publicProcedure
    .input(z.object({ id: z.number().int().min(1) }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        const result = await PeriodsService.getById(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: result.error || 'Period not found'
          });
        }

        // Verify the period belongs to user's branch
        const userBranchId = ctx.user.branchId || ctx.user.organizationId;
        if (result.data.branchId !== userBranchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied to this period'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch period'
        });
      }
    }),

  // Update period - Branch Admin and above can update
  update: branchAdminProcedure
    .input(updatePeriodSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // First check if period exists and belongs to user's branch
        const existingPeriod = await PeriodsService.getById(input.id);
        if (!existingPeriod.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Period not found'
          });
        }

        const userBranchId = ctx.user.branchId || ctx.user.organizationId;
        if (existingPeriod.data.branchId !== userBranchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied to update this period'
          });
        }

        const { id, ...updateData } = input;
        const result = await PeriodsService.update(id, updateData);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to update period'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update period'
        });
      }
    }),

  // Delete period - Branch Admin and above can delete
  delete: branchAdminProcedure
    .input(z.object({ id: z.number().int().min(1) }))
    .mutation(async ({ input, ctx }) => {
      try {
        // First check if period exists and belongs to user's branch
        const existingPeriod = await PeriodsService.getById(input.id);
        if (!existingPeriod.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Period not found'
          });
        }

        const userBranchId = ctx.user.branchId || ctx.user.organizationId;
        if (existingPeriod.data.branchId !== userBranchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied to delete this period'
          });
        }

        const result = await PeriodsService.delete(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to delete period'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete period'
        });
      }
    }),

  // Reorder periods - Branch Admin and above can reorder
  reorder: branchAdminProcedure
    .input(reorderPeriodsSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const userBranchId = ctx.user.branchId || ctx.user.organizationId;
        const result = await PeriodsService.reorderPeriods(userBranchId, input.periods);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to reorder periods'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to reorder periods'
        });
      }
    }),
});