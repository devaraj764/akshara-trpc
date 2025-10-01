import { eq, and, desc, asc, not } from 'drizzle-orm';
import db from '../db/index.js';
import {
  staffSalaries,
  staff,
  organizations,
  branches,
  users
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreateStaffSalaryData {
  staffId: number;
  organizationId: number;
  branchId: number;
  basicSalary: number;
  allowances: any;
  deductions: any;
  effectiveFrom: string;
  effectiveTo?: string | undefined;
  isCurrent?: boolean | undefined;
  createdBy?: number | undefined;
}

export interface UpdateStaffSalaryData {
  basicSalary?: number | undefined;
  allowances?: any | undefined;
  deductions?: any | undefined;
  effectiveFrom?: string | undefined;
  effectiveTo?: string | undefined;
  isCurrent?: boolean | undefined;
}

export interface GetStaffSalaryOptions {
  organizationId?: number | undefined;
  branchId?: number | undefined;
  employeeId?: number | undefined;
  employeeType?: 'STAFF' | 'TEACHER' | undefined;
  isCurrent?: boolean | undefined;
  includeStaffInfo?: boolean | undefined;
}

export class StaffSalaryService {
  static async getAll(options: GetStaffSalaryOptions = {}): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [];

      if (options.organizationId) {
        whereConditions.push(eq(staffSalaries.organizationId, options.organizationId));
      }

      if (options.branchId) {
        whereConditions.push(eq(staffSalaries.branchId, options.branchId));
      }

      if (options.employeeId) {
        whereConditions.push(eq(staffSalaries.employeeId, options.employeeId));
      }

      if (options.employeeType) {
        whereConditions.push(eq(staffSalaries.employeeType, options.employeeType));
      }

      if (options.isCurrent !== undefined) {
        whereConditions.push(eq(staffSalaries.isCurrent, options.isCurrent));
      }

      const result = await db.select({
        id: staffSalaries.id,
        organizationId: staffSalaries.organizationId,
        branchId: staffSalaries.branchId,
        employeeType: staffSalaries.employeeType,
        employeeId: staffSalaries.employeeId,
        basicSalary: staffSalaries.basicSalary,
        allowances: staffSalaries.allowances,
        deductions: staffSalaries.deductions,
        effectiveFrom: staffSalaries.effectiveFrom,
        effectiveTo: staffSalaries.effectiveTo,
        isCurrent: staffSalaries.isCurrent,
        createdBy: staffSalaries.createdBy,
        createdAt: staffSalaries.createdAt,
        updatedAt: staffSalaries.updatedAt,
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
        // Include created by user info
        createdByUserDisplayName: users.displayName,
        createdByUserEmail: users.email
      })
        .from(staffSalaries)
        .leftJoin(organizations, eq(staffSalaries.organizationId, organizations.id))
        .leftJoin(branches, eq(staffSalaries.branchId, branches.id))
        .leftJoin(staff, eq(staffSalaries.employeeId, staff.id))
        .leftJoin(users, eq(staffSalaries.createdBy, users.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(staffSalaries.effectiveFrom), desc(staffSalaries.createdAt));

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch staff salaries'
      };
    }
  }

  static async getById(id: number, userBranchId?: number): Promise<ServiceResponse<any>> {
    try {
      const whereConditions = [eq(staffSalaries.id, id)];

      // For branch admins, restrict to their branch
      if (userBranchId) {
        whereConditions.push(eq(staffSalaries.branchId, userBranchId));
      }

      const result = await db.select({
        id: staffSalaries.id,
        organizationId: staffSalaries.organizationId,
        branchId: staffSalaries.branchId,
        employeeType: staffSalaries.employeeType,
        employeeId: staffSalaries.employeeId,
        basicSalary: staffSalaries.basicSalary,
        allowances: staffSalaries.allowances,
        deductions: staffSalaries.deductions,
        effectiveFrom: staffSalaries.effectiveFrom,
        effectiveTo: staffSalaries.effectiveTo,
        isCurrent: staffSalaries.isCurrent,
        createdBy: staffSalaries.createdBy,
        createdAt: staffSalaries.createdAt,
        updatedAt: staffSalaries.updatedAt,
        organizationName: organizations.name,
        branchName: branches.name,
        staffFirstName: staff.firstName,
        staffLastName: staff.lastName,
        staffEmail: staff.email,
        staffEmployeeNumber: staff.employeeNumber,
        staffPosition: staff.position,
        createdByUserDisplayName: users.displayName,
        createdByUserEmail: users.email
      })
        .from(staffSalaries)
        .leftJoin(organizations, eq(staffSalaries.organizationId, organizations.id))
        .leftJoin(branches, eq(staffSalaries.branchId, branches.id))
        .leftJoin(staff, eq(staffSalaries.employeeId, staff.id))
        .leftJoin(users, eq(staffSalaries.createdBy, users.id))
        .where(and(...whereConditions))
        .limit(1);

      if (result.length === 0) {
        return {
          success: false,
          error: 'Staff salary record not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch staff salary'
      };
    }
  }

  static async getCurrentSalaryForEmployee(employeeId: number, employeeType: 'STAFF' | 'TEACHER', userBranchId?: number): Promise<ServiceResponse<any>> {
    try {
      const whereConditions = [
        eq(staffSalaries.employeeId, employeeId),
        eq(staffSalaries.employeeType, employeeType),
        eq(staffSalaries.isCurrent, true)
      ];

      // For branch admins, restrict to their branch
      if (userBranchId) {
        whereConditions.push(eq(staffSalaries.branchId, userBranchId));
      }

      const result = await db.select({
        id: staffSalaries.id,
        organizationId: staffSalaries.organizationId,
        branchId: staffSalaries.branchId,
        employeeType: staffSalaries.employeeType,
        employeeId: staffSalaries.employeeId,
        basicSalary: staffSalaries.basicSalary,
        allowances: staffSalaries.allowances,
        deductions: staffSalaries.deductions,
        effectiveFrom: staffSalaries.effectiveFrom,
        effectiveTo: staffSalaries.effectiveTo,
        isCurrent: staffSalaries.isCurrent,
        createdBy: staffSalaries.createdBy,
        createdAt: staffSalaries.createdAt,
        updatedAt: staffSalaries.updatedAt,
        organizationName: organizations.name,
        branchName: branches.name,
        staffFirstName: staff.firstName,
        staffLastName: staff.lastName,
        staffEmail: staff.email,
        staffEmployeeNumber: staff.employeeNumber,
        staffPosition: staff.position
      })
        .from(staffSalaries)
        .leftJoin(organizations, eq(staffSalaries.organizationId, organizations.id))
        .leftJoin(branches, eq(staffSalaries.branchId, branches.id))
        .leftJoin(staff, eq(staffSalaries.employeeId, staff.id))
        .where(and(...whereConditions))
        .limit(1);

      if (result.length === 0) {
        return {
          success: false,
          error: 'No current salary found for this employee'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch current salary'
      };
    }
  }

  static async create(data: CreateStaffSalaryData): Promise<ServiceResponse<any>> {
    return await db.transaction(async (tx) => {
      try {
        // Validate staff member exists and get their information
        const staffMember = await tx.select({
          id: staff.id,
          organizationId: staff.organizationId,
          branchId: staff.branchId,
          employeeType: staff.employeeType,
          firstName: staff.firstName,
          lastName: staff.lastName
        })
          .from(staff)
          .where(
            and(
              eq(staff.id, data.staffId),
              eq(staff.isActive, true)
            )
          )
          .limit(1);

        if (staffMember.length === 0) {
          return {
            success: false,
            error: 'Staff member not found or inactive'
          };
        }

        const staffInfo = staffMember[0];

        if (!staffInfo) {
          return {
            success: false,
            error: 'Employee type mismatch with staff record'
          };
        }

        // If this is marked as current, set all other salary records for this employee as not current
        if (data.isCurrent !== false) {
          await tx.update(staffSalaries)
            .set({
              isCurrent: false,
              updatedAt: new Date().toISOString()
            })
            .where(
              and(
                eq(staffSalaries.employeeId, staffInfo.id),
                eq(staffSalaries.employeeType, staffInfo.employeeType)
              )
            );
        }

        // Create new salary record using staff information
        const newSalary = await tx.insert(staffSalaries).values({
          organizationId: staffInfo.organizationId,
          branchId: staffInfo.branchId,
          employeeType: staffInfo.employeeType,
          employeeId: staffInfo.id,
          basicSalary: data.basicSalary,
          allowances: data.allowances,
          deductions: data.deductions,
          effectiveFrom: data.effectiveFrom,
          effectiveTo: data.effectiveTo,
          isCurrent: data.isCurrent ?? true,
          createdBy: data.createdBy
        }).returning();

        return {
          success: true,
          data: newSalary[0]
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to create staff salary'
        };
      }
    });
  }

  static async update(id: number, data: UpdateStaffSalaryData, userBranchId?: number): Promise<ServiceResponse<any>> {
    return await db.transaction(async (tx) => {
      try {
        // Check if salary record exists and user has access
        const whereConditions = [eq(staffSalaries.id, id)];
        if (userBranchId) {
          whereConditions.push(eq(staffSalaries.branchId, userBranchId));
        }

        const existingSalary = await tx.select()
          .from(staffSalaries)
          .where(and(...whereConditions))
          .limit(1);

        if (existingSalary.length === 0) {
          return {
            success: false,
            error: 'Staff salary record not found or access denied'
          };
        }

        // If this is being marked as current, set all other salary records for this employee as not current
        if (data.isCurrent === true && existingSalary[0]) {
          await tx.update(staffSalaries)
            .set({
              isCurrent: false,
              updatedAt: new Date().toISOString()
            })
            .where(
              and(
                eq(staffSalaries.employeeId, existingSalary[0].employeeId),
                eq(staffSalaries.employeeType, existingSalary[0].employeeType),
                not(eq(staffSalaries.id, id)) // Don't set this record to false
              )
            );
        }

        // Update the salary record
        const updatedSalary = await tx.update(staffSalaries)
          .set({
            ...data,
            updatedAt: new Date().toISOString()
          })
          .where(eq(staffSalaries.id, id))
          .returning();

        return {
          success: true,
          data: updatedSalary[0]
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to update staff salary'
        };
      }
    });
  }

  static async delete(id: number, userBranchId?: number): Promise<ServiceResponse<any>> {
    return await db.transaction(async (tx) => {
      try {
        // Check if salary record exists and user has access
        const whereConditions = [eq(staffSalaries.id, id)];
        if (userBranchId) {
          whereConditions.push(eq(staffSalaries.branchId, userBranchId));
        }

        const existingSalary = await tx.select()
          .from(staffSalaries)
          .where(and(...whereConditions))
          .limit(1);

        if (existingSalary.length === 0) {
          return {
            success: false,
            error: 'Staff salary record not found or access denied'
          };
        }

        // Delete the salary record
        await tx.delete(staffSalaries)
          .where(eq(staffSalaries.id, id));

        return {
          success: true,
          data: { id }
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to delete staff salary'
        };
      }
    });
  }

  static async getSalaryHistory(employeeId: number, employeeType: 'STAFF' | 'TEACHER', userBranchId?: number): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [
        eq(staffSalaries.employeeId, employeeId),
        eq(staffSalaries.employeeType, employeeType)
      ];

      // For branch admins, restrict to their branch
      if (userBranchId) {
        whereConditions.push(eq(staffSalaries.branchId, userBranchId));
      }

      const result = await db.select({
        id: staffSalaries.id,
        basicSalary: staffSalaries.basicSalary,
        allowances: staffSalaries.allowances,
        deductions: staffSalaries.deductions,
        effectiveFrom: staffSalaries.effectiveFrom,
        effectiveTo: staffSalaries.effectiveTo,
        isCurrent: staffSalaries.isCurrent,
        createdAt: staffSalaries.createdAt,
        createdByUserDisplayName: users.displayName,
        createdByUserEmail: users.email
      })
        .from(staffSalaries)
        .leftJoin(users, eq(staffSalaries.createdBy, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(staffSalaries.effectiveFrom), desc(staffSalaries.createdAt));

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch salary history'
      };
    }
  }
}