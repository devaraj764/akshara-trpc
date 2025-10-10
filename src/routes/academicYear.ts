import { z } from 'zod';
import { router, adminProcedure, branchAdminProcedure, protectedProcedure } from '../trpc.js';
import { TRPCError } from '@trpc/server';
import { AcademicYearService } from '../services/academicYearService.js';

// Validation schemas
const createAcademicYearSchema = z.object({
  name: z.string().min(1, 'Academic year name is required').max(64),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  organizationId: z.number().positive(),
  branchId: z.number().positive().optional(),
  isCurrent: z.boolean().default(false),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  {
    message: "Start date must be before end date",
    path: ["endDate"],
  }
);

const updateAcademicYearSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1).max(64).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
  },
  {
    message: "Start date must be before end date",
    path: ["endDate"],
  }
);

export const academicYearRouter = router({
  // Get all academic years - accessible by admins, branch admins, and teachers
  getAll: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive().optional(),
      branchId: z.number().positive().optional(),
      includeDeleted: z.boolean().default(false),
      currentOnly: z.boolean().default(false),
    }))
    .query(async ({ input, ctx }) => {
      // For admins, they can specify organizationId, otherwise use their organization
      const organizationId = input.organizationId || ctx.user.organizationId;
      
      // Teachers can only access their own organization's academic years
      if (!['ADMIN', 'SUPER_ADMIN', 'BRANCH_ADMIN'].includes(ctx.user.role) && 
          input.organizationId && input.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to academic years from other organizations',
        });
      }
      
      const result = await AcademicYearService.getAll({
        ...input,
        organizationId: organizationId || undefined
      });
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch academic years',
        });
      }
      
      return result.data;
    }),

  // Get academic year by ID - accessible by admins, branch admins, and teachers
  getById: protectedProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      const result = await AcademicYearService.getById(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Academic year not found',
        });
      }

      // For non-admins (including teachers), ensure they can only access academic years from their organization
      if (!['ADMIN', 'SUPER_ADMIN'].includes(ctx.user.role) && result.data.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to this academic year',
        });
      }
      
      return result.data;
    }),

  // Get current academic year - accessible by admins, branch admins, and teachers
  getCurrent: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive().optional(),
      branchId: z.number().positive().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Use user's organization if not specified
      const organizationId = input.organizationId || ctx.user.organizationId;
      
      // Teachers can only access their own organization's academic years
      if (!['ADMIN', 'SUPER_ADMIN', 'BRANCH_ADMIN'].includes(ctx.user.role) && 
          input.organizationId && input.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to academic years from other organizations',
        });
      }
      
      if (!organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization ID is required',
        });
      }

      const result = await AcademicYearService.getCurrentAcademicYear(organizationId, input.branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'No current academic year found',
        });
      }
      
      return result.data;
    }),

  // Create academic year - admin only
  create: adminProcedure
    .input(createAcademicYearSchema)
    .mutation(async ({ input, ctx }) => {
      // For admins, ensure they create in their own organization if not specified
      const organizationId = input.organizationId || ctx.user.organizationId;
      
      if (!organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization ID is required',
        });
      }

      // For non-super admins, restrict to their organization
      if (ctx.user.role !== 'SUPER_ADMIN' && organizationId !== ctx.user.organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Can only create academic years in your assigned organization',
        });
      }

      const result = await AcademicYearService.create({
        ...input,
        organizationId
      });
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create academic year',
        });
      }
      
      return result.data;
    }),

  // Update academic year - admin only
  update: adminProcedure
    .input(updateAcademicYearSchema)
    .mutation(async ({ input, ctx }) => {
      // Pass user's organization ID for permission check
      const userOrganizationId = ctx.user.role === 'SUPER_ADMIN' ? undefined : ctx.user.organizationId;
      
      const result = await AcademicYearService.update(input.id, input, userOrganizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update academic year',
        });
      }
      
      return result.data;
    }),

  // Delete academic year (soft delete) - admin only
  delete: adminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Pass user's organization ID for permission check
      const userOrganizationId = ctx.user.role === 'SUPER_ADMIN' ? undefined : ctx.user.organizationId;
      
      const result = await AcademicYearService.delete(input.id, userOrganizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete academic year',
        });
      }
      
      return result.data;
    }),

  // Restore academic year - admin only
  restore: adminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Pass user's organization ID for permission check
      const userOrganizationId = ctx.user.role === 'SUPER_ADMIN' ? undefined : ctx.user.organizationId;
      
      const result = await AcademicYearService.restore(input.id, userOrganizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to restore academic year',
        });
      }
      
      return result.data;
    }),
});