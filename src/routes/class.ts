import { z } from 'zod';
import { router, protectedProcedure, adminProcedure, branchAdminProcedure, TRPCError } from '../trpc.js';
import { ClassService } from '../services/classService.js';

const createClassSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  displayName: z.string().optional(),
  gradeLevel: z.number().min(1).max(12),
  level: z.enum(['Primary', 'Middle School', 'High School', 'Senior Secondary']),
  description: z.string().optional(),
  organizationId: z.number().optional(),
  branchId: z.number().optional(),
  isPrivate: z.boolean().optional(),
});

const updateClassSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  displayName: z.string().optional(),
  gradeLevel: z.number().min(1).max(12).optional(),
  level: z.enum(['Primary', 'Middle School', 'High School', 'Senior Secondary']).optional(),
  description: z.string().optional(),
  isPrivate: z.boolean().optional(),
});

const createSectionSchema = z.object({
  gradeId: z.number(),
  name: z.string().min(1, 'Section name is required'),
  capacity: z.number().positive().optional(),
  branchId: z.number(),
});

const updateSectionSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  capacity: z.number().positive().optional(),
});

export const classRouter = router({
  // Classes (Grades) Management - Admin only for CRUD
  getAll: protectedProcedure
    .input(z.object({
      includeSections: z.boolean().optional(),
      includeBranches: z.boolean().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const result = await ClassService.getAll({
        includeSections: input?.includeSections || false,
        includeBranches: input?.includeBranches || false,
        organizationId: ctx.user.organizationId,
      });
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch classes',
        });
      }
      
      return result.data;
    }),

  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
      includeSections: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const result = await ClassService.getById(input.id, input.includeSections);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Class not found',
        });
      }
      
      return result.data;
    }),

  create: adminProcedure
    .input(createClassSchema)
    .mutation(async ({ input, ctx }) => {
      // For non-super admins, ensure they create in their own organization
      if (ctx.user.role !== 'SUPER_ADMIN') {
        if (input.organizationId && input.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Can only create classes in your assigned organization',
          });
        }
      }

      const result = await ClassService.create({
        ...input,
        organizationId: input.organizationId || ctx.user.organizationId,
        branchId: input.branchId || ctx.user.branchId,
      });
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create class',
        });
      }
      
      return result.data;
    }),

  update: adminProcedure
    .input(updateClassSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await ClassService.update(
        input.id, 
        input, 
        ctx.user.role, 
        ctx.user.organizationId
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update class',
        });
      }
      
      return result.data;
    }),

  delete: adminProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await ClassService.delete(
        input.id, 
        ctx.user.role, 
        ctx.user.organizationId
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete class',
        });
      }
      
      return result.data;
    }),

  // Get global classes (for admin selection)
  getGlobal: adminProcedure
    .query(async ({ ctx }) => {
      const result = await ClassService.getGlobal();
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch global classes',
        });
      }
      
      return result.data;
    }),

  // Get enabled classes for organization
  getEnabledForOrganization: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      // Only SUPER_ADMIN can specify organizationId, others use their own
      let organizationId: number;
      
      if (ctx.user.role === 'SUPER_ADMIN' && input?.organizationId) {
        organizationId = input.organizationId;
      } else {
        if (!ctx.user.organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization ID is required',
          });
        }
        organizationId = ctx.user.organizationId;
      }

      const result = await ClassService.getEnabledForOrganization(organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch enabled classes',
        });
      }
      
      return result.data;
    }),

  // Get private classes for organization
  getPrivateForOrganization: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // For non-super admins, use their organization
      const organizationId = input.organizationId || ctx.user.organizationId;
      
      if (!organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization ID is required',
        });
      }

      // Non-super admins can only access their own organization
      if (ctx.user.role !== 'SUPER_ADMIN' && organizationId !== ctx.user.organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Can only access classes from your assigned organization',
        });
      }

      const result = await ClassService.getPrivateForOrganization(organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch private classes',
        });
      }
      
      return result.data;
    }),
});

// Sections Router - Branch admins can manage sections within their branch
export const sectionRouter = router({
  getByBranch: branchAdminProcedure
    .input(z.object({
      branchId: z.number().optional(), // If not provided, use user's branch
    }))
    .query(async ({ input, ctx }) => {
      const branchId = input.branchId || ctx.user.branchId;
      
      if (!branchId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Branch ID is required',
        });
      }

      const result = await ClassService.getSectionsByBranch(branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch sections',
        });
      }
      
      return result.data;
    }),

  getByClass: branchAdminProcedure
    .input(z.object({
      classId: z.number(),
      branchId: z.number().optional(), // If not provided, use user's branch
    }))
    .query(async ({ input, ctx }) => {
      const branchId = input.branchId || ctx.user.branchId;
      
      if (!branchId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Branch ID is required',
        });
      }

      const result = await ClassService.getSectionsByClass(input.classId, branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch sections',
        });
      }
      
      return result.data;
    }),

  create: branchAdminProcedure
    .input(createSectionSchema)
    .mutation(async ({ input, ctx }) => {
      // Ensure branch admin can only create sections in their branch
      const branchId = ctx.user.branchId;
      
      if (!branchId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Branch assignment required',
        });
      }

      if (input.branchId !== branchId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Can only create sections in your assigned branch',
        });
      }

      const result = await ClassService.createSection(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create section',
        });
      }
      
      return result.data;
    }),

  update: branchAdminProcedure
    .input(updateSectionSchema)
    .mutation(async ({ input, ctx }) => {
      // Verify the section belongs to the user's branch
      const result = await ClassService.updateSection(input.id, input, ctx.user.branchId!);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update section',
        });
      }
      
      return result.data;
    }),

  delete: branchAdminProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify the section belongs to the user's branch
      const result = await ClassService.deleteSection(input.id, ctx.user.branchId!);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete section',
        });
      }
      
      return result.data;
    }),

  restore: branchAdminProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify the section belongs to the user's branch
      const result = await ClassService.restoreSection(input.id, ctx.user.branchId!);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to restore section',
        });
      }
      
      return result.data;
    }),
});