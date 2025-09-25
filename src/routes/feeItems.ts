import { z } from 'zod';
import { router, adminProcedure, branchAdminProcedure, TRPCError } from '../trpc.js';
import { FeeItemsService } from '../services/feeItemsService.js';

const createFeeItemSchema = z.object({
  name: z.string().min(1, 'Fee item name is required'),
  amountPaise: z.number().int().min(0, 'Amount must be a positive integer'),
  isMandatory: z.boolean().optional().default(true),
  academicYearId: z.number().int().positive('Academic Year ID is required'),
  branchId: z.number().int().positive().optional().nullable(),
  organizationId: z.number().int().positive('Organization ID is required'),
  enabledGrades: z.array(z.number().int().positive()).optional().default([]),
  feeTypeId: z.number().int().positive('Fee Type ID is required')
});

const updateFeeItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1, 'Fee item name is required').optional(),
  amountPaise: z.number().int().min(0, 'Amount must be a positive integer').optional(),
  isMandatory: z.boolean().optional(),
  enabledGrades: z.array(z.number().int().positive()).optional(),
  feeTypeId: z.number().int().positive().optional()
});

const getFeeItemsSchema = z.object({
  branchId: z.number().int().positive().optional(),
  academicYearId: z.number().int().positive().optional(),
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

  getAll: adminProcedure
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

  getById: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
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
      organizationId: z.number().int().positive().optional(),
      academicYearId: z.number().int().positive().optional()
    }))
    .query(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const result = await FeeItemsService.getOrganizationFeeItems(organizationId, input.academicYearId);

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

  // Branch Admin procedures - can manage branch-level fee items
  branchCreate: branchAdminProcedure
    .input(createFeeItemSchema.omit({ branchId: true, organizationId: true }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await FeeItemsService.create({
          ...input,
          branchId: ctx.user.branchId!,
          organizationId: ctx.user.organizationId
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

  branchUpdate: branchAdminProcedure
    .input(updateFeeItemSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify the fee item belongs to this branch
        const feeItem = await FeeItemsService.getById(input.id);
        if (!feeItem.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Fee item not found'
          });
        }

        if (feeItem.data.branchId !== ctx.user.branchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to update this fee item'
          });
        }

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

  branchDelete: branchAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify the fee item belongs to this branch
        const feeItem = await FeeItemsService.getById(input.id);
        if (!feeItem.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Fee item not found'
          });
        }

        if (feeItem.data.branchId !== ctx.user.branchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to delete this fee item'
          });
        }

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

  getBranchFeeItems: branchAdminProcedure
    .input(z.object({ 
      academicYearId: z.number().int().positive().optional(),
      feeTypeId: z.number().int().positive().optional(),
      includeDeleted: z.boolean().optional().default(false)
    }))
    .query(async ({ input, ctx }) => {
      try {
        const result = await FeeItemsService.getBranchFeeItems(ctx.user.branchId!, input.academicYearId);

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