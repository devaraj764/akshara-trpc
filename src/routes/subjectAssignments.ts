import { z } from 'zod';
import { router, branchAdminProcedure, publicProcedure, TRPCError } from '../trpc.js';
import { SubjectAssignmentsService } from '../services/subjectAssignmentsService.js';

const createSubjectAssignmentSchema = z.object({
  subjectId: z.number().int().min(1, 'Subject ID is required'),
  sectionId: z.number().int().min(1, 'Section ID is required'),
  staffId: z.number().int().min(1, 'Staff ID is required'),
});

const updateSubjectAssignmentSchema = z.object({
  id: z.number().int().min(1),
  subjectId: z.number().int().min(1, 'Subject ID is required').optional(),
  sectionId: z.number().int().min(1, 'Section ID is required').optional(),
  staffId: z.number().int().min(1, 'Staff ID is required').optional(),
});

const getSubjectAssignmentsSchema = z.object({
  branchId: z.number().int().min(1).optional(),
  sectionId: z.number().int().min(1).optional(),
  subjectId: z.number().int().min(1).optional(),
  staffId: z.number().int().min(1).optional(),
});

const bulkAssignSchema = z.object({
  sectionId: z.number().int().min(1, 'Section ID is required'),
  assignments: z.array(z.object({
    subjectId: z.number().int().min(1, 'Subject ID is required'),
    staffId: z.number().int().min(1, 'Staff ID is required'),
  })).min(1, 'At least one assignment is required'),
});

export const subjectAssignmentsRouter = router({
  // Create a new subject assignment - Branch Admin and above can create
  create: branchAdminProcedure
    .input(createSubjectAssignmentSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await SubjectAssignmentsService.create(input);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to create subject assignment'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create subject assignment'
        });
      }
    }),

  // Get all subject assignments with filters - Available to all authenticated users
  getAll: publicProcedure
    .input(getSubjectAssignmentsSchema)
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        // If no branchId provided in input, use user's branch
        const queryOptions = {
          ...input,
          branchId: input.branchId || ctx.user.branchId || ctx.user.organizationId
        };

        const result = await SubjectAssignmentsService.getAll(queryOptions);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch subject assignments'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch subject assignments'
        });
      }
    }),

  // Get subject assignment by ID - Available to all authenticated users
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

        const result = await SubjectAssignmentsService.getById(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: result.error || 'Subject assignment not found'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch subject assignment'
        });
      }
    }),

  // Update subject assignment - Branch Admin and above can update
  update: branchAdminProcedure
    .input(updateSubjectAssignmentSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, ...updateData } = input;
        const result = await SubjectAssignmentsService.update(id, updateData);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to update subject assignment'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update subject assignment'
        });
      }
    }),

  // Delete subject assignment - Branch Admin and above can delete
  delete: branchAdminProcedure
    .input(z.object({ id: z.number().int().min(1) }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await SubjectAssignmentsService.delete(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to delete subject assignment'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete subject assignment'
        });
      }
    }),

  // Get assignments by branch - Available to all authenticated users
  getByBranch: publicProcedure
    .input(z.object({ branchId: z.number().int().min(1).optional() }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        const branchId = input.branchId || ctx.user.branchId || ctx.user.organizationId;
        const result = await SubjectAssignmentsService.getByBranch(branchId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch branch assignments'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch branch assignments'
        });
      }
    }),

  // Get assignments by section - Available to all authenticated users
  getBySection: publicProcedure
    .input(z.object({ sectionId: z.number().int().min(1) }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        const result = await SubjectAssignmentsService.getBySection(input.sectionId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch section assignments'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch section assignments'
        });
      }
    }),

  // Get assignments by staff - Available to all authenticated users
  getByStaff: publicProcedure
    .input(z.object({ staffId: z.number().int().min(1) }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        const result = await SubjectAssignmentsService.getByStaff(input.staffId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch staff assignments'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch staff assignments'
        });
      }
    }),

  // Get assignments by subject - Available to all authenticated users
  getBySubject: publicProcedure
    .input(z.object({ subjectId: z.number().int().min(1) }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        const result = await SubjectAssignmentsService.getBySubject(input.subjectId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch subject assignments'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch subject assignments'
        });
      }
    }),

  // Bulk assign subjects to a section - Branch Admin and above can create
  bulkAssignToSection: branchAdminProcedure
    .input(bulkAssignSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await SubjectAssignmentsService.bulkAssignToSection(
          input.sectionId,
          input.assignments
        );

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to bulk assign subjects'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to bulk assign subjects'
        });
      }
    }),

  // Get staff workload - Available to all authenticated users
  getStaffWorkload: publicProcedure
    .input(z.object({ branchId: z.number().int().min(1).optional() }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        const branchId = input.branchId || ctx.user.branchId || ctx.user.organizationId;
        const result = await SubjectAssignmentsService.getStaffWorkload(branchId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch staff workload'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch staff workload'
        });
      }
    }),
});