import { z } from 'zod';
import { router, protectedProcedure, teacherProcedure, TRPCError } from '../trpc.js';
import { TeacherService } from '../services/teacherService.js';

const createTeacherSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfBirth: z.string(),
  address: z.string().optional(),
  subject: z.string().optional(),
  qualification: z.string().optional(),
  experience: z.number().optional(),
  salary: z.number().optional(),
  organizationId: z.number(),
});

const updateTeacherSchema = z.object({
  id: z.number(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  subject: z.string().optional(),
  qualification: z.string().optional(),
  experience: z.number().optional(),
  salary: z.number().optional(),
});

export const teacherRouter = router({
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await TeacherService.getById(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Teacher not found',
        });
      }
      
      return result.data;
    }),

  getAll: teacherProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await TeacherService.getAll(input.organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch teachers',
        });
      }
      
      return result.data;
    }),

  getByBranch: protectedProcedure
    .input(z.object({
      branchId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await TeacherService.getByBranch(input.branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch teachers',
        });
      }
      
      return result.data;
    }),

  create: teacherProcedure
    .input(createTeacherSchema)
    .mutation(async ({ input }) => {
      const result = await TeacherService.create(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create teacher',
        });
      }
      
      return result.data;
    }),

  update: teacherProcedure
    .input(updateTeacherSchema)
    .mutation(async ({ input }) => {
      const result = await TeacherService.update(input.id, input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update teacher',
        });
      }
      
      return result.data;
    }),

  delete: teacherProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await TeacherService.delete(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete teacher',
        });
      }
      
      return result.data;
    }),

  getBySubject: teacherProcedure
    .input(z.object({
      subject: z.string(),
      organizationId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await TeacherService.getBySubject(input.subject, input.organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch teachers',
        });
      }
      
      return result.data;
    }),
});