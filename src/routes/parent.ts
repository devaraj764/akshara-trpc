import { z } from 'zod';
import { router, protectedProcedure, branchAdminProcedure, TRPCError } from '../trpc.js';
import { CreateParentData, ParentService, ParentSearchFilters, PaginationOptions } from '../services/parentService.js';

const createParentSchema = z.object({
  studentId: z.number(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email().optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  companyName: z.string().optional(),
  annualIncome: z.number().optional(),
  relationship: z.string().min(1, "Relationship is required"),
  isPrimary: z.boolean().optional(),
  canViewReports: z.boolean().optional(),
  canViewFees: z.boolean().optional(),
  contactPriority: z.number().optional(),
});

const updateParentSchema = z.object({
  id: z.number(),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().optional(),
  phone: z.string().min(1, "Phone number is required").optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  companyName: z.string().optional(),
  annualIncome: z.number().optional(),
  relationship: z.string().optional(),
});

const linkParentSchema = z.object({
  studentId: z.number(),
  parentId: z.number(),
  relationship: z.string().optional(),
  isPrimary: z.boolean().optional(),
  canViewReports: z.boolean().optional(),
  canViewFees: z.boolean().optional(),
  contactPriority: z.number().optional(),
});

export const parentRouter = router({
  // Enhanced search parents
  searchParents: protectedProcedure
    .input(z.object({
      searchTerm: z.string().optional(),
      branchId: z.number().optional(),
      organizationId: z.number().optional(),
      hasStudents: z.boolean().optional(),
      excludeStudentId: z.number().optional(),
      page: z.number().min(1).optional(),
      limit: z.number().min(1).max(100).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const filters: ParentSearchFilters = {
        searchTerm: input.searchTerm || "",
        branchId: input.branchId,
        organizationId: input.organizationId,
        hasStudents: input.hasStudents,
        excludeStudentId: input.excludeStudentId,
      };
      
      const pagination: PaginationOptions = {
        page: input.page,
        limit: input.limit,
      };
      
      const result = await ParentService.searchParents(filters, pagination);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to search parents',
        });
      }
      
      return result.data;
    }),

  // Get parent by ID
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const result = await ParentService.getById(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Parent not found',
        });
      }
      
      return result.data;
    }),

  // Get parents by student ID
  getByStudentId: protectedProcedure
    .input(z.object({
      studentId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const result = await ParentService.getByStudentId(input.studentId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch student parents',
        });
      }
      
      return result.data;
    }),

  // Create parent and link to student
  createAndLinkToStudent: branchAdminProcedure
    .input(createParentSchema)
    .mutation(async ({ input, ctx }) => {
      const { studentId, isPrimary, canViewReports, canViewFees, contactPriority, ...parentData } = input;

      // Ensure user can only create parents in their branch
      const finalParentData: CreateParentData = {
        ...parentData,
        organizationId: ctx.user.organizationId!,
        branchId: ctx.user.branchId!,
        phone: parentData.phone.trim()        
      };

      const linkData = {
        isPrimary: isPrimary ?? false,
        canViewReports: canViewReports ?? false,
        canViewFees: canViewFees ?? false,
        contactPriority: contactPriority ?? 0,
      };

      const result = await ParentService.createAndLinkToStudent(finalParentData, studentId, linkData);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create parent',
        });
      }
      
      return result.data;
    }),

  // Link existing parent to student
  linkToStudent: branchAdminProcedure
    .input(linkParentSchema)
    .mutation(async ({ input }) => {
      const result = await ParentService.linkToStudent(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to link parent to student',
        });
      }
      
      return result.data;
    }),

  // Update parent
  update: branchAdminProcedure
    .input(updateParentSchema)
    .mutation(async ({ input, ctx }) => {
      // First check if parent exists and user has permission
      const existingParent = await ParentService.getById(input.id);
      if (!existingParent.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Parent not found',
        });
      }

      // Check permissions
      if (ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'ADMIN') {
        if (existingParent.data.branchId !== ctx.user.branchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update parents in your branch',
          });
        }
      }

      const result = await ParentService.update(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update parent',
        });
      }
      
      return result.data;
    }),

  // Unlink parent from student
  unlinkFromStudent: branchAdminProcedure
    .input(z.object({
      studentId: z.number(),
      parentId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await ParentService.unlinkFromStudent(input.studentId, input.parentId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to unlink parent from student',
        });
      }
      
      return { success: true };
    }),

  // Delete parent (soft delete)
  delete: branchAdminProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // First check if parent exists and user has permission
      const existingParent = await ParentService.getById(input.id);
      if (!existingParent.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Parent not found',
        });
      }

      // Check permissions
      if (ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'ADMIN') {
        if (existingParent.data.branchId !== ctx.user.branchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only delete parents in your branch',
          });
        }
      }

      const result = await ParentService.delete(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete parent',
        });
      }
      
      return { success: true };
    }),
});