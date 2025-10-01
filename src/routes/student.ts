import { z } from 'zod';
import { router, protectedProcedure, branchAdminProcedure, adminProcedure, teacherProcedure, TRPCError } from '../trpc.js';
import { StudentService } from '../services/studentService.js';

const emergencyContactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  relationship: z.string(),
  address: z.string().optional(),
});

const createStudentSchema = z.object({
  organizationId: z.number(),
  branchId: z.number(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  admissionNumber: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  emergencyContact: emergencyContactSchema.optional(),
  photoUrl: z.string().optional(),
  meta: z.any().optional(),
});

const updateStudentSchema = z.object({
  id: z.number(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  admissionNumber: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  emergencyContact: emergencyContactSchema.optional(),
  photoUrl: z.string().optional(),
  meta: z.any().optional(),
});

export const studentRouter = router({
  // Get student by ID
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const result = await StudentService.getById(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Student not found',
        });
      }
      
      return result.data;
    }),

  // Get all students with filtering
  getAll: branchAdminProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      branchId: z.number().optional(),
      search: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      // For non-admin users, use their organization/branch context
      const filters = {
        organizationId: ctx.user.role === 'SUPER_ADMIN' ? input?.organizationId : ctx.user.organizationId,
        branchId: ctx.user.role === 'ADMIN' || ctx.user.role === 'SUPER_ADMIN' ? input?.branchId : ctx.user.branchId,
        search: input?.search,
        isActive: input?.isActive,
      };

      const result = await StudentService.getAll(filters);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch students',
        });
      }
      
      return result.data;
    }),

  // Create new student
  create: branchAdminProcedure
    .input(createStudentSchema)
    .mutation(async ({ input, ctx }) => {
      // Ensure user can only create students in their organization/branch
      const studentData = {
        ...input,
        organizationId: ctx.user.organizationId || input.organizationId,
        branchId: ctx.user.role === 'ADMIN' || ctx.user.role === 'SUPER_ADMIN' ? input.branchId : ctx.user.branchId,
      };

      const result = await StudentService.create(studentData);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create student',
        });
      }
      
      return result.data;
    }),

  // Update student
  update: branchAdminProcedure
    .input(updateStudentSchema)
    .mutation(async ({ input, ctx }) => {
      // First check if student exists and user has permission
      const existingStudent = await StudentService.getById(input.id);
      if (!existingStudent.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Student not found',
        });
      }

      // Check permissions
      if (ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'ADMIN') {
        if (existingStudent.data.branchId !== ctx.user.branchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update students in your branch',
          });
        }
      }

      const result = await StudentService.update(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update student',
        });
      }
      
      return result.data;
    }),

  // Delete student (soft delete)
  delete: branchAdminProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // First check if student exists and user has permission
      const existingStudent = await StudentService.getById(input.id);
      if (!existingStudent.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Student not found',
        });
      }

      // Check permissions
      if (ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'ADMIN') {
        if (existingStudent.data.branchId !== ctx.user.branchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only delete students in your branch',
          });
        }
      }

      const result = await StudentService.delete(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete student',
        });
      }
      
      return { success: true };
    }),

  // Get students by class
  getByClass: teacherProcedure
    .input(z.object({
      classId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await StudentService.getByClass(input.classId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch students',
        });
      }
      
      return result.data;
    }),
});