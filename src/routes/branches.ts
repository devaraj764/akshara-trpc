import { z } from 'zod';
import { router, adminProcedure, TRPCError } from '../trpc.js';
import { branchesService } from '../services/branchesService.js';

const createBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required'),
  code: z.string().min(1, 'Branch code is required').max(10, 'Branch code must be 10 characters or less'),
  address: z.string().optional(),
  contactPhone: z.string().optional(),
  organizationId: z.number().optional(), // Optional because it will default to admin's org
  managerId: z.number().optional(),
});

const updateBranchSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Branch name is required').optional(),
  code: z.string().min(1, 'Branch code is required').max(10, 'Branch code must be 10 characters or less').optional(),
  address: z.string().optional(),
  contactPhone: z.string().optional(),
  managerId: z.number().optional(),
  isActive: z.boolean().optional(),
});

const branchFiltersSchema = z.object({
  isActive: z.boolean().optional(),
  search: z.string().optional(),
});

export const branchesRouter = router({
  getAll: adminProcedure
    .input(branchFiltersSchema.optional())
    .query(async ({ input }) => {
      const result = await branchesService.getAll(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch branches',
        });
      }
      
      return result.data;
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const result = await branchesService.getById(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Branch not found',
        });
      }
      
      return result.data;
    }),

  getByOrganization: adminProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      const result = await branchesService.getByOrganization(input.organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch branches',
        });
      }
      
      return result.data;
    }),

  create: adminProcedure
    .input(createBranchSchema)
    .mutation(async ({ input }) => {
      // Validate branch code uniqueness within organization
      const codeValidation = await branchesService.validateBranchCode(input.code, input.organizationId || 1);
      if (!codeValidation.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: codeValidation.error || 'Failed to validate branch code',
        });
      }
      
      if (!codeValidation.data) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Branch code already exists in this organization',
        });
      }
      
      const result = await branchesService.create({
        ...input,
        organizationId: input.organizationId || 1,
      });
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create branch',
        });
      }
      
      return result.data;
    }),

  update: adminProcedure
    .input(updateBranchSchema)
    .mutation(async ({ input }) => {
      // First check if branch exists
      const existingBranch = await branchesService.getById(input.id);
      if (!existingBranch.success || !existingBranch.data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Branch not found',
        });
      }
      
      // Validate branch code if it's being updated
      if (input.code) {
        const codeValidation = await branchesService.validateBranchCode(
          input.code, 
          existingBranch.data.organizationId, 
          input.id
        );
        if (!codeValidation.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: codeValidation.error || 'Failed to validate branch code',
          });
        }
        
        if (!codeValidation.data) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Branch code already exists in this organization',
          });
        }
      }
      
      const result = await branchesService.update(input.id, input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update branch',
        });
      }
      
      return result.data;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // First check if branch exists
      const existingBranch = await branchesService.getById(input.id);
      if (!existingBranch.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Branch not found',
        });
      }
      
      const result = await branchesService.delete(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete branch',
        });
      }
      
      return { success: true };
    }),

  getStats: adminProcedure
    .input(z.object({ branchId: z.number() }))
    .query(async ({ input }) => {
      // First check if branch exists
      const branch = await branchesService.getById(input.branchId);
      if (!branch.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Branch not found',
        });
      }
      
      const result = await branchesService.getStats(input.branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch branch statistics',
        });
      }
      
      return result.data;
    }),

  assignManager: adminProcedure
    .input(z.object({
      branchId: z.number(),
      managerId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // First check if branch exists
      const branch = await branchesService.getById(input.branchId);
      if (!branch.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Branch not found',
        });
      }
      
      const result = await branchesService.assignManager(input.branchId, input.managerId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to assign branch manager',
        });
      }
      
      return result.data;
    }),

  removeManager: adminProcedure
    .input(z.object({ branchId: z.number() }))
    .mutation(async ({ input }) => {
      // First check if branch exists
      const branch = await branchesService.getById(input.branchId);
      if (!branch.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Branch not found',
        });
      }
      
      const result = await branchesService.removeManager(input.branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to remove branch manager',
        });
      }
      
      return result.data;
    }),

  changeBranchManager: adminProcedure
    .input(z.object({
      branchId: z.number(),
      newManagerId: z.number(),
      currentManagerId: z.number().optional()
    }))
    .mutation(async ({ input }) => {
      const result = await branchesService.changeBranchManager(
        input.branchId, 
        input.newManagerId, 
        input.currentManagerId
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to change branch manager',
        });
      }
      
      return result.data;
    }),

  updateManager: adminProcedure
    .input(z.object({
      branchId: z.number(),
      managerId: z.number().nullable(),
    }))
    .mutation(async ({ input }) => {
      // First check if branch exists
      const branch = await branchesService.getById(input.branchId);
      if (!branch.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Branch not found',
        });
      }

      // If managerId is null, we need to remove the current manager
      if (input.managerId === null) {
        // For now, since removeManager is not implemented, return an error
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Manager removal is not yet implemented. Use the change manager function instead.',
        });
      }

      // Use changeBranchManager which is properly implemented
      const result = await branchesService.changeBranchManager(
        input.branchId, 
        input.managerId
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update branch manager',
        });
      }
      
      return result.data;
    }),
});