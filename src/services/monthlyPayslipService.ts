import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import db from '../db/index.js';
import {
  monthlyPayslips,
  staffSalaries,
  staff,
  organizations,
  branches,
  users
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreateMonthlyPayslipData {
  organizationId: number;
  branchId: number;
  employeeType: 'STAFF' | 'TEACHER';
  employeeId: number;
  staffSalaryId: number;
  month: number;
  year: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  basicSalary: number;
  allowances: any;
  deductions: any;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  workingDays: number;
  presentDays: number;
  leaveDays?: number;
  absentDays?: number;
  overtimeHours?: number;
  overtimeRate?: number;
  overtimeAmount?: number;
  bonus?: number;
  advanceDeduction?: number;
  notes?: string;
  generatedBy: number;
  status?: number; // 0=unpaid (default), 1=paid, 2=processing, 3=overdue
}

export interface UpdateMonthlyPayslipData {
  paymentStatus?: string;
  paymentDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  approvedBy?: number;
  paidBy?: number;
  notes?: string;
  status?: number;
}

export interface GetMonthlyPayslipOptions {
  organizationId?: number;
  branchId?: number;
  employeeId?: number;
  employeeType?: 'STAFF' | 'TEACHER';
  month?: number;
  year?: number;
  status?: number;
  includeStaffInfo?: boolean;
}

export class MonthlyPayslipService {
  static async getAll(options: GetMonthlyPayslipOptions = {}): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [];

      if (options.organizationId) {
        whereConditions.push(eq(monthlyPayslips.organizationId, options.organizationId));
      }

      if (options.branchId) {
        whereConditions.push(eq(monthlyPayslips.branchId, options.branchId));
      }

      if (options.employeeId) {
        whereConditions.push(eq(monthlyPayslips.employeeId, options.employeeId));
      }

      if (options.employeeType) {
        whereConditions.push(eq(monthlyPayslips.employeeType, options.employeeType));
      }

      if (options.month) {
        whereConditions.push(eq(monthlyPayslips.month, options.month));
      }

      if (options.year) {
        whereConditions.push(eq(monthlyPayslips.year, options.year));
      }

      if (options.status !== undefined) {
        whereConditions.push(eq(monthlyPayslips.status, options.status));
      }

      const result = await db.select({
        id: monthlyPayslips.id,
        organizationId: monthlyPayslips.organizationId,
        branchId: monthlyPayslips.branchId,
        employeeType: monthlyPayslips.employeeType,
        employeeId: monthlyPayslips.employeeId,
        staffSalaryId: monthlyPayslips.staffSalaryId,
        month: monthlyPayslips.month,
        year: monthlyPayslips.year,
        payPeriodStart: monthlyPayslips.payPeriodStart,
        payPeriodEnd: monthlyPayslips.payPeriodEnd,
        basicSalary: monthlyPayslips.basicSalary,
        allowances: monthlyPayslips.allowances,
        deductions: monthlyPayslips.deductions,
        grossSalary: monthlyPayslips.grossSalary,
        totalDeductions: monthlyPayslips.totalDeductions,
        netSalary: monthlyPayslips.netSalary,
        paymentStatus: monthlyPayslips.paymentStatus,
        paymentDate: monthlyPayslips.paymentDate,
        paymentMethod: monthlyPayslips.paymentMethod,
        paymentReference: monthlyPayslips.paymentReference,
        workingDays: monthlyPayslips.workingDays,
        presentDays: monthlyPayslips.presentDays,
        leaveDays: monthlyPayslips.leaveDays,
        absentDays: monthlyPayslips.absentDays,
        overtimeHours: monthlyPayslips.overtimeHours,
        overtimeRate: monthlyPayslips.overtimeRate,
        overtimeAmount: monthlyPayslips.overtimeAmount,
        bonus: monthlyPayslips.bonus,
        advanceDeduction: monthlyPayslips.advanceDeduction,
        notes: monthlyPayslips.notes,
        generatedBy: monthlyPayslips.generatedBy,
        approvedBy: monthlyPayslips.approvedBy,
        paidBy: monthlyPayslips.paidBy,
        createdAt: monthlyPayslips.createdAt,
        updatedAt: monthlyPayslips.updatedAt,
        status: monthlyPayslips.status,
        // Include organization info
        organizationName: organizations.name,
        // Include branch info
        branchName: branches.name,
        // Include staff info if requested
        ...(options.includeStaffInfo ? {
          staffFirstName: staff.firstName,
          staffLastName: staff.lastName,
          staffEmail: staff.email,
          staffEmployeeNumber: staff.employeeNumber,
          staffPosition: staff.position,
        } : {}),
      })
        .from(monthlyPayslips)
        .leftJoin(organizations, eq(monthlyPayslips.organizationId, organizations.id))
        .leftJoin(branches, eq(monthlyPayslips.branchId, branches.id))
        .leftJoin(staff, eq(monthlyPayslips.employeeId, staff.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(monthlyPayslips.year), desc(monthlyPayslips.month), asc(staff.firstName));

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch monthly payslips'
      };
    }
  }

  static async getById(id: number, userBranchId?: number): Promise<ServiceResponse<any>> {
    try {
      const whereConditions = [eq(monthlyPayslips.id, id)];

      // For branch admins, restrict to their branch
      if (userBranchId) {
        whereConditions.push(eq(monthlyPayslips.branchId, userBranchId));
      }

      const result = await db.select({
        id: monthlyPayslips.id,
        organizationId: monthlyPayslips.organizationId,
        branchId: monthlyPayslips.branchId,
        employeeType: monthlyPayslips.employeeType,
        employeeId: monthlyPayslips.employeeId,
        staffSalaryId: monthlyPayslips.staffSalaryId,
        month: monthlyPayslips.month,
        year: monthlyPayslips.year,
        payPeriodStart: monthlyPayslips.payPeriodStart,
        payPeriodEnd: monthlyPayslips.payPeriodEnd,
        basicSalary: monthlyPayslips.basicSalary,
        allowances: monthlyPayslips.allowances,
        deductions: monthlyPayslips.deductions,
        grossSalary: monthlyPayslips.grossSalary,
        totalDeductions: monthlyPayslips.totalDeductions,
        netSalary: monthlyPayslips.netSalary,
        paymentStatus: monthlyPayslips.paymentStatus,
        paymentDate: monthlyPayslips.paymentDate,
        paymentMethod: monthlyPayslips.paymentMethod,
        paymentReference: monthlyPayslips.paymentReference,
        workingDays: monthlyPayslips.workingDays,
        presentDays: monthlyPayslips.presentDays,
        leaveDays: monthlyPayslips.leaveDays,
        absentDays: monthlyPayslips.absentDays,
        overtimeHours: monthlyPayslips.overtimeHours,
        overtimeRate: monthlyPayslips.overtimeRate,
        overtimeAmount: monthlyPayslips.overtimeAmount,
        bonus: monthlyPayslips.bonus,
        advanceDeduction: monthlyPayslips.advanceDeduction,
        notes: monthlyPayslips.notes,
        generatedBy: monthlyPayslips.generatedBy,
        approvedBy: monthlyPayslips.approvedBy,
        paidBy: monthlyPayslips.paidBy,
        createdAt: monthlyPayslips.createdAt,
        updatedAt: monthlyPayslips.updatedAt,
        status: monthlyPayslips.status,
        organizationName: organizations.name,
        branchName: branches.name,
        staffFirstName: staff.firstName,
        staffLastName: staff.lastName,
        staffEmail: staff.email,
        staffEmployeeNumber: staff.employeeNumber,
        staffPosition: staff.position,
      })
        .from(monthlyPayslips)
        .leftJoin(organizations, eq(monthlyPayslips.organizationId, organizations.id))
        .leftJoin(branches, eq(monthlyPayslips.branchId, branches.id))
        .leftJoin(staff, eq(monthlyPayslips.employeeId, staff.id))
        .where(and(...whereConditions))
        .limit(1);

      if (result.length === 0) {
        return {
          success: false,
          error: 'Monthly payslip not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch monthly payslip'
      };
    }
  }

  static async create(data: CreateMonthlyPayslipData): Promise<ServiceResponse<any>> {
    try {
      const newPayslip = await db.insert(monthlyPayslips).values({
        organizationId: data.organizationId,
        branchId: data.branchId,
        employeeType: data.employeeType,
        employeeId: data.employeeId,
        staffSalaryId: data.staffSalaryId,
        month: data.month,
        year: data.year,
        payPeriodStart: data.payPeriodStart,
        payPeriodEnd: data.payPeriodEnd,
        basicSalary: data.basicSalary,
        allowances: data.allowances,
        deductions: data.deductions,
        grossSalary: data.grossSalary,
        totalDeductions: data.totalDeductions,
        netSalary: data.netSalary,
        workingDays: data.workingDays,
        presentDays: data.presentDays,
        leaveDays: data.leaveDays || 0,
        absentDays: data.absentDays || 0,
        overtimeHours: data.overtimeHours || 0,
        overtimeRate: data.overtimeRate || 0,
        overtimeAmount: data.overtimeAmount || 0,
        bonus: data.bonus || 0,
        advanceDeduction: data.advanceDeduction || 0,
        notes: data.notes,
        generatedBy: data.generatedBy,
        status: data.status || 0 // Default to unpaid
      }).returning();

      return {
        success: true,
        data: newPayslip[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create monthly payslip'
      };
    }
  }

  static async update(id: number, data: UpdateMonthlyPayslipData, userBranchId?: number): Promise<ServiceResponse<any>> {
    try {
      const whereConditions = [eq(monthlyPayslips.id, id)];
      if (userBranchId) {
        whereConditions.push(eq(monthlyPayslips.branchId, userBranchId));
      }

      // Check if payslip exists and user has access
      const existingPayslip = await db.select()
        .from(monthlyPayslips)
        .where(and(...whereConditions))
        .limit(1);

      if (existingPayslip.length === 0) {
        return {
          success: false,
          error: 'Monthly payslip not found or access denied'
        };
      }

      // Update the payslip
      const updatedPayslip = await db.update(monthlyPayslips)
        .set({
          ...data,
          updatedAt: new Date().toISOString()
        })
        .where(eq(monthlyPayslips.id, id))
        .returning();

      return {
        success: true,
        data: updatedPayslip[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update monthly payslip'
      };
    }
  }

  // Bulk update status for multiple payslips
  static async updateBulkStatus(ids: number[], status: number, userBranchId?: number): Promise<ServiceResponse<any>> {
    return await db.transaction(async (tx) => {
      try {
        const whereConditions = [inArray(monthlyPayslips.id, ids)];
        if (userBranchId) {
          whereConditions.push(eq(monthlyPayslips.branchId, userBranchId));
        }

        // First check if all payslips exist and user has access
        const existingPayslips = await tx.select({ id: monthlyPayslips.id })
          .from(monthlyPayslips)
          .where(and(...whereConditions));

        if (existingPayslips.length !== ids.length) {
          return {
            success: false,
            error: 'Some payslips not found or access denied'
          };
        }

        // Update all payslips with new status
        const updatedPayslips = await tx.update(monthlyPayslips)
          .set({
            status: status,
            updatedAt: new Date().toISOString()
          })
          .where(and(...whereConditions))
          .returning();

        return {
          success: true,
          data: {
            updated: updatedPayslips.length,
            payslips: updatedPayslips
          }
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to update payslip status'
        };
      }
    });
  }

  static async delete(id: number, userBranchId?: number): Promise<ServiceResponse<any>> {
    try {
      const whereConditions = [eq(monthlyPayslips.id, id)];
      if (userBranchId) {
        whereConditions.push(eq(monthlyPayslips.branchId, userBranchId));
      }

      // Check if payslip exists and user has access
      const existingPayslip = await db.select()
        .from(monthlyPayslips)
        .where(and(...whereConditions))
        .limit(1);

      if (existingPayslip.length === 0) {
        return {
          success: false,
          error: 'Monthly payslip not found or access denied'
        };
      }

      // Delete the payslip
      await db.delete(monthlyPayslips)
        .where(eq(monthlyPayslips.id, id));

      return {
        success: true,
        data: { id }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete monthly payslip'
      };
    }
  }

  // Generate monthly payslips for all staff with current salaries
  static async generateMonthlyPayslips(
    organizationId: number,
    month: number,
    year: number,
    generatedBy: number
  ): Promise<ServiceResponse<any>> {
    return await db.transaction(async (tx) => {
      try {
        // Get all current staff salaries for the organization
        const currentSalaries = await tx.select({
          id: staffSalaries.id,
          employeeId: staffSalaries.employeeId,
          employeeType: staffSalaries.employeeType,
          basicSalary: staffSalaries.basicSalary,
          allowances: staffSalaries.allowances,
          deductions: staffSalaries.deductions,
          branchId: staffSalaries.branchId, // Include branchId for payslip creation
        })
          .from(staffSalaries)
          .where(
            and(
              eq(staffSalaries.organizationId, organizationId),
              eq(staffSalaries.isCurrent, true)
            )
          );

        if (currentSalaries.length === 0) {
          return {
            success: false,
            error: 'No current staff salaries found for this organization'
          };
        }

        // Check if payslips already exist for this month/year in the organization
        const existingPayslips = await tx.select({ id: monthlyPayslips.id })
          .from(monthlyPayslips)
          .where(
            and(
              eq(monthlyPayslips.organizationId, organizationId),
              eq(monthlyPayslips.month, month),
              eq(monthlyPayslips.year, year)
            )
          );

        if (existingPayslips.length > 0) {
          return {
            success: false,
            error: `Payslips already exist for ${month}/${year}`
          };
        }

        // Calculate pay period dates
        const payPeriodStart = new Date(year, month - 1, 1).toISOString();
        const payPeriodEnd = new Date(year, month, 0).toISOString();
        const workingDays = new Date(year, month, 0).getDate(); // Simple calculation

        const newPayslips = [];

        // Generate payslip for each staff member
        for (const salary of currentSalaries) {
          const totalAllowances = Object.values(salary.allowances || {}).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
          const totalDeductions = Object.values(salary.deductions || {}).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
          const grossSalary = salary.basicSalary + totalAllowances;
          const netSalary = grossSalary - totalDeductions;

          const payslipData = {
            organizationId,
            branchId: salary.branchId, // Use branchId from the salary record
            employeeType: salary.employeeType,
            employeeId: salary.employeeId,
            staffSalaryId: salary.id,
            month,
            year,
            payPeriodStart,
            payPeriodEnd,
            basicSalary: salary.basicSalary,
            allowances: salary.allowances,
            deductions: salary.deductions,
            grossSalary,
            totalDeductions,
            netSalary,
            workingDays,
            presentDays: workingDays, // Default to full attendance
            leaveDays: 0,
            absentDays: 0,
            overtimeHours: 0,
            overtimeRate: 0,
            overtimeAmount: 0,
            bonus: 0,
            advanceDeduction: 0,
            generatedBy,
            status: 0 // Default to unpaid
          };

          const newPayslip = await tx.insert(monthlyPayslips).values(payslipData).returning();
          newPayslips.push(newPayslip[0]);
        }

        return {
          success: true,
          data: {
            generated: newPayslips.length,
            payslips: newPayslips
          }
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to generate monthly payslips'
        };
      }
    });
  }
}