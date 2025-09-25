import { z } from 'zod';
import { router, branchAdminProcedure, adminProcedure } from '../trpc.js';
import { TRPCError } from '@trpc/server';
import { StaffService } from '../services/staffService.js';

// Validation schemas
const createStaffSchema = z.object({
  userId: z.number().positive().optional(),
  organizationId: z.number().positive(),
  branchId: z.number().positive().optional(),
  employeeNumber: z.string().max(128).optional(),
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().max(255).optional(),
  phone: z.string().max(32).optional(),
  email: z.string().email().max(255).optional(),
  address: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().max(32).optional(),
  position: z.string().max(255).optional(),
  emergencyContact: z.any().optional(),
  hireDate: z.string().optional(),
  departmentId: z.number().positive().optional(),
  employeeType: z.enum(['STAFF', 'TEACHER']).default('STAFF'),
  meta: z.any().optional(), // For teacher qualifications and other custom data
  // Fields for automatic user creation
  createUser: z.boolean().optional(),
  userEmail: z.string().email().optional(),
  userDisplayName: z.string().optional(),
  userPhone: z.string().optional(),
});

const updateStaffSchema = z.object({
  id: z.number().positive(),
  employeeNumber: z.string().max(128).optional(),
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().max(255).optional(),
  phone: z.string().max(32).optional(),
  email: z.string().email().max(255).optional(),
  address: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().max(32).optional(),
  position: z.string().max(255).optional(),
  emergencyContact: z.any().optional(),
  hireDate: z.string().optional(),
  departmentId: z.number().positive().optional(),
  employeeType: z.enum(['STAFF', 'TEACHER']).optional(),
  isActive: z.boolean().optional(),
  meta: z.any().optional(),
});

const updateTeacherQualificationsSchema = z.object({
  id: z.number().positive(),
  qualifications: z.object({
    degrees: z.array(z.object({
      degree: z.string(),
      field: z.string(),
      institution: z.string(),
      year: z.number().optional(),
      grade: z.string().optional(),
    })).optional(),
    certifications: z.array(z.object({
      name: z.string(),
      issuedBy: z.string(),
      year: z.number().optional(),
      expiryYear: z.number().optional(),
    })).optional(),
    experience: z.object({
      totalYears: z.number().optional(),
      previousInstitutions: z.array(z.object({
        name: z.string(),
        position: z.string(),
        duration: z.string(),
        subjects: z.array(z.string()).optional(),
      })).optional(),
    }).optional(),
    specializations: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
  }),
});

// Staff router - Both admins and branch admins can manage staff
export const staffRouter = router({
  // Get all staff - accessible by both admin and branch admin
  getAll: branchAdminProcedure
    .input(z.object({
      branchId: z.number().positive().optional(),
      departmentId: z.number().positive().optional(),
      employeeType: z.string().optional(),
      isActive: z.boolean().optional(),
      includeDepartmentInfo: z.boolean().default(false),
      includeUserInfo: z.boolean().default(false),
    }))
    .query(async ({ input, ctx }) => {
      // For branch admins, restrict to their branch only
      const branchId = ctx.user.role === 'ADMIN' ? input.branchId : ctx.user.branchId;
      
      const result = await StaffService.getAll({
        ...input,
        branchId: branchId || undefined,
        organizationId: ctx.user.organizationId || undefined
      });
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch staff',
        });
      }
      
      return result.data;
    }),

  // Get staff by ID
  getById: branchAdminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      // Pass user's branch ID for branch admin restrictions
      const userBranchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;
      
      const result = await StaffService.getById(input.id, userBranchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Staff member not found',
        });
      }
      
      return result.data;
    }),

  // Create staff member - branch admins can create in their organization, admins can create anywhere
  create: branchAdminProcedure
    .input(createStaffSchema)
    .mutation(async ({ input, ctx }) => {
      // For branch admins, ensure they create in their own organization and branch
      if (ctx.user.role !== 'ADMIN') {
        if (input.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Can only create staff in your assigned organization',
          });
        }
        // Only validate branchId if both user and input have branchId
        if (ctx.user.branchId && input.branchId && input.branchId !== ctx.user.branchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Can only create staff in your assigned branch',
          });
        }
      }

      const result = await StaffService.create({
        ...input,
        createdByUserId: ctx.user.id, // Add context of who created this staff
      });
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create staff member',
        });
      }
      
      return result.data;
    }),

  // Update staff member
  update: branchAdminProcedure
    .input(updateStaffSchema)
    .mutation(async ({ input, ctx }) => {
      // Pass user's branch ID for branch admin restrictions
      const userBranchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;
      
      const result = await StaffService.update(input.id, input, userBranchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update staff member',
        });
      }
      
      return result.data;
    }),

  // Delete staff member (soft delete)
  delete: branchAdminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Pass user's branch ID for branch admin restrictions
      const userBranchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;
      
      const result = await StaffService.delete(input.id, userBranchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete staff member',
        });
      }
      
      return result.data;
    }),

  // Restore staff member
  restore: adminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const result = await StaffService.restore(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to restore staff member',
        });
      }
      
      return result.data;
    }),

  // Get staff by branch
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

      const result = await StaffService.getByBranch(branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch staff',
        });
      }
      
      return result.data;
    }),

  // Get staff by department
  getByDepartment: branchAdminProcedure
    .input(z.object({
      departmentId: z.number().positive(),
    }))
    .query(async ({ input }) => {
      const result = await StaffService.getByDepartment(input.departmentId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch staff',
        });
      }
      
      return result.data;
    }),

  // Get teachers
  getTeachers: branchAdminProcedure
    .input(z.object({
      branchId: z.number().positive().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // For branch admins, use their branch
      const branchId = ctx.user.role === 'ADMIN' ? input.branchId : ctx.user.branchId;

      const result = await StaffService.getTeachers(branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch teachers',
        });
      }
      
      return result.data;
    }),

  // Update teacher qualifications
  updateTeacherQualifications: branchAdminProcedure
    .input(updateTeacherQualificationsSchema)
    .mutation(async ({ input, ctx }) => {
      // Pass user's branch ID for branch admin restrictions
      const userBranchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;
      
      const result = await StaffService.updateTeacherQualifications(
        input.id, 
        input.qualifications, 
        userBranchId
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update teacher qualifications',
        });
      }
      
      return result.data;
    }),
});