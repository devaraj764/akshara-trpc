import { z } from 'zod';
import { router, adminProcedure, branchAdminProcedure, TRPCError } from '../trpc.js';
import { FeeTypesService } from '../services/feeTypesService.js';

const createFeeTypeSchema = z.object({
  organizationId: z.number().int().positive().optional().nullable(),
  code: z.string().min(1, 'Fee type code is required').optional(),
  name: z.string().min(1, 'Fee type name is required'),
  description: z.string().optional(),
  isPrivate: z.boolean().optional().default(false)
});

const updateFeeTypeSchema = z.object({
  id: z.number().int().positive(),
  code: z.string().min(1, 'Fee type code is required').optional(),
  name: z.string().min(1, 'Fee type name is required').optional(),
  description: z.string().optional(),
  isPrivate: z.boolean().optional()
});

const getFeeTypesSchema = z.object({
  organizationId: z.number().int().positive().optional(),
  includeDeleted: z.boolean().optional().default(false),
  includePrivate: z.boolean().optional().default(false)
});

export const feeTypesRouter = router({
  // Admin procedures - can manage all fee types
  create: adminProcedure
    .input(createFeeTypeSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await FeeTypesService.create(input);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to create fee type'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create fee type'
        });
      }
    }),

  update: adminProcedure
    .input(updateFeeTypeSchema)
    .mutation(async ({ input }) => {
      try {
        const { id, ...updateData } = input;
        const result = await FeeTypesService.update(id, updateData);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to update fee type'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update fee type'
        });
      }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      try {
        const result = await FeeTypesService.delete(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to delete fee type'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete fee type'
        });
      }
    }),

  getAll: branchAdminProcedure
    .input(getFeeTypesSchema)
    .query(async ({ input, ctx }) => {
      try {
        const result = await FeeTypesService.getAll(input);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch fee types'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch fee types'
        });
      }
    }),

  getById: branchAdminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        const result = await FeeTypesService.getById(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: result.error || 'Fee type not found'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch fee type'
        });
      }
    }),

  getOrganizationFeeTypes: branchAdminProcedure
    .input(z.object({ organizationId: z.number().int().positive().optional() }))
    .query(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const result = await FeeTypesService.getOrganizationFeeTypes(organizationId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch organization fee types'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch organization fee types'
        });
      }
    }),

  getGlobalFeeTypes: adminProcedure
    .query(async () => {
      try {
        const result = await FeeTypesService.getGlobalFeeTypes();

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch global fee types'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch global fee types'
        });
      }
    }),

  getEnabledFeeTypes: adminProcedure
    .input(z.object({ organizationId: z.number().int().positive().optional() }))
    .query(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const result = await FeeTypesService.getEnabledFeeTypes(organizationId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch enabled fee types'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch enabled fee types'
        });
      }
    }),

  addToEnabledFeeTypes: adminProcedure
    .input(z.object({
      organizationId: z.number().int().positive().optional(),
      feeTypeIds: z.array(z.number().int().positive()).min(1, 'At least one fee type ID is required')
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const result = await FeeTypesService.addToEnabledFeeTypes(organizationId, input.feeTypeIds);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to add fee types to enabled list'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to add fee types to enabled list'
        });
      }
    }),

  getStats: adminProcedure
    .input(z.object({ organizationId: z.number().int().positive().optional() }))
    .query(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const result = await FeeTypesService.getFeeTypeStats(organizationId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch fee type stats'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch fee type stats'
        });
      }
    }),

  // Branch Admin procedures
  branchGetOrganizationFeeTypes: branchAdminProcedure
    .query(async ({ ctx }) => {
      try {
        const result = await FeeTypesService.getOrganizationFeeTypes(ctx.user.organizationId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch organization fee types'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch organization fee types'
        });
      }
    }),

  branchGetStats: branchAdminProcedure
    .query(async ({ ctx }) => {
      try {
        const result = await FeeTypesService.getFeeTypeStats(ctx.user.organizationId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch fee type stats'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch fee type stats'
        });
      }
    }),

  // Check removal info - determines if fee type should be deleted or just removed from enabled list
  checkRemoval: adminProcedure
    .input(z.object({
      feeTypeId: z.number().int().positive(),
      organizationId: z.number().int().positive().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const result = await FeeTypesService.checkRemoval(input.feeTypeId, organizationId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to check removal info'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to check removal info'
        });
      }
    }),

  // Remove or delete fee type based on ownership and usage
  removeOrDelete: adminProcedure
    .input(z.object({
      feeTypeId: z.number().int().positive(),
      organizationId: z.number().int().positive().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const result = await FeeTypesService.removeOrDelete(input.feeTypeId, organizationId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to remove or delete fee type'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to remove or delete fee type'
        });
      }
    }),

  // Restore fee type - Only admins can restore fee types
  restore: adminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await FeeTypesService.restore(input.id, ctx.user.organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to restore fee type',
        });
      }
      
      return result.data;
    }),
});