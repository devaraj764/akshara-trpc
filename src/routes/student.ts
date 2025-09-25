import { z } from 'zod';
import { router, protectedProcedure, teacherProcedure, TRPCError } from '../trpc.js';
import { StudentService } from '../services/studentService.js';

const createStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string(),
  address: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  emergencyContact: z.string().optional(),
  classId: z.number(),
  organizationId: z.number(),
});

const updateStudentSchema = z.object({
  id: z.number(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  emergencyContact: z.string().optional(),
  classId: z.number().optional(),
});

export const studentRouter = router({
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await StudentService.getById(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Student not found',
        });
      }
      
      return result.data;
    }),

  getAll: teacherProcedure
    .input(z.object({
      organizationId: z.number(),
      classId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const result = await StudentService.getAll(input.organizationId, input.classId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch students',
        });
      }
      
      return result.data;
    }),

  create: teacherProcedure
    .input(createStudentSchema)
    .mutation(async ({ input }) => {
      const result = await StudentService.create(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create student',
        });
      }
      
      return result.data;
    }),

  update: teacherProcedure
    .input(updateStudentSchema)
    .mutation(async ({ input }) => {
      const result = await StudentService.update(input.id, input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update student',
        });
      }
      
      return result.data;
    }),

  delete: teacherProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await StudentService.delete(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete student',
        });
      }
      
      return result.data;
    }),

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