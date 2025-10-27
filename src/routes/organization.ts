import { z } from 'zod';
import { router, protectedProcedure, adminProcedure, TRPCError } from '../trpc.js';
import { OrganizationService } from '../services/organizationService.js';

const organizationSetupSchema = z.object({
  academic_years: z.array(z.any()).optional(),
  subjects: z.array(z.any()).optional(),
  departments: z.array(z.any()).optional(),
  grades: z.array(z.any()).optional(),
  fee_types: z.array(z.any()).optional(),
  fee_items: z.array(z.any()).optional(),
});

const createOrganizationSchema = z.object({
  name: z.string().min(1),
  registrationNumber: z.string().optional(),
  address: z.object({
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    pincode: z.string().optional(),
    cityVillage: z.string().min(1),
    district: z.string().min(1),
    state: z.string().min(1),
    country: z.string().optional(),
  }).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  status: z.string().optional(),
  setup: organizationSetupSchema.optional(),
});

const updateOrganizationSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  registrationNumber: z.string().optional(),
  address: z.object({
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    pincode: z.string().optional(),
    cityVillage: z.string().min(1),
    district: z.string().min(1),
    state: z.string().min(1),
    country: z.string().optional(),
  }).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  status: z.string().optional(),
  setup: organizationSetupSchema.optional(),
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

  // Update enabled classes
  updateEnabledClasses: adminProcedure
    .input(z.object({
      id: z.number().positive(),
      classIds: z.array(z.number().positive()),
    }))
    .mutation(async ({ input }) => {
      const result = await OrganizationService.updateEnabledClasses(input.id, input.classIds);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update enabled grades',
        });
      }
      
      return result.data;
    }),

  // Add enabled class
  addEnabledClass: adminProcedure
    .input(z.object({
      id: z.number().positive(),
      classId: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const result = await OrganizationService.addEnabledClass(input.id, input.classId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to add enabled grade',
        });
      }
      
      return result.data;
    }),

  // Remove enabled class
  removeEnabledClass: adminProcedure
    .input(z.object({
      id: z.number().positive(),
      classId: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const result = await OrganizationService.removeEnabledClass(input.id, input.classId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to remove enabled grade',
        });
      }
      
      return result.data;
    }),
});