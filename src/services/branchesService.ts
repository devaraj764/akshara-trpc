import { eq, and, or, like, count, ne } from 'drizzle-orm';
import db from '../db/index.js';
import { branches, students, staff, sections, users, addresses } from '../db/schema.js';
import { ServiceResponse } from '../types.db.js';

export interface Branch {
  id: number;
  name: string;
  code?: string;
  addressId?: number;
  contactPhone?: string;
  organizationId: number;
  timezone: string;
  status: string;
  meta?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchData {
  name: string;
  code?: string | undefined;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    pincode?: string;
    cityVillage: string;
    district: string;
    state: string;
    country?: string;
  };
  contactPhone?: string | undefined;
  organizationId: number;
  timezone?: string | undefined;
  meta?: any;
}

export interface UpdateBranchData {
  name?: string | undefined;
  code?: string | undefined;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    pincode?: string;
    cityVillage: string;
    district: string;
    state: string;
    country?: string;
  };
  contactPhone?: string | undefined;
  timezone?: string | undefined;
  status?: string | undefined;
  meta?: any;
}

export interface BranchFilters {
  organizationId?: number | undefined;
  search?: string | undefined; // Search by name, code, or address
}

export class BranchesService {
  static async getById(id: number): Promise<ServiceResponse<Branch>> {
    try {
      const result = await db.select({
        id: branches.id,
        name: branches.name,
        code: branches.code,
        addressId: branches.addressId,
        contactPhone: branches.contactPhone,
        organizationId: branches.organizationId,
        timezone: branches.timezone,
        status: branches.status,
        meta: branches.meta,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt,
        // Address data
        address: {
          addressLine1: addresses.addressLine1,
          addressLine2: addresses.addressLine2,
          pincode: addresses.pincode,
          cityVillage: addresses.cityVillage,
          district: addresses.district,
          state: addresses.state,
          country: addresses.country,
        }
      })
      .from(branches)
      .leftJoin(addresses, eq(branches.addressId, addresses.id))
      .where(eq(branches.id, id))
      .limit(1);
      
      if (result.length === 0) {
        return { success: false, error: 'Branch not found' };
      }

      const branch = result[0];
      // Clean up address if no addressId
      const cleanedBranch = {
        ...branch,
        address: branch.addressId ? branch.address : undefined
      };

      return { success: true, data: cleanedBranch as Branch };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch branch' };
    }
  }

  static async getAll(filters?: BranchFilters): Promise<ServiceResponse<Branch[]>> {
    try {
      const conditions = [];
      
      if (filters?.organizationId) {
        conditions.push(eq(branches.organizationId, filters.organizationId));
      }
      
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          or(
            like(branches.name, searchTerm),
            like(branches.code, searchTerm)
          )
        );
      }
      
      let result;
      const selectFields = {
        id: branches.id,
        name: branches.name,
        code: branches.code,
        addressId: branches.addressId,
        contactPhone: branches.contactPhone,
        organizationId: branches.organizationId,
        timezone: branches.timezone,
        status: branches.status,
        meta: branches.meta,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt,
        // Address data
        address: {
          addressLine1: addresses.addressLine1,
          addressLine2: addresses.addressLine2,
          pincode: addresses.pincode,
          cityVillage: addresses.cityVillage,
          district: addresses.district,
          state: addresses.state,
          country: addresses.country,
        }
      };

      if (conditions.length > 0) {
        result = await db.select(selectFields)
          .from(branches)
          .leftJoin(addresses, eq(branches.addressId, addresses.id))
          .where(and(...conditions));
      } else {
        result = await db.select(selectFields)
          .from(branches)
          .leftJoin(addresses, eq(branches.addressId, addresses.id));
      }
      
      // Clean up addresses for branches without addressId
      const cleanedResults = result.map(branch => ({
        ...branch,
        address: branch.addressId ? branch.address : undefined
      }));
      
