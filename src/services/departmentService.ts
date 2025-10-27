import { eq, and, sql, isNull, inArray, or } from 'drizzle-orm';
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
      console.log('DepartmentService.create called with data:', JSON.stringify(data, null, 2));
      
      // Input validation and sanitization
      if (!data.name?.trim()) {
        return {
          success: false,
          error: 'Department name is required'
        };
      }

      // Sanitize inputs
      const sanitizedName = data.name.trim();
      const sanitizedCode = data.code?.trim() || null;

      // Validate name length
      if (sanitizedName.length > 255) {
        return {
          success: false,
          error: 'Department name must be 255 characters or less'
        };
      }

      // Validate code length if provided
      if (sanitizedCode && sanitizedCode.length > 64) {
        return {
          success: false,
          error: 'Department code must be 64 characters or less'
        };
      }

      // Check for existing department with same code in the same organization (case-insensitive)
      if (sanitizedCode) {
        const codeConditions = [
          sql`LOWER(${departments.code}) = LOWER(${sanitizedCode})`,
          eq(departments.isDeleted, false)
        ];
        
        if (data.organizationId) {
          codeConditions.push(eq(departments.organizationId, data.organizationId));
        } else {
          codeConditions.push(isNull(departments.organizationId));
        }
        
        const existingByCode = await db.select({ 
          id: departments.id, 
          code: departments.code, 
          name: departments.name,
          organizationId: departments.organizationId 
        })
          .from(departments)
          .where(and(...codeConditions))
          .limit(1);
          
        console.log(`Checking for duplicate code '${sanitizedCode}' in org ${data.organizationId}:`, existingByCode);
          
        if (existingByCode.length > 0) {
          return {
            success: false,
            error: `Department code '${sanitizedCode}' already exists in this organization (existing: ${existingByCode[0]?.name})`
          };
        }
      }
      
      // Check for existing department with same name in the same branch/organization (case-insensitive)
      const nameConditions = [
        sql`LOWER(${departments.name}) = LOWER(${sanitizedName})`,
        eq(departments.isDeleted, false)
      ];
      
      if (data.branchId) {
        nameConditions.push(eq(departments.branchId, data.branchId));
      } else if (data.organizationId) {
        nameConditions.push(eq(departments.organizationId, data.organizationId));
        nameConditions.push(isNull(departments.branchId));
      } else {
        nameConditions.push(isNull(departments.organizationId));
        nameConditions.push(isNull(departments.branchId));
      }
      
      const existingByName = await db.select({ 
        id: departments.id, 
        name: departments.name,
        branchId: departments.branchId,
        organizationId: departments.organizationId 
      })
        .from(departments)
        .where(and(...nameConditions))
        .limit(1);
        
      console.log(`Checking for duplicate name '${sanitizedName}' in org ${data.organizationId}, branch ${data.branchId}:`, existingByName);
        
      if (existingByName.length > 0) {
        const location = data.branchId ? 'branch' : 'organization';
        return {
          success: false,
          error: `Department name '${sanitizedName}' already exists in this ${location} (existing ID: ${existingByName[0]?.id})`
        };
      }

      // Start a transaction to ensure both operations succeed
      const result = await db.transaction(async (tx) => {
        // Create the department with sanitized data
        const insertData: any = {
          name: sanitizedName,
          organizationId: data.organizationId || null,
          isPrivate: data.isPrivate !== undefined ? data.isPrivate : false,
        };
        
        // Only add optional fields if they have values
        if (sanitizedCode) insertData.code = sanitizedCode;
        if (data.description?.trim()) insertData.description = data.description.trim();
        if (data.branchId) insertData.branchId = data.branchId;
        
        const newDepartment = await tx.insert(departments).values(insertData).returning();

        if (!newDepartment || !newDepartment[0]) {
          throw new Error('Failed to create department');
        }

        // Automatically add to organization's enabled departments
        if (data.organizationId) {
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
      console.error('Department creation error:', error);
      
      // Handle database constraint violations
      if (error.constraint || error.code === '23505') {
        if (error.constraint?.includes('uq_department_code_org') || error.message?.includes('uq_department_code_org')) {
          return {
            success: false,
            error: 'Department code already exists in this organization. Please choose a different code.'
          };
        }
        if (error.constraint?.includes('uq_department_name_branch') || error.message?.includes('uq_department_name_branch')) {
          return {
            success: false,
            error: 'Department name already exists in this branch. Please choose a different name.'
          };
        }
        // Generic unique constraint violation
        if (error.message?.includes('duplicate key value')) {
          if (error.message?.includes('departments_code')) {
            return {
              success: false,
              error: 'Department code already exists. Please choose a different code.'
            };
          }
          if (error.message?.includes('departments_name')) {
            return {
              success: false,
              error: 'Department name already exists. Please choose a different name.'
            };
          }
          return {
            success: false,
            error: 'A department with these details already exists. Please modify your input.'
          };
        }
      }
      
      // Handle foreign key violations
      if (error.constraint?.includes('_fk') || error.code === '23503') {
        if (error.message?.includes('organization')) {
          return {
            success: false,
            error: 'Invalid organization specified'
          };
        }
        if (error.message?.includes('branch')) {
          return {
            success: false,
            error: 'Invalid branch specified'
          };
        }
      }
      
      // Handle other database errors
      if (error.code) {
        switch (error.code) {
          case '23502': // NOT NULL violation
            return {
              success: false,
              error: 'Missing required field'
            };
          case '23514': // CHECK constraint violation
            return {
              success: false,
              error: 'Invalid data provided'
            };
          default:
            return {
              success: false,
              error: `Database error: ${error.message || 'Failed to create department'}`
            };
        }
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

      // Validate and sanitize update data
      const updateData: any = {};
      
      if (data.name !== undefined) {
        const sanitizedName = data.name.trim();
        if (!sanitizedName) {
          return {
            success: false,
            error: 'Department name cannot be empty'
          };
        }
        if (sanitizedName.length > 255) {
          return {
            success: false,
            error: 'Department name must be 255 characters or less'
          };
        }
        
        // Check for duplicate name (case-insensitive, excluding current department)
        const nameConditions = [
          sql`LOWER(${departments.name}) = LOWER(${sanitizedName})`,
          eq(departments.isDeleted, false),
          sql`${departments.id} != ${id}` // Exclude current department
        ];
        
        const existingByName = await db.select({ id: departments.id })
          .from(departments)
          .where(and(...nameConditions))
          .limit(1);
          
        if (existingByName.length > 0) {
          return {
            success: false,
            error: `Department name '${sanitizedName}' already exists`
          };
        }
        
        updateData.name = sanitizedName;
      }
      
      if (data.code !== undefined) {
        const sanitizedCode = data.code?.trim() || null;
        if (sanitizedCode && sanitizedCode.length > 64) {
          return {
            success: false,
            error: 'Department code must be 64 characters or less'
          };
        }
        
        // Check for duplicate code (case-insensitive, excluding current department)
        if (sanitizedCode) {
          const codeConditions = [
            sql`LOWER(${departments.code}) = LOWER(${sanitizedCode})`,
            eq(departments.isDeleted, false),
            sql`${departments.id} != ${id}` // Exclude current department
          ];
          
          const existingByCode = await db.select({ id: departments.id })
            .from(departments)
            .where(and(...codeConditions))
            .limit(1);
            
          if (existingByCode.length > 0) {
            return {
              success: false,
              error: `Department code '${sanitizedCode}' already exists`
            };
          }
        }
        
        updateData.code = sanitizedCode;
      }
      
      if (data.description !== undefined) {
        updateData.description = data.description?.trim() || null;
      }
      
      if (data.isPrivate !== undefined) {
        updateData.isPrivate = data.isPrivate;
      }

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

  static async restore(id: number, organizationId?: number): Promise<ServiceResponse<any>> {
    try {
      console.log('Restoring department with ID:', id);
      
      // First get the department to check if it exists and get organization info
      const deptResult = await db.select({
        id: departments.id,
        name: departments.name,
        organizationId: departments.organizationId,
        isDeleted: departments.isDeleted,
        isPrivate: departments.isPrivate
      })
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);

      if (deptResult.length === 0) {
        return {
          success: false,
          error: 'Department not found'
        };
      }

      const dept = deptResult[0];
      console.log('Department found:', dept);

      // For private departments, they must be deleted to restore
      if (dept.isPrivate && dept.organizationId) {
        if (!dept.isDeleted) {
          return {
            success: false,
            error: 'Private department is not deleted'
          };
        }
        
        // Check for name conflicts
        const existingDept = await db.select()
          .from(departments)
          .where(and(
            eq(departments.name, dept.name),
            eq(departments.organizationId, dept.organizationId),
            eq(departments.isDeleted, false)
          ))
          .limit(1);
          
        if (existingDept.length > 0) {
          return {
            success: false,
            error: 'A department with this name already exists in the organization'
          };
        }
      }

      // For global departments, we need organizationId to add them back to enabled list
      if (!dept.isPrivate && !organizationId) {
        return {
          success: false,
          error: 'Organization ID is required to restore global department'
        };
      }

      // Use transaction to restore department and add to enabled list
      const result = await db.transaction(async (tx) => {
        let restoredDept = dept;
        
        // Step 1: For private departments, restore the department (set isDeleted = false)
        if (dept.isPrivate && dept.organizationId && dept.isDeleted) {
          const restored = await tx.update(departments)
            .set({ 
              isDeleted: false,
              deletedAt: null,
              updatedAt: sql`CURRENT_TIMESTAMP`
            })
            .where(eq(departments.id, id))
            .returning();

          console.log('Private department restored:', restored[0]);
          restoredDept = restored[0];
        }

        // Step 2: Add department back to organization's enabled list
        const targetOrgId = organizationId || dept.organizationId;
        if (targetOrgId) {
          const orgResult = await tx.select({ enabledDepartments: organizations.enabledDepartments })
            .from(organizations)
            .where(eq(organizations.id, targetOrgId))
            .limit(1);

          if (orgResult && orgResult[0]) {
            const currentEnabled = orgResult[0].enabledDepartments || [];
            
            // Only add if not already in enabled list
            if (!currentEnabled.includes(id)) {
              const newEnabled = [...currentEnabled, id];
              
              await tx.update(organizations)
                .set({ enabledDepartments: newEnabled })
                .where(eq(organizations.id, targetOrgId));
                
              console.log('Added department to enabled list for organization:', targetOrgId);
            } else {
              console.log('Department already in enabled list');
            }
          }
        }

        return restoredDept;
      });

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('Error in restore:', error);
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

  // Get enabled departments for an organization (both global and private, including deleted ones)
  static async getEnabledForOrganization(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      console.log('getEnabledForOrganization called with organizationId:', organizationId);
      
      // First get the organization's enabled departments list
      const orgResult = await db.select({ enabledDepartments: organizations.enabledDepartments })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      console.log('Organization result:', orgResult);

      if (!orgResult || !orgResult[0]) {
        return {
          success: false,
          error: 'Organization not found'
        };
      }

      const enabledIds = orgResult[0].enabledDepartments || [];
      console.log('Enabled department IDs:', enabledIds);
      
      // Include ALL departments that either:
      // 1. Are in the enabled list (global + enabled private departments)
      // 2. OR belong to this organization (all org departments including deleted ones)
      const conditions = [];
      
      // Add enabled departments condition
      if (enabledIds.length > 0) {
        conditions.push(inArray(departments.id, enabledIds));
        console.log('Added condition for enabled departments');
      }
      
      // Add organization-owned departments condition (including deleted ones)
      conditions.push(eq(departments.organizationId, organizationId));
      console.log('Added condition for ALL organization departments');
      
      // Use OR to combine both conditions - this ensures we get:
      // - All enabled departments (global + private)
      // - ALL departments owned by the organization (even if not enabled, including deleted)
      const finalCondition = conditions.length > 1 ? or(...conditions) : conditions[0];
      console.log('Using OR condition to combine enabled + organization departments');

      const result = await db.select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        description: departments.description,
        organizationId: departments.organizationId,
        branchId: departments.branchId,
        isPrivate: departments.isPrivate,
        isDeleted: departments.isDeleted,
        createdAt: departments.createdAt,
        organizationName: organizations.name,
        branchName: branches.name,
      })
      .from(departments)
      .leftJoin(organizations, eq(departments.organizationId, organizations.id))
      .leftJoin(branches, eq(departments.branchId, branches.id))
      .where(finalCondition)
      .orderBy(departments.isDeleted, departments.name);

      console.log('Query result:', result.length, 'departments found');
      console.log('Result preview:', result.map(d => ({ id: d.id, name: d.name, isDeleted: d.isDeleted, organizationId: d.organizationId })));

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('Error in getEnabledForOrganization:', error);
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

      const dept = departmentResult[0];

      // Check if department has active staff
      const staffCount = await db.select({ count: sql<number>`COUNT(*)` })
        .from(staff)
        .where(and(eq(staff.departmentId, departmentId), eq(staff.isActive, true)));

      const staffCountValue = staffCount[0]?.count ?? 0;
      const hasStaff = staffCountValue > 0;

      // Determine removal type
      let removalType: 'remove' | 'delete';
      let canRemove = true;
      let reason = '';

      if(!dept){
        return {
          success: false,
          error: 'Department not found'
        };
      }

      console.log(`Department details:`, {
        id: dept.id,
        name: dept.name,
        isPrivate: dept.isPrivate,
        organizationId: dept.organizationId,
        requestingOrgId: organizationId,
        hasStaff,
        staffCount: staffCountValue
      });

      if (dept.isPrivate && dept.organizationId === organizationId) {
        // Private department owned by user's organization - delete entirely
        removalType = 'delete';
        console.log('Setting removalType to DELETE (private department owned by organization)');
        if (hasStaff) {
          canRemove = false;
          reason = `Cannot delete department as it has ${staffCountValue} active staff members`;
        }
      } else {
        // Global department - just remove from enabled list
        removalType = 'remove';
        console.log('Setting removalType to REMOVE (global department or not owned by organization)');
        // Can always remove from enabled list
      }

      return {
        success: true,
        data: {
          departmentId,
          departmentName: dept.name,
          removalType,
          canRemove,
          reason,
          hasStaff,
          staffCount: staffCountValue,
          isPrivate: dept.isPrivate ?? false,
          ownedByOrganization: dept.organizationId === organizationId
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

      if (!organizationId) {
        return {
          success: false,
          error: 'Organization ID is required'
        };
      }

      // Always perform removal in a transaction
      const result = await db.transaction(async (tx) => {
        // Step 1: Remove from organization's enabled departments list
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

        let departmentResult = null;

        // Step 2: If it's a private department, also delete the record
        console.log(`Removal type: ${removalType}`);
        if (removalType === 'delete') {
          console.log(`Deleting department ${departmentId} from departments table`);
          departmentResult = await tx.update(departments)
            .set({ 
              isDeleted: true,
              updatedAt: sql`CURRENT_TIMESTAMP`
            })
            .where(and(eq(departments.id, departmentId), eq(departments.isDeleted, false)))
            .returning();

          console.log(`Delete result:`, departmentResult);
          if (departmentResult.length === 0) {
            throw new Error('Department not found for deletion');
          }
        } else {
          console.log(`Not deleting department ${departmentId} - removalType is '${removalType}'`);
        }

        return { 
          departmentId, 
          organizationId, 
          removalType, 
          department: departmentResult?.[0] 
        };
      });

      return {
        success: true,
        data: {
          action: removalType === 'delete' ? 'deleted and removed from organization' : 'removed from organization',
          departmentId: result.departmentId,
          organizationId: result.organizationId,
          department: result.department
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove or delete department'
      };
    }
  }
}