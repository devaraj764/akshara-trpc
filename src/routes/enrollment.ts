import { z } from 'zod';
import { router, protectedProcedure, branchAdminProcedure, adminProcedure, TRPCError } from '../trpc.js';
import { EnrollmentService } from '../services/enrollmentService.js';

const createEnrollmentSchema = z.object({
  studentId: z.number(),
  branchId: z.number(),
  classId: z.number(),
  sectionId: z.number().optional(),
  academicYearId: z.number(),
  rollNumber: z.number().optional(),
  status: z.string().optional(),
});

const updateEnrollmentSchema = z.object({
  id: z.number(),
  classId: z.number().optional(),
  sectionId: z.number().optional(),
  rollNumber: z.number().optional(),
  status: z.string().optional(),
});

export const enrollmentRouter = router({
  // Get enrollment by ID
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const result = await EnrollmentService.getById(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Enrollment not found',
        });
      }
      
      return result.data;
    }),

  // Get enrollments by student ID
  getByStudentId: protectedProcedure
    .input(z.object({
      studentId: z.number(),
      academicYearId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const result = await EnrollmentService.getByStudentId(input.studentId, input.academicYearId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch student enrollments',
        });
      }
      
      return result.data;
    }),

  // Get current enrollment for a student
  getCurrentEnrollment: protectedProcedure
    .input(z.object({
      studentId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const result = await EnrollmentService.getCurrentEnrollment(input.studentId);
      
      if (!result.success) {
        // Return null if no current enrollment found instead of throwing error
        return null;
      }
      
      return result.data;
    }),

  // Get all enrollments with filtering
  getAll: branchAdminProcedure
    .input(z.object({
      branchId: z.number().optional(),
      classId: z.number().optional(),
      sectionId: z.number().optional(),
      academicYearId: z.number().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      // For non-admin users, use their branch context
      const filters = {
        branchId: ctx.user.role === 'SUPER_ADMIN' ? input?.branchId : ctx.user.branchId,
        classId: input?.classId,
        sectionId: input?.sectionId,
        academicYearId: input?.academicYearId,
        status: input?.status,
      };

      const result = await EnrollmentService.getAll(filters);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch enrollments',
        });
      }
      
      return result.data;
    }),

  // Create new enrollment
  create: branchAdminProcedure
    .input(createEnrollmentSchema)
    .mutation(async ({ input, ctx }) => {
      // Ensure user can only create enrollments in their branch
      const enrollmentData = {
        ...input,
        branchId: ctx.user.role === 'ADMIN' || ctx.user.role === 'SUPER_ADMIN' ? input.branchId : ctx.user.branchId,
      };

      const result = await EnrollmentService.create(enrollmentData);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create enrollment',
        });
      }
      
      return result.data;
    }),

  // Update enrollment
  update: branchAdminProcedure
    .input(updateEnrollmentSchema)
    .mutation(async ({ input, ctx }) => {
      // First check if enrollment exists and user has permission
      const existingEnrollment = await EnrollmentService.getById(input.id);
      if (!existingEnrollment.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Enrollment not found',
        });
      }

      // Check permissions
      if (ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'ADMIN') {
        if (existingEnrollment.data.branchId !== ctx.user.branchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update enrollments in your branch',
          });
        }
      }

      const result = await EnrollmentService.update(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update enrollment',
        });
      }
      
      return result.data;
    }),

  // Delete enrollment (soft delete)
  delete: branchAdminProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // First check if enrollment exists and user has permission
      const existingEnrollment = await EnrollmentService.getById(input.id);
      if (!existingEnrollment.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Enrollment not found',
        });
      }

      // Check permissions
      if (ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'ADMIN') {
        if (existingEnrollment.data.branchId !== ctx.user.branchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only delete enrollments in your branch',
          });
        }
      }

      const result = await EnrollmentService.delete(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete enrollment',
        });
      }
      
      return { success: true };
    }),
});