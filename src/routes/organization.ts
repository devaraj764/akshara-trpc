import { z } from 'zod';
import { router, protectedProcedure, adminProcedure, TRPCError } from '../trpc.js';
import { OrganizationService } from '../services/organizationService.js';

const createOrganizationSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
});

const updateOrganizationSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  type: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
});

export const organizationRouter = router({
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await OrganizationService.getById(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Organization not found',
        });
      }
      
      return result.data;
    }),

  getAll: adminProcedure
    .query(async () => {
      const result = await OrganizationService.getAll();
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch organizations',
        });
      }
      
      return result.data;
    }),

  create: adminProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ input }) => {
      const result = await OrganizationService.create(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create organization',
        });
      }
      
      return result.data;
    }),

  update: adminProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ input }) => {
      const result = await OrganizationService.update(input.id, input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update organization',
        });
      }
      
      return result.data;
    }),

  delete: adminProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await OrganizationService.delete(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete organization',
        });
      }
      
      return result.data;
    }),

  getStats: adminProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await OrganizationService.getStats(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch organization stats',
        });
      }
      
      return result.data;
    }),

  // Update enabled departments
  updateEnabledDepartments: adminProcedure
    .input(z.object({
      id: z.number().positive(),
      departmentIds: z.array(z.number().positive()),
    }))
    .mutation(async ({ input }) => {
      const result = await OrganizationService.updateEnabledDepartments(input.id, input.departmentIds);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update enabled departments',
        });
      }
      
      return result.data;
    }),

  // Update enabled subjects
  updateEnabledSubjects: adminProcedure
    .input(z.object({
      id: z.number().positive(),
      subjectIds: z.array(z.number().positive()),
    }))
    .mutation(async ({ input }) => {
      const result = await OrganizationService.updateEnabledSubjects(input.id, input.subjectIds);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update enabled subjects',
        });
      }
      
      return result.data;
    }),

  // Add enabled department
  addEnabledDepartment: adminProcedure
    .input(z.object({
      id: z.number().positive(),
      departmentId: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const result = await OrganizationService.addEnabledDepartment(input.id, input.departmentId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to add enabled department',
        });
      }
      
      return result.data;
    }),

  // Remove enabled department
  removeEnabledDepartment: adminProcedure
    .input(z.object({
      id: z.number().positive(),
      departmentId: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const result = await OrganizationService.removeEnabledDepartment(input.id, input.departmentId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to remove enabled department',
        });
      }
      
      return result.data;
    }),

  // Add enabled subject
  addEnabledSubject: adminProcedure
    .input(z.object({
      id: z.number().positive(),
      subjectId: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const result = await OrganizationService.addEnabledSubject(input.id, input.subjectId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to add enabled subject',
        });
      }
      
      return result.data;
    }),

  // Remove enabled subject
  removeEnabledSubject: adminProcedure
    .input(z.object({
      id: z.number().positive(),
      subjectId: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const result = await OrganizationService.removeEnabledSubject(input.id, input.subjectId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to remove enabled subject',
        });
      }
      
      return result.data;
    }),

  // Update enabled grades
  updateEnabledGrades: adminProcedure
    .input(z.object({
      id: z.number().positive(),
      gradeIds: z.array(z.number().positive()),
    }))
    .mutation(async ({ input }) => {
      const result = await OrganizationService.updateEnabledGrades(input.id, input.gradeIds);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update enabled grades',
        });
      }
      
      return result.data;
    }),

  // Add enabled grade
  addEnabledGrade: adminProcedure
    .input(z.object({
      id: z.number().positive(),
      gradeId: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const result = await OrganizationService.addEnabledGrade(input.id, input.gradeId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to add enabled grade',
        });
      }
      
      return result.data;
    }),

  // Remove enabled grade
  removeEnabledGrade: adminProcedure
    .input(z.object({
      id: z.number().positive(),
      gradeId: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const result = await OrganizationService.removeEnabledGrade(input.id, input.gradeId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to remove enabled grade',
        });
      }
      
      return result.data;
    }),
});