      return { success: true, data: cleanedResults as Branch[] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch branches' };
    }
  }

  static async getByOrganization(organizationId: number): Promise<ServiceResponse<Branch[]>> {
    try {
      const selectFields = {
        id: branches.id,
        name: branches.name,
        code: branches.code,
        addressId: branches.addressId,
        contactPhone: branches.contactPhone,
        organizationId: branches.organizationId,
        timezone: branches.timezone,
        status: branches.status,
        meta: branches.meta,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt,
        // Address data
        address: {
          addressLine1: addresses.addressLine1,
          addressLine2: addresses.addressLine2,
          pincode: addresses.pincode,
          cityVillage: addresses.cityVillage,
          district: addresses.district,
          state: addresses.state,
          country: addresses.country,
        }
      };

      const result = await db.select(selectFields)
        .from(branches)
        .leftJoin(addresses, eq(branches.addressId, addresses.id))
        .where(eq(branches.organizationId, organizationId));
      
      // Clean up addresses for branches without addressId
      const cleanedResults = result.map(branch => ({
        ...branch,
        address: branch.addressId ? branch.address : undefined
      }));
      
      return { success: true, data: cleanedResults as Branch[] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch organization branches' };
    }
  }

  static async create(data: CreateBranchData): Promise<ServiceResponse<Branch>> {
    try {
      // Validate required fields
      if (!data.name || !data.organizationId) {
        return { success: false, error: 'Name and organization ID are required' };
      }

      return await db.transaction(async (tx) => {
        // Check if branch code is unique within organization (if provided)
        if (data.code) {
          const existingBranch = await tx.select().from(branches)
            .where(and(
              eq(branches.organizationId, data.organizationId),
              eq(branches.code, data.code)
            ))
            .limit(1);
          
          if (existingBranch.length > 0) {
            throw new Error('Branch code already exists in this organization');
          }
        }

        // Create address if provided
        let addressId: number | undefined;
        if (data.address) {
          const addressResult = await tx.insert(addresses).values({
            addressLine1: data.address.addressLine1,
            addressLine2: data.address.addressLine2 || null,
            pincode: data.address.pincode || null,
            cityVillage: data.address.cityVillage,
            district: data.address.district,
            state: data.address.state,
            country: data.address.country || 'India',
          }).returning({ id: addresses.id });
          addressId = addressResult[0]?.id;
        }

        const newBranch = await tx.insert(branches).values({
          name: data.name,
          code: data.code || null,
          contactPhone: data.contactPhone || null,
          organizationId: data.organizationId,
          timezone: data.timezone || 'Asia/Kolkata',
          meta: data.meta || null,
          addressId: addressId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).returning();

        if (newBranch.length === 0) {
          throw new Error('Failed to create branch');
        }

        return { success: true, data: newBranch[0] as Branch };
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create branch' };
    }
  }

  static async update(id: number, data: UpdateBranchData): Promise<ServiceResponse<Branch>> {
    try {
      // Check if branch exists
      const existingBranch = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
      
      if (!existingBranch || !existingBranch[0]) {
        return { success: false, error: 'Branch not found' };
      }

      // Check if branch code is unique within organization (if being updated)
      if (data.code) {
        const duplicateBranch = await db.select().from(branches)
          .where(and(
            eq(branches.organizationId, existingBranch[0].organizationId),
            eq(branches.code, data.code),
            // Exclude current branch from check
            ne(branches.id, id)
          ))
          .limit(1);
        
        if (duplicateBranch.length > 0) {
          return { success: false, error: 'Branch code already exists in this organization' };
        }
      }

      return await db.transaction(async (tx) => {
        // Handle address update if provided
        let addressId: number | undefined = existingBranch[0]?.addressId || undefined;
        if (data.address) {
          if (addressId) {
            // Update existing address
            await tx.update(addresses).set({
              addressLine1: data.address.addressLine1,
              addressLine2: data.address.addressLine2 || null,
              pincode: data.address.pincode || null,
              cityVillage: data.address.cityVillage,
              district: data.address.district,
              state: data.address.state,
              country: data.address.country || 'India',
              updatedAt: new Date().toISOString()
            }).where(eq(addresses.id, addressId));
          } else {
            // Create new address
            const addressResult = await tx.insert(addresses).values({
              addressLine1: data.address.addressLine1,
              addressLine2: data.address.addressLine2 || null,
              pincode: data.address.pincode || null,
              cityVillage: data.address.cityVillage,
              district: data.address.district,
              state: data.address.state,
              country: data.address.country || 'India',
            }).returning({ id: addresses.id });
            addressId = addressResult[0]?.id;
          }
        }

        const updateData: any = {
          updatedAt: new Date().toISOString()
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.code !== undefined) updateData.code = data.code;
        if (addressId !== undefined) updateData.addressId = addressId;
        if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
        if (data.timezone !== undefined) updateData.timezone = data.timezone;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.meta !== undefined) updateData.meta = data.meta;

        const updatedBranch = await tx.update(branches)
          .set(updateData)
          .where(eq(branches.id, id))
          .returning();

        if (updatedBranch.length === 0) {
          throw new Error('Failed to update branch');
        }

        return { success: true, data: updatedBranch[0] as Branch };
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update branch' };
    }
  }

  static async delete(id: number): Promise<ServiceResponse<void>> {
    try {
      // Check if branch exists
      const existingBranch = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
      
      if (existingBranch.length === 0) {
        return { success: false, error: 'Branch not found' };
      }

      // Check for dependencies - students, teachers, staff
      const [studentCount, teacherCount, staffCount] = await Promise.all([
        db.select({ count: count() }).from(students).where(eq(students.branchId, id)),
        db.select({ count: count() }).from(staff).where(and(eq(staff.branchId, id), eq(staff.employeeType, 'TEACHER'))),
        db.select({ count: count() }).from(staff).where(eq(staff.branchId, id))
      ]);

      const totalDependencies = (studentCount[0]?.count || 0) + (teacherCount[0]?.count || 0) + (staffCount[0]?.count || 0);
      
      if (totalDependencies > 0) {
        return { 
          success: false, 
          error: 'Cannot delete branch with existing students, teachers, or staff members. Please transfer or remove them first.' 
        };
      }

      await db.delete(branches).where(eq(branches.id, id));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete branch' };
    }
  }

  static async getStats(branchId: number): Promise<ServiceResponse<{
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalStaff: number;
  }>> {
    try {
      // Check if branch exists
      const branchExists = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
      if (branchExists.length === 0) {
        return { success: false, error: 'Branch not found' };
      }

      const [studentCount, teacherCount, staffCount, sectionCount] = await Promise.all([
        db.select({ count: count() }).from(students).where(and(eq(students.branchId, branchId), eq(students.isDeleted, false))),
        db.select({ count: count() }).from(staff).where(and(eq(staff.branchId, branchId), eq(staff.isActive, true), eq(staff.employeeType, 'TEACHER'))),
        db.select({ count: count() }).from(staff).where(and(eq(staff.branchId, branchId), eq(staff.isActive, true))),
        db.select({ count: count() }).from(sections).where(eq(sections.branchId, branchId))
      ]);

      // Count sections as classes (each section represents a class)
      const totalClasses = sectionCount[0]?.count || 0;

      return {
        success: true,
        data: {
          totalStudents: studentCount[0]?.count || 0,
          totalTeachers: teacherCount[0]?.count || 0,
          totalClasses,
          totalStaff: staffCount[0]?.count || 0
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch branch statistics' };
    }
  }

  static async validateBranchCode(code: string, organizationId: number, excludeId?: number): Promise<ServiceResponse<boolean>> {
    try {
      if (!code || !organizationId) {
        return { success: false, error: 'Code and organization ID are required' };
      }

      let existingBranch;
      
      if (excludeId) {
        existingBranch = await db.select().from(branches)
          .where(and(
            eq(branches.organizationId, organizationId),
            eq(branches.code, code),
            ne(branches.id, excludeId)
          ))
          .limit(1);
      } else {
        existingBranch = await db.select().from(branches)
          .where(and(
            eq(branches.organizationId, organizationId),
            eq(branches.code, code)
          ))
          .limit(1);
      }

      const isUnique = existingBranch.length === 0;

      return { success: true, data: isUnique };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to validate branch code' };
    }
  }

  static async assignManager(_branchId: number, _managerId: number): Promise<ServiceResponse<Branch>> {
    // Note: The current database schema doesn't include a managerId field for branches
    // This would require adding a managerId column to the branches table
    // or implementing branch management through user roles
    return { success: false, error: 'Branch manager assignment not supported in current schema' };
  }

  static async removeManager(_branchId: number): Promise<ServiceResponse<Branch>> {
    // Note: The current database schema doesn't include a managerId field for branches
    return { success: false, error: 'Branch manager removal not supported in current schema' };
  }

  static async changeBranchManager(branchId: number, newManagerId: number, currentManagerId?: number): Promise<ServiceResponse<{ success: boolean }>> {
    try {
      // Import UserService here to avoid circular dependency
      const { userService } = await import('./userService.js');

      // Get branch details to validate it exists
      const branch = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
      if (!branch || !branch[0]) {
        return { success: false, error: 'Branch not found' };
      }

      // Get the new manager's details
      const newManager = await db.select().from(users).where(eq(users.id, newManagerId)).limit(1);
      if (!newManager || !newManager[0]) {
        return { success: false, error: 'New manager not found' };
      }

      // Validate that the new manager belongs to the same branch
      if (newManager[0].branchId !== branchId) {
        return { success: false, error: 'New manager must belong to the target branch' };
      }

      // If there's a current manager, demote them by removing BRANCH_ADMIN role
      if (currentManagerId) {
        // Get current manager's roles for this branch
        const currentManagerRoles = await userService.getUserRoles(currentManagerId);
        if (currentManagerRoles.success && currentManagerRoles.data) {
          const branchAdminRole = currentManagerRoles.data.find(
            role => role.role === 'BRANCH_ADMIN' && role.branchId === branchId
          );
          
          const hasStaffRole = currentManagerRoles.data.some(
            role => role.role === 'STAFF' && role.branchId === branchId
          );
          
          if (branchAdminRole) {
            // Remove BRANCH_ADMIN role
            await userService.removeUserRole(currentManagerId, branchAdminRole.id);
            
            // Ensure they have STAFF role (base role for all branch members)
            if (!hasStaffRole) {
              await userService.addUserRole({
                userId: currentManagerId,
                role: 'STAFF',
                organizationId: branch[0].organizationId,
                branchId: branchId
              });
            }
          }
        }
      }

      // Get new manager's current roles to see if they need role change
      const newManagerRoles = await userService.getUserRoles(newManagerId);
      let hasStaffRole = false;
      
      if (newManagerRoles.success && newManagerRoles.data) {
        // Check if they already have STAFF role for this branch
        hasStaffRole = newManagerRoles.data.some(
          role => role.role === 'STAFF' && role.branchId === branchId
        );
        
        // Remove any existing TEACHER/ACCOUNTANT roles for this branch (but keep STAFF)
        const rolesToRemove = newManagerRoles.data.filter(
          role => ['TEACHER', 'ACCOUNTANT'].includes(role.role) && role.branchId === branchId
        );
        
        for (const role of rolesToRemove) {
          await userService.removeUserRole(newManagerId, role.id);
        }
      }

      // Ensure they have STAFF role first (base role for all branch members)
      if (!hasStaffRole) {
        await userService.addUserRole({
          userId: newManagerId,
          role: 'STAFF',
          organizationId: branch[0].organizationId,
          branchId: branchId
        });
      }

      // Add BRANCH_ADMIN role to new manager
      const addRoleResult = await userService.addUserRole({
        userId: newManagerId,
        role: 'BRANCH_ADMIN',
        organizationId: branch[0].organizationId,
        branchId: branchId
      });

      if (!addRoleResult.success) {
        return { success: false, error: addRoleResult.error || 'Failed to assign branch admin role' };
      }

      return { success: true, data: { success: true } };
    } catch (err: any) {
      console.error('Unexpected error changing branch manager:', err);
      return { success: false, error: err.message || 'Failed to change branch manager' };
    }
  }
}

export const branchesService = BranchesService;