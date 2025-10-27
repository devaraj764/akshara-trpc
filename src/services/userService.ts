import { and, eq, or, like, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import db from '../db/index.js'
import { userRoles, users, organizations, branches, addresses, staff } from '../db/schema.js'
import type { ServiceResponse } from '../types.db.js'

export type CreateUserData = {
  email: string
  passwordHash: string
  displayName?: string
  organizationId?: number
  branchId?: number
}

export type UpdateUserData = {
  displayName?: string
  phone?: string
  isActive?: boolean
  organizationId?: number
  branchId?: number
  meta?: any
}

export type AddUserRoleData = {
  userId: number
  role: string
  organizationId: number
  branchId?: number | undefined
}

class UserService {
  /**
   * Create a new user profile
   */
  async createProfile(data: { id: number; display_name?: string }): Promise<ServiceResponse<any>> {
    try {
      // In the new schema, users table handles profiles
      // This method would be used to update an existing user's profile
      const updatedUsers = await db.update(users)
        .set({
          displayName: data.display_name || null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, data.id))
        .returning()

      const user = updatedUsers[0]
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      // Return the full profile with organization and branch details
      return this.getProfile(data.id)
    } catch (err: any) {
      console.error('Unexpected error updating profile:', err)
      return { success: false, error: err.message || 'Failed to update profile' }
    }
  }

  /**
   * Get user profile by user ID with organization and branch details (optimized single query)
   */
  async getProfile(userId: number) {
    try {
      // Single optimized query with JOINs to get all user data including roles
      const results = await db.select({
        // User fields
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        phone: users.phone,
        isActive: users.isActive,
        userOrganizationId: users.organizationId,
        userBranchId: users.branchId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        meta: users.meta,
        avatarUrl: users.avatarUrl,

        // Organization fields
        organizationId: organizations.id,
        organizationName: organizations.name,
        organizationRegistrationNumber: organizations.registrationNumber,
        organizationContactEmail: organizations.contactEmail,
        organizationContactPhone: organizations.contactPhone,
        organizationMeta: organizations.meta,

        // Branch fields
        branchId: branches.id,
        branchName: branches.name,
        branchCode: branches.code,
        branchContactPhone: branches.contactPhone,
        branchTimezone: branches.timezone,
        branchMeta: branches.meta,

        // Role fields
        roleId: userRoles.id,
        role: userRoles.role,
        roleOrganizationId: userRoles.organizationId,
        roleBranchId: userRoles.branchId,
        roleCreatedAt: userRoles.createdAt
      })
        .from(users)
        .leftJoin(organizations, eq(users.organizationId, organizations.id))
        .leftJoin(branches, eq(users.branchId, branches.id))
        .leftJoin(userRoles, eq(users.id, userRoles.userId))
        .where(eq(users.id, userId));

      if (results.length === 0) {
        return { success: false, error: 'Profile not found' };
      }

      // Extract user data from first row (all rows have same user data)
      const firstRow = results[0]!;

      // Collect all roles for this user
      const roles = results
        .filter(row => row.roleId !== null)
        .map(row => ({
          id: row.roleId!,
          role: row.role!,
          organizationId: row.roleOrganizationId!,
          branchId: row.roleBranchId,
          createdAt: row.roleCreatedAt!
        }));

      const profile = {
        id: firstRow.userId,
        email: firstRow.email,
        displayName: firstRow.displayName,
        phone: firstRow.phone,
        isActive: firstRow.isActive,
        organizationId: firstRow.userOrganizationId,
        branchId: firstRow.userBranchId,
        createdAt: firstRow.createdAt,
        updatedAt: firstRow.updatedAt,
        meta: firstRow.meta,
        avatarUrl: firstRow.avatarUrl,
        roles,
        hasOrganization: !!firstRow.userOrganizationId,
        hasBranch: !!firstRow.userBranchId,

        // Organization details (null if user doesn't belong to an organization)
        organization: firstRow.organizationId ? {
          id: firstRow.organizationId,
          name: firstRow.organizationName,
          registrationNumber: firstRow.organizationRegistrationNumber,
          contactEmail: firstRow.organizationContactEmail,
          contactPhone: firstRow.organizationContactPhone,
          meta: firstRow.organizationMeta
        } : null,

        // Branch details (null if user doesn't belong to a branch)
        branch: firstRow.branchId ? {
          id: firstRow.branchId,
          name: firstRow.branchName,
          code: firstRow.branchCode,
          contactPhone: firstRow.branchContactPhone,
          timezone: firstRow.branchTimezone,
          meta: firstRow.branchMeta
        } : null
      };

      return { success: true, data: profile };
    } catch (err: any) {
      console.error('Unexpected error fetching profile:', err);
      return { success: false, error: err.message || 'Failed to fetch profile' };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: number, data: UpdateUserData) {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      }

      const updatedUsers = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning()

      const user = updatedUsers[0]
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      // Return the full profile with organization and branch details
      return this.getProfile(userId)
    } catch (err: any) {
      console.error('Unexpected error updating profile:', err)
      return { success: false, error: err.message || 'Failed to update profile' }
    }
  }

  /**
   * Add role to user
   */
  async addUserRole(data: AddUserRoleData) {
    try {
      const newRoles = await db.insert(userRoles).values({
        userId: data.userId,
        role: data.role as any, // Cast to enum type
        organizationId: data.organizationId,
        branchId: data.branchId || null
      }).returning()

      const userRole = newRoles[0]
      if (!userRole) {
        return { success: false, error: 'Failed to create user role' }
      }

      return { success: true, data: userRole }
    } catch (err: any) {
      console.error('Unexpected error adding user role:', err)
      return { success: false, error: err.message || 'Failed to add user role' }
    }
  }

  /**
   * Remove role from user
   */
  async removeUserRole(_userId: number, roleId: number) {
    try {
      await db.delete(userRoles)
        .where(eq(userRoles.id, roleId))

      return { success: true }
    } catch (err: any) {
      console.error('Unexpected error removing user role:', err)
      return { success: false, error: err.message || 'Failed to remove user role' }
    }
  }

  /**
   * Check if user has specific role
   */
  async hasRole(userId: number, role: string, organizationId?: number, branchId?: number) {
    try {
      const conditions = [eq(userRoles.userId, userId), eq(userRoles.role, role as any)]

      if (organizationId) {
        conditions.push(eq(userRoles.organizationId, organizationId))
      }

      if (branchId && branchId !== null) {
        conditions.push(eq(userRoles.branchId, branchId))
      }

      const roles = await db.select().from(userRoles)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .limit(1)

      return { success: true, hasRole: roles.length > 0 }
    } catch (err: any) {
      console.error('Unexpected error checking role:', err)
      return { success: false, error: err.message || 'Failed to check role' }
    }
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: number) {
    try {
      const roles = await db.select({
        id: userRoles.id,
        role: userRoles.role,
        organizationId: userRoles.organizationId,
        branchId: userRoles.branchId,
        createdAt: userRoles.createdAt
      }).from(userRoles)
        .where(eq(userRoles.userId, userId))

      return { success: true, data: roles || [] }
    } catch (err: any) {
      console.error('Unexpected error fetching user roles:', err)
      return { success: false, error: err.message || 'Failed to fetch user roles' }
    }
  }

  /**
   * Deactivate user profile (soft delete)
   */
  async deactivateProfile(userId: number) {
    try {
      const updatedUsers = await db.update(users)
        .set({
          isActive: false,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId))
        .returning()

      const user = updatedUsers[0]
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      return { success: true, data: user }
    } catch (err: any) {
      console.error('Unexpected error deactivating profile:', err)
      return { success: false, error: err.message || 'Failed to deactivate profile' }
    }
  }

  /**
   * Reactivate user profile
   */
  async reactivateProfile(userId: number) {
    try {
      const updatedUsers = await db.update(users)
        .set({
          isActive: true,
          isDeleted: false,
          deletedAt: null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId))
        .returning()

      const user = updatedUsers[0]
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      return { success: true, data: user }
    } catch (err: any) {
      console.error('Unexpected error reactivating profile:', err)
      return { success: false, error: err.message || 'Failed to reactivate profile' }
    }
  }

  // Method aliases for route compatibility
  async getUserById(id: number) {
    return this.getProfile(id);
  }

  async updateUser(data: any) {
    return this.updateProfile(data.id, data);
  }

  async getAllUsers(filters?: {
    organizationId?: number | undefined;
    branchId?: number | undefined;
    role?: string | undefined;
    search?: string | undefined;
    isActive?: boolean | undefined;
  }): Promise<ServiceResponse<any[]>> {
    try {
      const conditions = [];

      if (filters?.organizationId !== undefined) {
        conditions.push(eq(users.organizationId, filters.organizationId));
      }

      if (filters?.branchId !== undefined) {
        conditions.push(eq(users.branchId, filters.branchId));
      }

      if (filters?.isActive !== undefined) {
        conditions.push(eq(users.isActive, filters.isActive));
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          or(
            like(users.email, searchTerm),
            like(users.displayName, searchTerm)
          )
        );
      }

      if (filters?.role) {
        conditions.push(eq(userRoles.role, filters.role as any));
      }

      const finalQuery = db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          phone: users.phone,
          isActive: users.isActive,
          organizationId: users.organizationId,
          branchId: users.branchId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          avatarUrl: users.avatarUrl,

          organization: sql`
          json_build_object(
            'id', ${organizations.id},
            'name', ${organizations.name}
          )
        `.as("organization"),

          branch: sql`
          json_build_object(
            'id', ${branches.id},
            'name', ${branches.name},
            'code', ${branches.code}
          )
        `.as("branch"),

          roles: sql`
          COALESCE(
            json_agg(
              json_build_object(
                'id', ${userRoles.id},
                'role', ${userRoles.role},
                'organizationId', ${userRoles.organizationId},
                'branchId', ${userRoles.branchId}
              )
            ) FILTER (WHERE ${userRoles.id} IS NOT NULL),
            '[]'
          )
        `.as("roles"),

          staff: sql`
          json_build_object(
            'id', ${staff.id},
            'employeeNumber', ${staff.employeeNumber},
            'position', ${staff.position},
            'isActive', ${staff.isActive}
          )
        `.as("staff"),

          hasStaffRecord: sql`CASE WHEN ${staff.id} IS NOT NULL THEN true ELSE false END`.as("hasStaffRecord"),
        })
        .from(users)
        .leftJoin(organizations, eq(users.organizationId, organizations.id))
        .leftJoin(branches, eq(users.branchId, branches.id))
        .leftJoin(userRoles, eq(users.id, userRoles.userId))
        .leftJoin(staff, eq(users.id, staff.userId))
        .groupBy(users.id, organizations.id, branches.id, staff.id);

      const rawResults = conditions.length
        ? await finalQuery.where(and(...conditions))
        : await finalQuery;

      return { success: true, data: rawResults };
    } catch (err: any) {
      console.error("Unexpected error fetching users:", err);
      return { success: false, error: err.message || "Failed to fetch users" };
    }
  }


  async createUser(data: {
    email: string;
    password: string;
    fullName: string;
    role: string;
    organizationId: number;
    branchId?: number | undefined;
  }): Promise<ServiceResponse<any>> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return { success: false, error: 'Invalid email format' };
      }

      // Check if user already exists
      const existingUser = await db.select().from(users)
        .where(eq(users.email, data.email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        return { success: false, error: 'User with this email already exists' };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 12);

      // Create user
      const newUsers = await db.insert(users).values({
        email: data.email.toLowerCase(),
        passwordHash,
        displayName: data.fullName,
        organizationId: data.organizationId,
        branchId: data.branchId || null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const user = newUsers[0];
      if (!user) {
        return { success: false, error: 'Failed to create user' };
      }

      // Add user roles (STAFF is base role for branch members)
      const rolesToAdd = [];
      
      // For branch-based roles, add STAFF as base role
      if (data.branchId && ['TEACHER', 'ACCOUNTANT', 'BRANCH_ADMIN'].includes(data.role)) {
        rolesToAdd.push({
          userId: user.id,
          role: 'STAFF',
          organizationId: data.organizationId,
          branchId: data.branchId
        });
      }
      
      // Add the specified role
      rolesToAdd.push({
        userId: user.id,
        role: data.role,
        organizationId: data.organizationId,
        branchId: data.branchId || undefined
      });

      // Add all roles
      for (const roleData of rolesToAdd) {
        const roleResult = await this.addUserRole(roleData);
        if (!roleResult.success) {
          // Rollback user creation if role assignment fails
          await db.delete(users).where(eq(users.id, user.id));
          return { success: false, error: roleResult.error || 'Failed to assign user role' };
        }
      }

      // Return full user profile
      return this.getProfile(user.id);
    } catch (err: any) {
      console.error('Unexpected error creating user:', err);
      return { success: false, error: err.message || 'Failed to create user' };
    }
  }

  /**
   * Get available filter options for user management
   */
  async getAvailableFilters(currentUserId: number) {
    try {
      // Get current user's profile to determine available filters
      const currentUserProfile = await this.getProfile(currentUserId);
      if (!currentUserProfile.success || !currentUserProfile.data) {
        return { success: false, error: 'Unable to verify user permissions' };
      }

      const currentUser = currentUserProfile.data;
      const currentUserRole = currentUser.roles?.[0]?.role;

      // Get available branches based on user role
      let availableBranches: any[] = [];
      if (currentUserRole === 'BRANCH_ADMIN') {
        // Branch admins can only see their own branch
        if (currentUser.branch) {
          availableBranches = [currentUser.branch];
        }
      } else if (currentUserRole === 'ADMIN') {
        // Admins can see all branches in their organization
        const branchesResult = await db.select({
          id: branches.id,
          name: branches.name,
          code: branches.code
        }).from(branches)
          .where(eq(branches.organizationId, currentUser.organizationId!));
        
        availableBranches = branchesResult;
      } else if (currentUserRole === 'SUPER_ADMIN') {
        // Super admins can see all branches
        const branchesResult = await db.select({
          id: branches.id,
          name: branches.name,
          code: branches.code
        }).from(branches);
        
        availableBranches = branchesResult;
      }

      // Define available roles based on current user's permissions
      let availableRoles: any[] = [];
      if (currentUserRole === 'BRANCH_ADMIN') {
        availableRoles = [
          { value: 'TEACHER', label: 'Teacher' },
          { value: 'STUDENT', label: 'Student' },
          { value: 'PARENT', label: 'Parent' },
          { value: 'STAFF', label: 'Staff' }
        ];
      } else if (currentUserRole === 'ADMIN') {
        availableRoles = [
          { value: 'ACCOUNTANT', label: 'Accountant' },
          { value: 'TEACHER', label: 'Teacher' },
          { value: 'STUDENT', label: 'Student' },
          { value: 'PARENT', label: 'Parent' },
          { value: 'STAFF', label: 'Staff' }
        ];
      } else if (currentUserRole === 'SUPER_ADMIN') {
        availableRoles = [
          { value: 'ADMIN', label: 'Admin' },
          { value: 'ACCOUNTANT', label: 'Accountant' },
          { value: 'TEACHER', label: 'Teacher' },
          { value: 'STUDENT', label: 'Student' },
          { value: 'PARENT', label: 'Parent' },
          { value: 'STAFF', label: 'Staff' }
        ];
      }

      // Status options (same for all users)
      const availableStatuses = [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ];

      return {
        success: true,
        data: {
          branches: availableBranches,
          roles: availableRoles,
          statuses: availableStatuses,
          userRole: currentUserRole,
          userBranch: currentUser.branch,
          userOrganization: currentUser.organization
        }
      };
    } catch (err: any) {
      console.error('Unexpected error fetching available filters:', err);
      return { success: false, error: err.message || 'Failed to fetch available filters' };
    }
  }

  /**
   * Change user password (admin only)
   */
  async changeUserPassword(userId: number, newPassword: string, currentUserId: number) {
    try {
      // Verify the current user has permission to change passwords
      const currentUserProfile = await this.getProfile(currentUserId);
      if (!currentUserProfile.success || !currentUserProfile.data) {
        return { success: false, error: 'Unable to verify user permissions' };
      }

      const currentUser = currentUserProfile.data;
      const currentUserRole = currentUser.roles?.[0]?.role;

      // Only admins and branch admins can change passwords
      if (!currentUserRole || !['ADMIN', 'BRANCH_ADMIN', 'SUPER_ADMIN'].includes(currentUserRole)) {
        return { success: false, error: 'Insufficient permissions to change user passwords' };
      }

      // Get target user to verify permissions
      const targetUserProfile = await this.getProfile(userId);
      if (!targetUserProfile.success || !targetUserProfile.data) {
        return { success: false, error: 'Target user not found' };
      }

      const targetUser = targetUserProfile.data;

      // Branch admins can only change passwords for users in their branch
      if (currentUserRole === 'BRANCH_ADMIN') {
        if (targetUser.branchId !== currentUser.branchId || 
            targetUser.organizationId !== currentUser.organizationId) {
          return { success: false, error: 'Can only change passwords for users in your branch' };
        }
      } else if (currentUserRole === 'ADMIN') {
        // Admins can change passwords for users in their organization
        if (targetUser.organizationId !== currentUser.organizationId) {
          return { success: false, error: 'Can only change passwords for users in your organization' };
        }
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update the password
      const updatedUsers = await db.update(users)
        .set({
          passwordHash,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId))
        .returning();

      if (updatedUsers.length === 0) {
        return { success: false, error: 'Failed to update password' };
      }

      return { success: true, data: { message: 'Password changed successfully' } };
    } catch (err: any) {
      console.error('Unexpected error changing user password:', err);
      return { success: false, error: err.message || 'Failed to change user password' };
    }
  }

  /**
   * Change own password
   */
  async changeOwnPassword(userId: number, currentPassword: string, newPassword: string) {
    try {
      // Get user to verify current password
      const userResult = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const user = userResult[0];
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update the password
      const updatedUsers = await db.update(users)
        .set({
          passwordHash,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId))
        .returning();

      if (updatedUsers.length === 0) {
        return { success: false, error: 'Failed to update password' };
      }

      return { success: true, data: { message: 'Password changed successfully' } };
    } catch (err: any) {
      console.error('Unexpected error changing own password:', err);
      return { success: false, error: err.message || 'Failed to change password' };
    }
  }

}

export const userService = new UserService()