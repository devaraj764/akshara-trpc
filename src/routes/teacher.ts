import { z } from 'zod';
import { router, branchAdminProcedure, adminProcedure } from '../trpc.js';
import { TRPCError } from '@trpc/server';
import { StaffService } from '../services/staffService.js';

// Teacher router - essentially wraps staff functionality for teacher employee type
export const teacherRouter = router({
  // Get all teachers for a branch or organization
  getAll: branchAdminProcedure
    .input(z.object({
      branchId: z.number().positive().optional(),
      includeDeleted: z.boolean().default(false)
    }))
    .query(async ({ input, ctx }) => {
      try {
        const userBranchId = ctx.user.role === 'ADMIN' ? input.branchId : ctx.user.branchId;
        
        if (!userBranchId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Branch ID is required'
          });
        }

        const result = await StaffService.getAllStaff(
          ctx.user.organizationId,
          userBranchId,
          input.includeDeleted
        );

        if (!result.success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: result.error || 'Failed to fetch teachers'
          });
        }

        // Filter only teachers
        const teachers = result.data?.filter(staff => staff.employeeType === 'TEACHER') || [];
        
        return teachers;
      } catch (error) {
        console.error('Error fetching teachers:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch teachers'
        });
      }
    }),

  // Get teacher by ID
  getById: branchAdminProcedure
    .input(z.object({
      id: z.number().positive()
    }))
    .query(async ({ input, ctx }) => {
      try {
        const result = await StaffService.getStaffById(input.id, ctx.user.branchId);
        
        if (!result.success) {
          throw new TRPCError({
            code: result.error?.includes('not found') ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR',
            message: result.error || 'Failed to fetch teacher'
          });
        }

        // Ensure it's a teacher
        if (result.data?.employeeType !== 'TEACHER') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Teacher not found'
          });
        }

        return result.data;
      } catch (error) {
        console.error('Error fetching teacher:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch teacher'
        });
      }
    }),

  // Create teacher (using staff service with TEACHER employee type)
  create: branchAdminProcedure
    .input(z.object({
      userId: z.number().positive().optional(),
      organizationId: z.number().positive(),
      branchId: z.number().positive(),
      employeeNumber: z.string().max(128).optional(),
      firstName: z.string().min(1, 'First name is required').max(255),
      lastName: z.string().max(255).optional(),
      phone: z.string().min(1, 'Phone number is required').max(32),
      email: z.string().email('Valid email is required').min(1, 'Email is required').max(255),
      dob: z.string().optional(),
      gender: z.string().max(32).optional(),
      position: z.string().max(255).optional(),
      hireDate: z.string().optional(),
      departmentId: z.number().positive().optional(),
      meta: z.any().optional(), // For teacher qualifications
      createUser: z.boolean().optional(),
      userEmail: z.string().email().optional(),
      userDisplayName: z.string().optional(),
      userPhone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Force employee type to TEACHER
        const teacherData = {
          ...input,
          employeeType: 'TEACHER' as const
        };

        const result = await StaffService.createStaff(teacherData, ctx.user.branchId);
        
        if (!result.success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: result.error || 'Failed to create teacher'
          });
        }

        return result.data;
      } catch (error) {
        console.error('Error creating teacher:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create teacher'
        });
      }
    })
});