import { z } from 'zod';
import { router, adminProcedure, branchAdminProcedure, TRPCError } from '../trpc.js';
import { FeeItemsService } from '../services/feeItemsService.js';

const createFeeItemSchema = z.object({
  name: z.string().min(1, 'Fee item name is required'),
  amountPaise: z.number().int().min(0, 'Amount must be a positive integer'),
  isMandatory: z.boolean().optional().default(true),
  branchId: z.number().int().positive().optional().nullable(),
  organizationId: z.number().int().positive('Organization ID is required'),
  enabledClasses: z.array(z.number().int().positive()).optional().default([]),
  feeTypeId: z.number().int().positive('Fee Type ID is required')
});

const updateFeeItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1, 'Fee item name is required').optional(),
  amountPaise: z.number().int().min(0, 'Amount must be a positive integer').optional(),
  isMandatory: z.boolean().optional(),
  enabledClasses: z.array(z.number().int().positive()).optional(),
  feeTypeId: z.number().int().positive().optional()
});

const getFeeItemsSchema = z.object({
  branchId: z.number().int().positive().optional(),
  organizationId: z.number().int().positive().optional(),
  feeTypeId: z.number().int().positive().optional(),
  includeDeleted: z.boolean().optional().default(false)
});

export const feeItemsRouter = router({
  // Admin procedures - can manage all fee items
  create: adminProcedure
    .input(createFeeItemSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await FeeItemsService.create({
          ...input,
          organizationId: input.organizationId || ctx.user.organizationId
        });

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to create fee item'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create fee item'
        });
      }
    }),

  update: adminProcedure
    .input(updateFeeItemSchema)
    .mutation(async ({ input }) => {
      try {
        const { id, ...updateData } = input;
        const result = await FeeItemsService.update(id, updateData);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to update fee item'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update fee item'
        });
      }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      try {
        const result = await FeeItemsService.delete(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to delete fee item'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete fee item'
        });
      }
    }),

  getAll: branchAdminProcedure
    .input(getFeeItemsSchema)
    .query(async ({ input, ctx }) => {
      try {
        const result = await FeeItemsService.getAll({
          ...input,
          organizationId: input.organizationId || ctx.user.organizationId
        });

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch fee items'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch fee items'
        });
      }
    }),

  getById: branchAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        const result = await FeeItemsService.getById(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: result.error || 'Fee item not found'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch fee item'
        });
      }
    }),

  getOrganizationFeeItems: adminProcedure
    .input(z.object({ 
      organizationId: z.number().int().positive().optional()
    }))
    .query(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const result = await FeeItemsService.getOrganizationFeeItems(organizationId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch organization fee items'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch organization fee items'
        });
      }
    }),

  getStats: adminProcedure
    .input(z.object({ 
      organizationId: z.number().int().positive().optional(),
      branchId: z.number().int().positive().optional()
    }))
    .query(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const result = await FeeItemsService.getFeeItemStats(organizationId, input.branchId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch fee item stats'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch fee item stats'
        });
      }
    }),



  getBranchFeeItems: branchAdminProcedure
    .input(z.object({ 
      feeTypeId: z.number().int().positive().optional(),
      includeDeleted: z.boolean().optional().default(false)
    }))
    .query(async ({ input, ctx }) => {
      try {
        const result = await FeeItemsService.getBranchFeeItems(ctx.user.branchId!);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch branch fee items'
          });
        }

        // Filter by fee type if specified
        let data = result.data || [];
        if (input.feeTypeId) {
          data = data.filter(item => item.feeTypeId === input.feeTypeId);
        }

        return data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch branch fee items'
        });
      }
    }),

  getBranchStats: branchAdminProcedure
    .query(async ({ ctx }) => {
      try {
        const result = await FeeItemsService.getFeeItemStats(undefined, ctx.user.branchId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch branch fee item stats'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch branch fee item stats'
        });
      }
    }),
});