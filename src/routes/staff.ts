import { z } from 'zod';
import { router, branchAdminProcedure, adminProcedure } from '../trpc.js';
import { TRPCError } from '@trpc/server';
import { StaffService } from '../services/staffService.js';
import { StaffSalaryService } from '../services/staffSalaryService.js';
import { MonthlyPayslipService } from '../services/monthlyPayslipService.js';
import { addressSchema } from '../schemas/address.js';

// Validation schemas
const createStaffSchema = z.object({
  userId: z.number().positive().optional(),
  organizationId: z.number().positive(),
  branchId: z.number().positive(),
  employeeNumber: z.string().max(128).optional(),
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().max(255).optional(),
  phone: z.string().min(1, 'Phone number is required').max(32),
  email: z.string().email('Valid email is required').min(1, 'Email is required').max(255),
  address: addressSchema.optional(),
  dob: z.string().optional(),
  gender: z.string().max(32).optional(),
  position: z.string().max(255).optional(),
  hireDate: z.string().optional(),
  departmentId: z.number().positive().optional(),
  employeeType: z.enum(['STAFF', 'TEACHER']).default('STAFF'),
  meta: z.any().optional(), // For teacher qualifications and other custom data
  workingHours: z.any().optional(), // Staff working hours configuration
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
  address: addressSchema.optional(),
  dob: z.string().optional(),
  gender: z.string().max(32).optional(),
  position: z.string().max(255).optional(),
  hireDate: z.string().optional(),
  departmentId: z.number().positive().optional(),
  employeeType: z.enum(['STAFF', 'TEACHER']).optional(),
  isActive: z.boolean().optional(),
  meta: z.any().optional(),
  workingHours: z.any().optional(), // Staff working hours configuration
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
        if (input.organizationId && input.organizationId !== ctx.user.organizationId) {
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
        organizationId: input.organizationId || ctx.user.organizationId!,
        branchId: ctx.user.branchId || input.branchId,
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

  // Staff Salary Management Procedures
  // Get all staff salaries
  getAllSalaries: branchAdminProcedure
    .input(z.object({
      branchId: z.number().positive().optional(),
      employeeId: z.number().positive().optional(),
      employeeType: z.enum(['STAFF', 'TEACHER']).optional(),
      isCurrent: z.boolean().optional(),
      includeStaffInfo: z.boolean().default(true),
    }))
    .query(async ({ input, ctx }) => {
      // For branch admins, restrict to their branch only
      const branchId = ctx.user.role === 'ADMIN' ? input.branchId : ctx.user.branchId;

      const result = await StaffSalaryService.getAll({
        ...input,
        branchId: branchId || undefined,
        organizationId: ctx.user.organizationId || undefined
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch staff salaries',
        });
      }

      return result.data;
    }),

  // Get salary by ID
  getSalaryById: branchAdminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      // Pass user's branch ID for branch admin restrictions
      const userBranchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;

      const result = await StaffSalaryService.getById(input.id, userBranchId);

      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Staff salary not found',
        });
      }

      return result.data;
    }),

  // Get current salary for an employee
  getCurrentSalary: branchAdminProcedure
    .input(z.object({
      employeeId: z.number().positive(),
      employeeType: z.enum(['STAFF', 'TEACHER']),
    }))
    .query(async ({ input, ctx }) => {
      // Pass user's branch ID for branch admin restrictions
      const userBranchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;

      const result = await StaffSalaryService.getCurrentSalaryForEmployee(
        input.employeeId,
        input.employeeType,
        userBranchId
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'No current salary found',
        });
      }

      return result.data;
    }),

  // Create staff salary (ADMIN only)
  createSalary: adminProcedure
    .input(z.object({
      staffId: z.number().positive(),
      basicSalary: z.number().positive('Basic salary must be positive'),
      allowances: z.object({
        hra: z.number().min(0).optional(),
        transport: z.number().min(0).optional(),
        medical: z.number().min(0).optional(),
        special: z.number().min(0).optional(),
        other: z.record(z.string(), z.number().min(0)).optional(),
      }).default({}),
      deductions: z.object({
        pf: z.number().min(0).optional(),
        esi: z.number().min(0).optional(),
        tax: z.number().min(0).optional(),
        advance: z.number().min(0).optional(),
        other: z.record(z.string(), z.number().min(0)).optional(),
      }).default({}),
      effectiveFrom: z.string().min(1, 'Effective from date is required'),
      effectiveTo: z.string().optional(),
      isCurrent: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      // Only ADMIN and SUPER_ADMIN can create salaries
      const organizationId = ctx.user.organizationId!;
      
      if (!organizationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Organization information required',
        });
      }

      const result = await StaffSalaryService.create({
        staffId: input.staffId,
        organizationId,
        branchId: 0, // Will be set from staff record
        basicSalary: input.basicSalary,
        allowances: input.allowances,
        deductions: input.deductions,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
        isCurrent: input.isCurrent,
        createdBy: ctx.user.id,
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create staff salary',
        });
      }

      return result.data;
    }),

  // Update staff salary (ADMIN only)
  updateSalary: adminProcedure
    .input(z.object({
      id: z.number().positive(),
      basicSalary: z.number().positive().optional(),
      allowances: z.object({
        hra: z.number().min(0).optional(),
        transport: z.number().min(0).optional(),
        medical: z.number().min(0).optional(),
        special: z.number().min(0).optional(),
        other: z.record(z.string(), z.number().min(0)).optional(),
      }).optional(),
      deductions: z.object({
        pf: z.number().min(0).optional(),
        esi: z.number().min(0).optional(),
        tax: z.number().min(0).optional(),
        advance: z.number().min(0).optional(),
        other: z.record(z.string(), z.number().min(0)).optional(),
      }).optional(),
      effectiveFrom: z.string().optional(),
      effectiveTo: z.string().optional(),
      isCurrent: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Admin has full access to update salaries
      const { id, ...updateData } = input;

      const result = await StaffSalaryService.update(id, updateData, undefined);

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update staff salary',
        });
      }

      return result.data;
    }),

  // Delete staff salary (ADMIN only)
  deleteSalary: adminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Admin has full access to delete salaries
      const result = await StaffSalaryService.delete(input.id, undefined);

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete staff salary',
        });
      }

      return result.data;
    }),

  // Get salary history for an employee
  getSalaryHistory: branchAdminProcedure
    .input(z.object({
      employeeId: z.number().positive(),
      employeeType: z.enum(['STAFF', 'TEACHER']),
    }))
    .query(async ({ input, ctx }) => {
      // Pass user's branch ID for branch admin restrictions
      const userBranchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;

      const result = await StaffSalaryService.getSalaryHistory(
        input.employeeId,
        input.employeeType,
        userBranchId
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch salary history',
        });
      }

      return result.data;
    }),

  // Connect or create user account for staff member
  connectOrCreateAccount: branchAdminProcedure
    .input(z.object({
      staffId: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const result = await StaffService.connectOrCreateUserAccount({
        staffId: input.staffId
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to connect or create user account',
        });
      }

      return result.data;
    }),

  // Check if staff exists with email or phone
  checkExistingStaff: branchAdminProcedure
    .input(z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      excludeStaffId: z.number().positive().optional(), // Exclude current staff when editing
    }))
    .query(async ({ input, ctx }) => {
      // For branch admins, restrict to their branch only
      const branchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;

      const result = await StaffService.checkExistingStaff({
        email: input.email,
        phone: input.phone,
        excludeStaffId: input.excludeStaffId,
        organizationId: ctx.user.organizationId || undefined,
        branchId
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to check existing staff',
        });
      }

      return result.data;
    }),

  // Monthly Payslips Management Procedures
  // Get all monthly payslips
  getAllPayslips: branchAdminProcedure
    .input(z.object({
      branchId: z.number().positive().optional(),
      employeeId: z.number().positive().optional(),
      employeeType: z.enum(['STAFF', 'TEACHER']).optional(),
      month: z.number().min(1).max(12).optional(),
      year: z.number().min(2020).max(2030).optional(),
      status: z.number().min(0).max(3).optional(), // 0=unpaid, 1=paid, 2=processing, 3=overdue
      includeStaffInfo: z.boolean().default(true),
    }))
    .query(async ({ input, ctx }) => {
      // For branch admins, restrict to their branch only
      const branchId = ctx.user.role === 'ADMIN' ? input.branchId : ctx.user.branchId;

      const result = await MonthlyPayslipService.getAll({
        ...input,
        branchId: branchId || undefined,
        organizationId: ctx.user.organizationId!,        
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch monthly payslips',
        });
      }

      return result.data;
    }),

  // Get monthly payslips for organization (for salary management page)
  getMonthlyPayslipsForOrganization: branchAdminProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number().min(2020).max(2030),
      includeStaffInfo: z.boolean().default(true),
    }))
    .query(async ({ input, ctx }) => {
      // Get organization and branch restrictions
      const organizationId = ctx.user.organizationId;
      const branchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;

      if (!organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization information required',
        });
      }

      const options: any = {
        organizationId,
        month: input.month,
        year: input.year,
        includeStaffInfo: input.includeStaffInfo
      };
      
      if (branchId) {
        options.branchId = branchId;
      }

      const result = await MonthlyPayslipService.getAll(options);

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch monthly payslips',
        });
      }

      return result.data;
    }),

  // Get staff member's payslips for academic year
  getStaffPayslipsForAcademicYear: branchAdminProcedure
    .input(z.object({
      employeeId: z.number().positive(),
      employeeType: z.enum(['STAFF', 'TEACHER']),
      academicYearId: z.number().positive().optional(), // If not provided, use current academic year
    }))
    .query(async ({ input, ctx }) => {
      // Pass user's branch ID for branch admin restrictions
      const userBranchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;

      // TODO: Get academic year dates and filter payslips by that range
      // For now, get all payslips for the employee
      const options: any = {
        employeeId: input.employeeId,
        employeeType: input.employeeType,
        includeStaffInfo: true
      };
      
      if (userBranchId) {
        options.branchId = userBranchId;
      }
      
      const result = await MonthlyPayslipService.getAll(options);

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch staff payslips',
        });
      }

      return result.data;
    }),

  // Get payslip by ID
  getPayslipById: branchAdminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      // Pass user's branch ID for branch admin restrictions
      const userBranchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;

      const result = await MonthlyPayslipService.getById(input.id, userBranchId);

      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Monthly payslip not found',
        });
      }

      return result.data;
    }),

  // Generate monthly payslips for organization
  generateMonthlyPayslips: branchAdminProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number().min(2020).max(2030),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get organization information from user - payslips generation is organization-level
      const organizationId = ctx.user.organizationId;
      
      if (!organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization information required',
        });
      }

      const result = await MonthlyPayslipService.generateMonthlyPayslips(
        organizationId,
        input.month,
        input.year,
        ctx.user.id
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to generate monthly payslips',
        });
      }

      return result.data;
    }),

  // Update payslip status
  updatePayslipStatus: branchAdminProcedure
    .input(z.object({
      id: z.number().positive(),
      status: z.number().min(0).max(3), // 0=unpaid, 1=paid, 2=processing, 3=overdue
      paymentDate: z.string().optional(),
      paymentMethod: z.string().optional(),
      paymentReference: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Pass user's branch ID for branch admin restrictions
      const userBranchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;

      const { id, ...updateData } = input;

      // If marking as paid, set payment date to now if not provided
      if (input.status === 1 && !input.paymentDate) {
        updateData.paymentDate = new Date().toISOString();
      }

      const result = await MonthlyPayslipService.update(id, {
        ...updateData,
        paidBy: input.status === 1 ? ctx.user.id : undefined
      }, userBranchId);

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update payslip status',
        });
      }

      return result.data;
    }),

  // Bulk update payslip status
  updateBulkPayslipStatus: branchAdminProcedure
    .input(z.object({
      ids: z.array(z.number().positive()).min(1, 'At least one payslip ID is required'),
      status: z.number().min(0).max(3), // 0=unpaid, 1=paid, 2=processing, 3=overdue
    }))
    .mutation(async ({ input, ctx }) => {
      // Pass user's branch ID for branch admin restrictions
      const userBranchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;

      const result = await MonthlyPayslipService.updateBulkStatus(
        input.ids,
        input.status,
        userBranchId
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update payslip status',
        });
      }

      return result.data;
    }),

  // Delete payslip
  deletePayslip: branchAdminProcedure
    .input(z.object({
      id: z.number().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Pass user's branch ID for branch admin restrictions
      const userBranchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;

      const result = await MonthlyPayslipService.delete(input.id, userBranchId);

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete payslip',
        });
      }

      return result.data;
    }),

  // Get staff eligible for payslip generation (staff with user accounts and current salaries)
  getEligibleForPayslips: branchAdminProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number().positive(),
    }))
    .query(async ({ input, ctx }) => {
      // Pass user's branch ID for branch admin restrictions
      const userBranchId = ctx.user.role === 'ADMIN' ? undefined : ctx.user.branchId;

      const result = await StaffService.getEligibleForPayslips(
        input.month,
        input.year,
        userBranchId
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to get eligible staff',
        });
      }

      return result.data;
    }),
});