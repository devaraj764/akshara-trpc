import { eq, and, sql, isNull, inArray } from 'drizzle-orm';
import db from '../db/index.js';
import { departments, organizations, branches, staff } from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreateDepartmentData {
  name: string;
  code?: string | undefined;
  description?: string | undefined;
  organizationId?: number | undefined;
  branchId?: number | undefined;
  isPrivate?: boolean | undefined;
}

export interface UpdateDepartmentData {
  name?: string | undefined;
  code?: string | undefined;
  description?: string | undefined;
  isPrivate?: boolean | undefined;
}

export interface GetDepartmentsOptions {
  organizationId?: number | undefined;
  branchId?: number | undefined;
  includeStaffCount?: boolean | undefined;
}

export class DepartmentService {
  static async getAll(options: GetDepartmentsOptions = {}): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [eq(departments.isDeleted, false)];

      if (options.organizationId) {
        whereConditions.push(eq(departments.organizationId, options.organizationId));
      }

      if (options.branchId) {
        whereConditions.push(eq(departments.branchId, options.branchId));
      }

      const result = await db.select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        description: departments.description,
        organizationId: departments.organizationId,
        branchId: departments.branchId,
        isPrivate: departments.isPrivate,
        createdAt: departments.createdAt,
        // Include organization info
        organizationName: organizations.name,
        // Include branch info if applicable
        branchName: branches.name,
        // Include staff count if requested
        ...(options.includeStaffCount ? {
          staffCount: sql<number>`(
            SELECT COUNT(*) FROM ${staff} 
            WHERE ${staff.departmentId} = ${departments.id} 
            AND ${staff.isActive} = true
          )`.as('staffCount')
        } : {})
      })
      .from(departments)
      .leftJoin(organizations, eq(departments.organizationId, organizations.id))
      .leftJoin(branches, eq(departments.branchId, branches.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(departments.name);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch departments'
      };
    }
  }

  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        description: departments.description,
        organizationId: departments.organizationId,
        branchId: departments.branchId,
        isPrivate: departments.isPrivate,
        createdAt: departments.createdAt,
        organizationName: organizations.name,
        branchName: branches.name
      })
      .from(departments)
      .leftJoin(organizations, eq(departments.organizationId, organizations.id))
      .leftJoin(branches, eq(departments.branchId, branches.id))
      .where(and(eq(departments.id, id), eq(departments.isDeleted, false)))
      .limit(1);

      if (result.length === 0) {
        return {
          success: false,
          error: 'Department not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch department'
      };
    }
  }

  static async create(data: CreateDepartmentData): Promise<ServiceResponse<any>> {
    try {
      // Start a transaction to ensure both operations succeed
      const result = await db.transaction(async (tx) => {
        // Create the department
        const insertData: any = {
          name: data.name,
          organizationId: data.organizationId || null,
          isPrivate: data.isPrivate || false,
        };
        
        // Only add optional fields if they have values
        if (data.code) insertData.code = data.code;
        if (data.description) insertData.description = data.description;
        if (data.branchId) insertData.branchId = data.branchId;
        
        const newDepartment = await tx.insert(departments).values(insertData).returning();

        if (!newDepartment || !newDepartment[0]) {
          throw new Error('Failed to create department');
        }

        // If it's a private department for an organization, automatically add to enabled list
        if (data.isPrivate && data.organizationId) {
          // Get current enabled departments
          const orgResult = await tx.select({ enabledDepartments: organizations.enabledDepartments })
            .from(organizations)
            .where(eq(organizations.id, data.organizationId))
            .limit(1);

          if (orgResult && orgResult[0]) {
            const currentEnabled = orgResult[0].enabledDepartments || [];
            const newEnabled = [...currentEnabled, newDepartment[0].id];
            
            // Update organization's enabled departments
            await tx.update(organizations)
              .set({ enabledDepartments: newEnabled })
              .where(eq(organizations.id, data.organizationId));
          }
        }

        return newDepartment[0];
      });

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      if (error.constraint?.includes('uq_department_code_org')) {
        return {
          success: false,
          error: 'Department code already exists in this organization'
        };
      }
      if (error.constraint?.includes('uq_department_name_branch')) {
        return {
          success: false,
          error: 'Department name already exists in this branch'
        };
      }
      return {
        success: false,
        error: error.message || 'Failed to create department'
      };
    }
  }

  static async update(id: number, data: UpdateDepartmentData, userRole?: string, userOrganizationId?: number): Promise<ServiceResponse<any>> {
    try {
      // Check if the department exists and get its organization info
      const existing = await db.select({ 
        id: departments.id, 
        organizationId: departments.organizationId 
      })
        .from(departments)
        .where(and(eq(departments.id, id), eq(departments.isDeleted, false)))
        .limit(1);

      if (existing.length === 0) {
        return { success: false, error: 'Department not found' };
      }

      const existingDepartment = existing[0];

      // Prevent non-SUPER_ADMIN users from editing global departments (organizationId = null)
      if (userRole !== 'SUPER_ADMIN' && existingDepartment!.organizationId === null) {
        return { success: false, error: 'Cannot edit global departments. Only super admins can modify global entities.' };
      }

      // For organization-specific departments, ensure user can only edit departments from their organization
      if (userRole !== 'SUPER_ADMIN' && userOrganizationId && existingDepartment!.organizationId !== userOrganizationId) {
        return { success: false, error: 'Access denied' };
      }

      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.isPrivate !== undefined) updateData.isPrivate = data.isPrivate;

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'No fields to update'
        };
      }

      updateData.updatedAt = sql`CURRENT_TIMESTAMP`;

      const result = await db.update(departments)
        .set(updateData)
        .where(and(eq(departments.id, id), eq(departments.isDeleted, false)))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Department not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      if (error.constraint?.includes('uq_department_code_org')) {
        return {
          success: false,
          error: 'Department code already exists in this organization'
        };
      }
      if (error.constraint?.includes('uq_department_name_branch')) {
        return {
          success: false,
          error: 'Department name already exists in this branch'
        };
      }
      return {
        success: false,
        error: error.message || 'Failed to update department'
      };
    }
  }

  static async delete(id: number, userRole?: string, userOrganizationId?: number): Promise<ServiceResponse<any>> {
    try {
      // Check if the department exists and get its organization info
      const existing = await db.select({ 
        id: departments.id, 
        organizationId: departments.organizationId 
      })
        .from(departments)
        .where(and(eq(departments.id, id), eq(departments.isDeleted, false)))
        .limit(1);

      if (existing.length === 0) {
        return { success: false, error: 'Department not found' };
      }

      const existingDepartment = existing[0];

      // Prevent non-SUPER_ADMIN users from deleting global departments (organizationId = null)
      if (userRole !== 'SUPER_ADMIN' && existingDepartment!.organizationId === null) {
        return { success: false, error: 'Cannot delete global departments. Only super admins can modify global entities.' };
      }

      // For organization-specific departments, ensure user can only delete departments from their organization
      if (userRole !== 'SUPER_ADMIN' && userOrganizationId && existingDepartment!.organizationId !== userOrganizationId) {
        return { success: false, error: 'Access denied' };
      }

      // Check if department has staff members
      const staffCount = await db.select({ count: sql<number>`COUNT(*)` })
        .from(staff)
        .where(and(eq(staff.departmentId, id), eq(staff.isActive, true)));

      if (staffCount[0]?.count && staffCount[0].count > 0) {
        return {
          success: false,
          error: 'Cannot delete department with active staff members'
        };
      }

      const result = await db.update(departments)
        .set({ 
          isDeleted: true,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(and(eq(departments.id, id), eq(departments.isDeleted, false)))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Department not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete department'
      };
    }
  }

  static async restore(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(departments)
        .set({ 
          isDeleted: false,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(departments.id, id))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Department not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to restore department'
      };
    }
  }

  static async getByOrganization(organizationId: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({ 
      organizationId, 
      includeStaffCount: true 
    });
  }

  static async getByBranch(branchId: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({ 
      branchId, 
      includeStaffCount: true 
    });
  }

  // Get enabled departments for an organization (both global and private)
  static async getEnabledForOrganization(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      // First get the organization's enabled departments list
      const orgResult = await db.select({ enabledDepartments: organizations.enabledDepartments })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!orgResult || !orgResult[0]) {
        return {
          success: false,
          error: 'Organization not found'
        };
      }

      const enabledIds = orgResult[0].enabledDepartments || [];
      
      if (enabledIds.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      // Get all enabled departments (global and private ones for this org)
      const result = await db.select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        description: departments.description,
        organizationId: departments.organizationId,
        branchId: departments.branchId,
        isPrivate: departments.isPrivate,
        createdAt: departments.createdAt,
        organizationName: organizations.name,
        branchName: branches.name,
      })
      .from(departments)
      .leftJoin(organizations, eq(departments.organizationId, organizations.id))
      .leftJoin(branches, eq(departments.branchId, branches.id))
      .where(and(
        inArray(departments.id, enabledIds),
        eq(departments.isDeleted, false)
      ))
      .orderBy(departments.name);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch enabled departments'
      };
    }
  }

  // Get all global departments (for selection by org admin)
  static async getGlobal(): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        description: departments.description,
        organizationId: departments.organizationId,
        branchId: departments.branchId,
        isPrivate: departments.isPrivate,
        createdAt: departments.createdAt,
      })
      .from(departments)
      .where(and(
        eq(departments.isDeleted, false),
        eq(departments.isPrivate, false),
        isNull(departments.organizationId)
      ))
      .orderBy(departments.name);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch global departments'
      };
    }
  }

  // Get private departments for an organization
  static async getPrivateForOrganization(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        description: departments.description,
        organizationId: departments.organizationId,
        branchId: departments.branchId,
        isPrivate: departments.isPrivate,
        createdAt: departments.createdAt,
      })
      .from(departments)
      .where(and(
        eq(departments.isDeleted, false),
        eq(departments.isPrivate, true),
        eq(departments.organizationId, organizationId)
      ))
      .orderBy(departments.name);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch private departments'
      };
    }
  }

  // Check removal info - determines if department should be deleted or just removed from enabled list
  static async checkRemoval(departmentId: number, organizationId?: number): Promise<ServiceResponse<any>> {
    try {
      // Get department details
      const departmentResult = await db.select({
        id: departments.id,
        name: departments.name,
        isPrivate: departments.isPrivate,
        organizationId: departments.organizationId,
      })
      .from(departments)
      .where(and(eq(departments.id, departmentId), eq(departments.isDeleted, false)))
      .limit(1);

      if (departmentResult.length === 0) {
        return {
          success: false,
          error: 'Department not found'
        };
      }

      const department = departmentResult[0];

      // Check if department has active staff
      const staffCount = await db.select({ count: sql<number>`COUNT(*)` })
        .from(staff)
        .where(and(eq(staff.departmentId, departmentId), eq(staff.isActive, true)));

      const hasStaff = staffCount[0]?.count > 0;

      // Determine removal type
      let removalType: 'remove' | 'delete';
      let canRemove = true;
      let reason = '';

      if (department.isPrivate && department.organizationId === organizationId) {
        // Private department owned by user's organization - delete entirely
        removalType = 'delete';
        if (hasStaff) {
          canRemove = false;
          reason = `Cannot delete department as it has ${staffCount[0]?.count} active staff members`;
        }
      } else {
        // Global department - just remove from enabled list
        removalType = 'remove';
        // Can always remove from enabled list
      }

      return {
        success: true,
        data: {
          departmentId,
          departmentName: department.name,
          removalType,
          canRemove,
          reason,
          hasStaff,
          staffCount: staffCount[0]?.count || 0,
          isPrivate: department.isPrivate,
          ownedByOrganization: department.organizationId === organizationId
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to check removal info'
      };
    }
  }

  // Remove or delete department based on ownership and usage
  static async removeOrDelete(departmentId: number, organizationId?: number): Promise<ServiceResponse<any>> {
    try {
      // First check removal info
      const checkResult = await this.checkRemoval(departmentId, organizationId);
      
      if (!checkResult.success) {
        return checkResult;
      }

      const { removalType, canRemove, reason } = checkResult.data;

      if (!canRemove) {
        return {
          success: false,
          error: reason
        };
      }

      if (removalType === 'delete') {
        // Delete the private department entirely
        const result = await db.update(departments)
          .set({ 
            isDeleted: true,
            updatedAt: sql`CURRENT_TIMESTAMP`
          })
          .where(and(eq(departments.id, departmentId), eq(departments.isDeleted, false)))
          .returning();

        if (result.length === 0) {
          return {
            success: false,
            error: 'Department not found'
          };
        }

        return {
          success: true,
          data: {
            action: 'deleted',
            department: result[0]
          }
        };
      } else {
        // Remove from organization's enabled departments list
        if (!organizationId) {
          return {
            success: false,
            error: 'Organization ID is required'
          };
        }

        const result = await db.transaction(async (tx) => {
          // Get current enabled departments
          const orgResult = await tx.select({ enabledDepartments: organizations.enabledDepartments })
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1);

          if (!orgResult || !orgResult[0]) {
            throw new Error('Organization not found');
          }

          const currentEnabled = orgResult[0].enabledDepartments || [];
          const newEnabled = currentEnabled.filter(id => id !== departmentId);
          
          // Update organization's enabled departments
          await tx.update(organizations)
            .set({ enabledDepartments: newEnabled })
            .where(eq(organizations.id, organizationId));

          return { departmentId, organizationId };
        });

        return {
          success: true,
          data: {
            action: 'removed',
            departmentId: result.departmentId,
            organizationId: result.organizationId
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove or delete department'
      };
    }
  }
}