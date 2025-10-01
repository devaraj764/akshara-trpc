import { z } from 'zod';
import { router, adminProcedure, branchAdminProcedure, protectedProcedure } from '../trpc.js';
import { TRPCError } from '@trpc/server';
import { SubjectService } from '../services/subjectService.js';

// Validation schemas
const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(255),
  code: z.string().max(64).optional(),
  shortName: z.string().max(64).optional(),
  organizationId: z.number().positive().optional(),
  isPrivate: z.boolean().optional(),
});

const updateSubjectSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1).max(255).optional(),
  code: z.string().max(64).optional(),
  shortName: z.string().max(64).optional(),
});

const createAssignmentSchema = z.object({
  teacherId: z.number().positive(),
  subjectId: z.number().positive(),
  sectionId: z.number().positive(),
});

const assignTeacherSchema = z.object({
  subjectId: z.number().positive(),
  teacherId: z.number().positive(),
  sectionId: z.number().positive(),
});

// Main subjects router - Both admins and branch admins can manage subjects
export const subjectRouter = router({
  // Get all subjects - accessible by both admin and branch admin
  getAll: branchAdminProcedure
    .input(z.object({
      branchId: z.number().positive().optional(),
      includeTeachers: z.boolean().default(false),
      includeStats: z.boolean().default(false),
    }))
    .query(async ({ input, ctx }) => {
      // For branch admins, restrict to their branch only
      const branchId = ctx.user.role === 'ADMIN' ? input.branchId : ctx.user.branchId;
      
      const result = await SubjectService.getAll({
        ...input,
        branchId: branchId || undefined
      });
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch subjects',
        });
      }
      
      return result.data;
    }),

  // Get subject by ID
  getById: branchAdminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      const result = await SubjectService.getById(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Subject not found',
        });
      }

      // For branch admins, ensure they can only access subjects from their branch
      if (ctx.user.role !== 'ADMIN' && result.data.branchId !== ctx.user.branchId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to this subject',
        });
      }
      
      return result.data;
    }),

  // Create subject - Only admins can create subjects
  create: adminProcedure
    .input(createSubjectSchema)
    .mutation(async ({ input, ctx }) => {
      // For branch admins, ensure they create in their own organization
      if (ctx.user.role !== 'ADMIN') {
        if (input.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Can only create subjects in your assigned organization',
          });
        }
      }

      const result = await SubjectService.create(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create subject',
        });
      }
      
      return result.data;
    }),

  // Update subject - Only admins can update subjects
  update: adminProcedure
    .input(updateSubjectSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await SubjectService.update(
        input.id, 
        input, 
        ctx.user.role, 
        ctx.user.organizationId
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update subject',
        });
      }
      
      return result.data;
    }),

  // Delete subject (soft delete) - Only admins can delete subjects
  delete: adminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await SubjectService.delete(
        input.id, 
        ctx.user.role, 
        ctx.user.organizationId
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete subject',
        });
      }
      
      return result.data;
    }),

  // Restore subject - Only admins can restore subjects
  restore: adminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Pass user's branch ID for branch admin restrictions
      const userBranchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;
      
      const result = await SubjectService.restore(input.id, userBranchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to restore subject',
        });
      }
      
      return result.data;
    }),

  // Get global subjects (for org admin to select from)
  getGlobal: adminProcedure
    .query(async ({ ctx }) => {
      const result = await SubjectService.getGlobal();
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch global subjects',
        });
      }
      
      return result.data;
    }),

  // Get enabled subjects for organization
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

      const result = await SubjectService.getEnabledForOrganization(organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch enabled subjects',
        });
      }
      
      return result.data;
    }),

  // Get private subjects for organization
  getPrivateForOrganization: branchAdminProcedure
    .input(z.object({
      organizationId: z.number().positive().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // For non-super admins, use their organization
      const organizationId = ctx.user.role === 'SUPER_ADMIN' ? input.organizationId : ctx.user.organizationId;
      
      if (!organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization ID is required',
        });
      }

      const result = await SubjectService.getPrivateForOrganization(organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch private subjects',
        });
      }
      
      return result.data;
    }),

  // Check removal info - determines if subject should be deleted or just removed from enabled list
  checkRemoval: adminProcedure
    .input(z.object({
      subjectId: z.number().int().positive(),
      organizationId: z.number().int().positive().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const result = await SubjectService.checkRemoval(input.subjectId, organizationId);

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

  // Remove or delete subject based on ownership and usage
  removeOrDelete: adminProcedure
    .input(z.object({
      subjectId: z.number().int().positive(),
      organizationId: z.number().int().positive().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const result = await SubjectService.removeOrDelete(input.subjectId, organizationId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to remove or delete subject'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to remove or delete subject'
        });
      }
    }),
});

// Teacher assignment router - For managing teacher-subject relationships
export const subjectTeacherRouter = router({
  // Assign teacher to subject - Only admins can assign teachers
  assignTeacher: adminProcedure
    .input(assignTeacherSchema)
    .mutation(async ({ input }) => {
      const result = await SubjectService.assignTeacher(input.subjectId, input.teacherId, input.sectionId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to assign teacher',
        });
      }
      
      return result.data;
    }),

  // Unassign teacher from subject - Only admins can unassign teachers
  unassignTeacher: adminProcedure
    .input(assignTeacherSchema)
    .mutation(async ({ input }) => {
      const result = await SubjectService.unassignTeacher(input.subjectId, input.teacherId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to unassign teacher',
        });
      }
      
      return result.data;
    }),

  // Get subjects assigned to a teacher
  getByTeacher: branchAdminProcedure
    .input(z.object({
      teacherId: z.number().positive(),
    }))
    .query(async ({ input }) => {
      const result = await SubjectService.getSubjectsByTeacher(input.teacherId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch teacher subjects',
        });
      }
      
      return result.data;
    }),
});

// Subject Assignment router - For managing teacher-subject-section assignments
export const subjectAssignmentRouter = router({
  // Get assignments for a branch
  getByBranch: branchAdminProcedure
    .input(z.object({
      branchId: z.number().positive().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // For branch admins, use their branch
      const branchId = ctx.user.role === 'ADMIN' ? input.branchId : ctx.user.branchId;
      
      if (!branchId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Branch ID is required',
        });
      }

      const result = await SubjectService.getAssignmentsByBranch(branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch assignments',
        });
      }
      
      return result.data;
    }),

  // Create assignment - Only admins can create assignments
  create: adminProcedure
    .input(createAssignmentSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await SubjectService.createAssignment(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create assignment',
        });
      }
      
      return result.data;
    }),

  // Delete assignment - Only admins can delete assignments
  delete: adminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const result = await SubjectService.deleteAssignment(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete assignment',
        });
      }
      
      return result.data;
    }),
});

// Combined router
export const subjectsRouter = router({
  subjects: subjectRouter,
  teacherAssignments: subjectTeacherRouter,
  assignments: subjectAssignmentRouter,
});