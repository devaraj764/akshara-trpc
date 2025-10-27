import { z } from 'zod';
import { router, protectedProcedure, branchAdminProcedure, adminProcedure, teacherProcedure, TRPCError } from '../trpc.js';
import { StudentService } from '../services/studentService.js';
import { eq } from 'drizzle-orm';
import db from '../db/index.js';
import { students } from '../db/schema.js';

const addressSchema = z.object({
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  pincode: z.string().optional(),
  cityVillage: z.string().min(1, 'City/Village is required'),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().optional(),
});

const createStudentSchema = z.object({
  organizationId: z.number(),
  branchId: z.number(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  admissionNumber: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: addressSchema.optional(),
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
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: addressSchema.optional(),
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
      academicYearId: z.number().optional(),
      enrollmentStatus: z.enum(['enrolled', 'unenrolled']).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      // For non-admin users, use their organization/branch context
      const filters = {
        organizationId: ctx.user.role === 'SUPER_ADMIN' ? input?.organizationId : ctx.user.organizationId,
        branchId: ctx.user.role === 'ADMIN' || ctx.user.role === 'SUPER_ADMIN' ? input?.branchId : ctx.user.branchId,
        search: input?.search,
        isActive: input?.isActive,
        academicYearId: input?.academicYearId,
        enrollmentStatus: input?.enrollmentStatus,
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

  // Restore student
  restore: branchAdminProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check permissions by getting student data first
      const studentData = await db.select({
        id: students.id,
        organizationId: students.organizationId,
        branchId: students.branchId,
        isDeleted: students.isDeleted
      })
      .from(students)
      .where(eq(students.id, input.id))
      .limit(1);

      if (studentData.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Student not found',
        });
      }

      const student = studentData[0];

      // Check permissions
      if (ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'ADMIN') {
        if (student.branchId !== ctx.user.branchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only restore students in your branch',
          });
        }
      }

      if (!student.isDeleted) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Student is not deleted',
        });
      }

      const result = await StudentService.restore(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to restore student',
        });
      }
      
      return result.data;
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

  // Get student count by section
  getCountBySection: protectedProcedure
    .input(z.object({
      sectionId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await StudentService.getCountBySection(input.sectionId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch student count',
        });
      }
      
      return result.data;
    }),

  // Reassign roll numbers
  reassignRollNumbers: branchAdminProcedure
    .input(z.object({
      sectionId: z.number(),
      genderOrder: z.enum(['girls_first', 'boys_first', 'mixed']),
      sortOrder: z.enum(['alphabetical', 'date_of_admission']),
    }))
    .mutation(async ({ input }) => {
      const result = await StudentService.reassignRollNumbers(
        input.sectionId,
        input.genderOrder,
        input.sortOrder
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to reassign roll numbers',
        });
      }
      
      return result.data;
    }),
});