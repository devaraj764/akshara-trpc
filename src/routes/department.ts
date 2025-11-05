import { z } from 'zod';
import { router, adminProcedure, branchAdminProcedure, protectedProcedure } from '../trpc.js';
import { TRPCError } from '@trpc/server';
import { DepartmentService } from '../services/departmentService.js';

// Validation schemas
const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(255),
  code: z.string().max(64).optional(),
  description: z.string().optional(),
  organizationId: z.number().positive().optional(),
  branchId: z.number().positive().optional(),
  isPrivate: z.boolean().optional(),
});

const updateDepartmentSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1).max(255).optional(),
  code: z.string().max(64).optional(),
  description: z.string().optional(),
  isPrivate: z.boolean().optional(),
});

const bulkCreateDepartmentSchema = z.object({
  departments: z.array(createDepartmentSchema).min(1, 'At least one department is required').max(50, 'Cannot create more than 50 departments at once'),
});

// Departments router - Only admins can manage departments
export const departmentRouter = router({
  // Get all departments - accessible by both admin and branch admin
  getAll: protectedProcedure
    .input(z.object({
      organizationId: z.number().positive().optional(),
      branchId: z.number().positive().optional(),
      includeStaffCount: z.boolean().default(false),
    }))
    .query(async ({ input, ctx }) => {
      // For non-super admins, restrict to their organization
      // For branch admins, also restrict to their branch if specified
      const organizationId = ctx.user.role === 'SUPER_ADMIN' ? input.organizationId : ctx.user.organizationId;
      const branchId = ctx.user.role === 'ADMIN' ? input.branchId : (input.branchId || ctx.user.branchId);
      
      const result = await DepartmentService.getAll({
        ...input,
        organizationId: organizationId || undefined,
        branchId: branchId || undefined
      });
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch departments',
        });
      }
      
      return result.data;
    }),

  // Get department by ID - accessible by both admin and branch admin
  getById: branchAdminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      const result = await DepartmentService.getById(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Department not found',
        });
      }

      // For non-super admins, ensure they can only access departments from their organization
      if (ctx.user.role !== 'SUPER_ADMIN' && result.data.organizationId !== ctx.user.organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to this department',
        });
      }

      // For branch admins, ensure they can only access departments from their branch
      if (ctx.user.role === 'BRANCH_ADMIN' && result.data.branchId !== ctx.user.branchId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to this department',
        });
      }
      
      return result.data;
    }),

  // Create department
  create: adminProcedure
    .input(createDepartmentSchema)
    .mutation(async ({ input, ctx }) => {
      // For non-super admins, ensure they create in their own organization
      if (ctx.user.role !== 'SUPER_ADMIN') {
        if (input.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Can only create departments in your assigned organization',
          });
        }
      }

      const result = await DepartmentService.create(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create department',
        });
      }
      
      return result.data;
    }),

  // Update department
  update: adminProcedure
    .input(updateDepartmentSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await DepartmentService.update(
        input.id, 
        input, 
        ctx.user.role, 
        ctx.user.organizationId
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update department',
        });
      }
      
      return result.data;
    }),

  // Delete department (soft delete)
  delete: adminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await DepartmentService.delete(
        input.id, 
        ctx.user.role, 
        ctx.user.organizationId
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete department',
        });
      }
      
      return result.data;
    }),

  // Restore department
  restore: adminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await DepartmentService.restore(input.id, ctx.user.organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to restore department',
        });
      }
      
      return result.data;
    }),

  // Get departments by organization
  getByOrganization: adminProcedure
    .input(z.object({
      organizationId: z.number().positive().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // For non-super admins, use their organization
      const organizationId = ctx.user.role === 'SUPER_ADMIN' ? input.organizationId : ctx.user.organizationId;
      
      if (!organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization ID is required',
        });
      }

      const result = await DepartmentService.getByOrganization(organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch departments',
        });
      }
      
      return result.data;
    }),

  // Get departments by branch - accessible by branch admins
  getByBranch: branchAdminProcedure
    .input(z.object({
      branchId: z.number().positive().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // For branch admins, restrict to their branch only
      const branchId = ctx.user.role === 'ADMIN' ? input.branchId : ctx.user.branchId;
      
      if (!branchId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Branch ID is required',
        });
      }
      const result = await DepartmentService.getByBranch(branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch departments',
        });
      }
      
      return result.data;
    }),

  // Bulk create departments
  bulkCreate: adminProcedure
    .input(bulkCreateDepartmentSchema)
    .mutation(async ({ input, ctx }) => {
      const results = [];
      const errors = [];

      // For non-super admins, ensure they create in their own organization
      if (ctx.user.role !== 'SUPER_ADMIN') {
        for (const dept of input.departments) {
          if (dept.organizationId !== ctx.user.organizationId) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Can only create departments in your assigned organization',
            });
          }
        }
      }

      // Create departments one by one and collect results
      for (let i = 0; i < input.departments.length; i++) {
        const dept = input.departments[i];
        try {
          const result = await DepartmentService.create(dept);
          
          if (result.success) {
            results.push({
              index: i,
              department: result.data,
              success: true,
            });
          } else {
            errors.push({
              index: i,
              department: dept,
              error: result.error || 'Failed to create department',
              success: false,
            });
          }
        } catch (error: any) {
          errors.push({
            index: i,
            department: dept,
            error: error.message || 'Unknown error occurred',
            success: false,
          });
        }
      }

      return {
        success: errors.length === 0,
        created: results.length,
        failed: errors.length,
        total: input.departments.length,
        results,
        errors,
      };
    }),

  // Get global departments (for org admin to select from)
  getGlobal: adminProcedure
    .query(async ({ ctx }) => {
      const result = await DepartmentService.getGlobal();
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch global departments',
        });
      }
      
      return result.data;
    }),

  // Get enabled departments for organization - accessible by branch admins
  getEnabledForOrganization: branchAdminProcedure
    .input(z.object({
      organizationId: z.number().positive().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      // Only SUPER_ADMIN can specify organizationId, others use their own
      let organizationId: number;
      
      if (ctx.user.role === 'SUPER_ADMIN' && input?.organizationId) {
        organizationId = input.organizationId;
      } else {
        if (!ctx.user.organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization ID is required',
          });
        }
        organizationId = ctx.user.organizationId;
      }

      const result = await DepartmentService.getEnabledForOrganization(organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch enabled departments',
        });
      }
      
      return result.data;
    }),

  // Get private departments for organization
  getPrivateForOrganization: adminProcedure
    .input(z.object({
      organizationId: z.number().positive().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // For non-super admins, use their organization
      const organizationId = ctx.user.role === 'SUPER_ADMIN' ? input.organizationId : ctx.user.organizationId;
      
      if (!organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization ID is required',
        });
      }

      const result = await DepartmentService.getPrivateForOrganization(organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch private departments',
        });
      }
      
      return result.data;
    }),

  // Check removal info - determines if department should be deleted or just removed from enabled list
  checkRemoval: adminProcedure
    .input(z.object({
      departmentId: z.number().int().positive(),
      organizationId: z.number().int().positive().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const result = await DepartmentService.checkRemoval(input.departmentId, organizationId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to check removal info'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to check removal info'
        });
      }
    }),

  // Remove or delete department based on ownership and usage
  removeOrDelete: adminProcedure
    .input(z.object({
      departmentId: z.number().int().positive(),
      organizationId: z.number().int().positive().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const result = await DepartmentService.removeOrDelete(input.departmentId, organizationId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to remove or delete department'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to remove or delete department'
        });
      }
    }),
});