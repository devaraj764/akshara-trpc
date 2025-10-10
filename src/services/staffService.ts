import { eq, and, or, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { 
  staff, 
  organizations, 
  branches, 
  departments,
  users, 
  userRoles,
  addresses,
  personDetails
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreateStaffData {
  organizationId: number;
  branchId: number; // Required in current database schema
  employeeNumber?: string | undefined;
  firstName: string;
  lastName?: string | undefined;
  phone: string; // Required for staff creation
  email: string; // Required for staff creation
  address?: {
    addressLine1: string;
    addressLine2?: string;
    pincode?: string;
    cityVillage: string;
    district: string;
    state: string;
    country?: string;
  };
  dob?: string | undefined;
  gender?: string | undefined;
  position?: string | undefined;
  hireDate?: string | undefined;
  departmentId?: number | undefined;
  employeeType?: string | undefined;
  meta?: any; // For teacher qualifications and other custom data
}

export interface UpdateStaffData {
  employeeNumber?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    pincode?: string;
    cityVillage: string;
    district: string;
    state: string;
    country?: string;
  };
  dob?: string | undefined;
  gender?: string | undefined;
  position?: string | undefined;
  hireDate?: string | undefined;
  departmentId?: number | undefined;
  employeeType?: string | undefined;
  isActive?: boolean | undefined;
  meta?: any;
}

export interface ConnectUserAccountData {
  staffId: number;
}

export interface GetStaffOptions {
  organizationId?: number | undefined;
  branchId?: number | undefined;
  departmentId?: number | undefined;
  employeeType?: string | undefined;
  isActive?: boolean | undefined;
  includeDepartmentInfo?: boolean | undefined;
  includeUserInfo?: boolean | undefined;
}

export interface CheckExistingStaffOptions {
  email?: string | undefined;
  phone?: string | undefined;
  excludeStaffId?: number | undefined;
  organizationId?: number | undefined;
  branchId?: number | undefined;
}

export class StaffService {
  static async getAll(options: GetStaffOptions = {}): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [];

      if (options.organizationId) {
        whereConditions.push(eq(staff.organizationId, options.organizationId));
      }

      if (options.branchId) {
        whereConditions.push(eq(staff.branchId, options.branchId));
      }

      if (options.departmentId) {
        whereConditions.push(eq(staff.departmentId, options.departmentId));
      }

      if (options.employeeType) {
        whereConditions.push(eq(staff.employeeType, options.employeeType));
      }

      if (options.isActive !== undefined) {
        whereConditions.push(eq(staff.isActive, options.isActive));
      }

      const result = await db.select({
        id: staff.id,
        userId: staff.userId,
        organizationId: staff.organizationId,
        branchId: staff.branchId,
        employeeNumber: staff.employeeNumber,
        firstName: staff.firstName,
        lastName: staff.lastName,
        phone: staff.phone,
        email: staff.email,
        address: staff.address,
        dob: staff.dob,
        gender: staff.gender,
        position: staff.position,
        emergencyContact: staff.emergencyContact,
        hireDate: staff.hireDate,
        departmentId: staff.departmentId,
        employeeType: staff.employeeType,
        isActive: staff.isActive,
        meta: staff.meta,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
        // Include organization info
        organizationName: organizations.name,
        // Include branch info
        branchName: branches.name,
        // Include department info if requested
        ...(options.includeDepartmentInfo ? {
          departmentName: departments.name,
          departmentCode: departments.code
        } : {}),
        // Include user info if requested
        ...(options.includeUserInfo ? {
          userEmail: users.email,
          userDisplayName: users.displayName,
          userIsActive: users.isActive
        } : {})
      })
        .from(staff)
        .leftJoin(organizations, eq(staff.organizationId, organizations.id))
        .leftJoin(branches, eq(staff.branchId, branches.id))
        .leftJoin(departments, eq(staff.departmentId, departments.id))
        .leftJoin(users, eq(staff.userId, users.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(staff.firstName, staff.lastName);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch staff'
      };
    }
  }

  static async getById(id: number, userBranchId?: number, isActive?: boolean): Promise<ServiceResponse<any>> {
    try {
      const whereConditions = [eq(staff.id, id)];
      
      if (isActive !== undefined) {
        whereConditions.push(eq(staff.isActive, isActive));
      }

      // For branch admins, restrict to their branch
      if (userBranchId) {
        whereConditions.push(eq(staff.branchId, userBranchId));
      }

      const result = await db.select({
        id: staff.id,
        userId: staff.userId,
        organizationId: staff.organizationId,
        branchId: staff.branchId,
        employeeNumber: staff.employeeNumber,
        firstName: staff.firstName,
        lastName: staff.lastName,
        phone: staff.phone,
        email: staff.email,
        address: staff.address,
        dob: staff.dob,
        gender: staff.gender,
        position: staff.position,
        emergencyContact: staff.emergencyContact,
        hireDate: staff.hireDate,
        departmentId: staff.departmentId,
        employeeType: staff.employeeType,
        isActive: staff.isActive,
        meta: staff.meta,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
        organizationName: organizations.name,
        branchName: branches.name,
        departmentName: departments.name,
        departmentCode: departments.code,
        userEmail: users.email,
        userDisplayName: users.displayName,
        userIsActive: users.isActive
      })
        .from(staff)
        .leftJoin(organizations, eq(staff.organizationId, organizations.id))
        .leftJoin(branches, eq(staff.branchId, branches.id))
        .leftJoin(departments, eq(staff.departmentId, departments.id))
        .leftJoin(users, eq(staff.userId, users.id))
        .where(and(...whereConditions))
        .limit(1);

      if (result.length === 0) {
        return {
          success: false,
          error: 'Staff member not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch staff member'
      };
    }
  }

  static async create(data: CreateStaffData): Promise<ServiceResponse<any>> {
    try {
      // Validate required fields for current database schema
      if (!data.branchId) {
        return {
          success: false,
          error: 'branchId is required'
        };
      }

      return await db.transaction(async (tx) => {
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

        // Create person details
        const personDetailsResult = await tx.insert(personDetails).values({
          firstName: data.firstName,
          lastName: data.lastName || null,
          dob: data.dob || null,
          gender: data.gender || null,
          addressId: addressId || null,
        }).returning({ id: personDetails.id });

        const personDetailsId = personDetailsResult[0]?.id;
        if (!personDetailsId) {
          throw new Error('Failed to create person details');
        }

        // Generate employee number automatically if not provided
        let employeeNumber = data.employeeNumber;
        if (!employeeNumber) {
          try {
            // Get count of existing staff in the organization for auto-generation
            const staffCount = await tx.select({ count: sql<number>`count(*)` })
              .from(staff)
              .where(
                eq(staff.organizationId, data.organizationId)
              );

            const nextNumber = (staffCount[0]?.count || 0) + 1;
            const employeeTypePrefix = data.employeeType === 'TEACHER' ? 'TCH' : 'STF';
            employeeNumber = `${employeeTypePrefix}${nextNumber.toString().padStart(4, '0')}`;

            console.log(`Generated employee number: ${employeeNumber} for ${data.employeeType}`);
          } catch (error) {
            console.error('Error generating employee number:', error);
            // Fallback to timestamp-based ID if count fails
            const timestamp = Date.now().toString().slice(-6);
            const employeeTypePrefix = data.employeeType === 'TEACHER' ? 'TCH' : 'STF';
            employeeNumber = `${employeeTypePrefix}${timestamp}`;
          }
        }

        // Create the staff record without user account
        const staffResult = await tx.insert(staff).values({
          userId: null, // No user account initially
          organizationId: data.organizationId,
          branchId: data.branchId,
          employeeNumber: employeeNumber,
          phone: data.phone, // Required field
          email: data.email, // Required field
          position: data.position || null,
          hireDate: data.hireDate || null,
          departmentId: data.departmentId || null,
          employeeType: data.employeeType || 'STAFF',
          meta: data.meta || null,
          personDetailsId: personDetailsId,
        }).returning();

        const createdStaff = staffResult[0];
        if (!createdStaff) {
          throw new Error('Failed to create staff record');
        }

        return {
          success: true,
          data: createdStaff
        };
      });
    } catch (error: any) {
      console.log(error);
      if (error.constraint?.includes('uq_staff_employee_number')) {
        return {
          success: false,
          error: 'Employee number already exists in this branch'
        };
      }
      return {
        success: false,
        error: error.message || 'Failed to create staff member'
      };
    }
  }

  static async update(id: number, data: UpdateStaffData, userBranchId?: number): Promise<ServiceResponse<any>> {
    try {
      const updateData: any = {};

      if (data.employeeNumber !== undefined) updateData.employeeNumber = data.employeeNumber;
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.dob !== undefined) updateData.dob = data.dob;
      if (data.gender !== undefined) updateData.gender = data.gender;
      if (data.position !== undefined) updateData.position = data.position;
      if (data.emergencyContact !== undefined) updateData.emergencyContact = data.emergencyContact;
      if (data.hireDate !== undefined) updateData.hireDate = data.hireDate;
      if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
      if (data.employeeType !== undefined) updateData.employeeType = data.employeeType;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.meta !== undefined) updateData.meta = data.meta;

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'No fields to update'
        };
      }

      updateData.updatedAt = sql`CURRENT_TIMESTAMP`;

      const whereConditions = [eq(staff.id, id)];

      // For branch admins, restrict to their branch
      if (userBranchId) {
        whereConditions.push(eq(staff.branchId, userBranchId));
      }

      const result = await db.update(staff)
        .set(updateData)
        .where(and(...whereConditions))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Staff member not found or access denied'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      if (error.constraint?.includes('uq_staff_employee_number')) {
        return {
          success: false,
          error: 'Employee number already exists in this branch'
        };
      }
      return {
        success: false,
        error: error.message || 'Failed to update staff member'
      };
    }
  }

  static async delete(id: number, userBranchId?: number): Promise<ServiceResponse<any>> {
    try {
      const whereConditions = [eq(staff.id, id)];

      // For branch admins, restrict to their branch
      if (userBranchId) {
        whereConditions.push(eq(staff.branchId, userBranchId));
      }

      const result = await db.update(staff)
        .set({
          isActive: false,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(and(...whereConditions))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Staff member not found or access denied'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete staff member'
      };
    }
  }

  static async restore(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(staff)
        .set({
          isActive: true,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(staff.id, id))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Staff member not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to restore staff member'
      };
    }
  }

  static async getByBranch(branchId: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      branchId,
      includeDepartmentInfo: true,
      includeUserInfo: true
    });
  }

  static async getByDepartment(departmentId: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      departmentId,
      includeDepartmentInfo: true,
      includeUserInfo: true
    });
  }

  static async getByEmployeeType(_employeeType: string, branchId?: number): Promise<ServiceResponse<any[]>> {
    const options: GetStaffOptions = {
      employeeType: _employeeType,
      includeDepartmentInfo: true,
      includeUserInfo: true
    };
    if (branchId) {
      options.branchId = branchId;
    }
    return this.getAll(options);
  }

  static async getTeachers(branchId?: number): Promise<ServiceResponse<any[]>> {
    return this.getByEmployeeType('TEACHER', branchId);
  }

  static async updateTeacherQualifications(id: number, qualifications: any, userBranchId?: number): Promise<ServiceResponse<any>> {
    try {
      const whereConditions = [
        eq(staff.id, id),
        eq(staff.employeeType, 'TEACHER')
      ];

      // For branch admins, restrict to their branch
      if (userBranchId) {
        whereConditions.push(eq(staff.branchId, userBranchId));
      }

      // Get current meta data
      const current = await db.select({ meta: staff.meta })
        .from(staff)
        .where(and(...whereConditions))
        .limit(1);

      if (current.length === 0) {
        return {
          success: false,
          error: 'Teacher not found or access denied'
        };
      }

      const currentMeta = current[0]?.meta || {};
      const updatedMeta = {
        ...currentMeta,
        qualifications
      };

      const result = await db.update(staff)
        .set({
          meta: updatedMeta,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(and(...whereConditions))
        .returning();

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update teacher qualifications'
      };
    }
  }

  static async connectOrCreateUserAccount(data: ConnectUserAccountData): Promise<ServiceResponse<any>> {
    return await db.transaction(async (tx) => {
      try {
        // First check if staff exists and get all needed information
        const staffRecord = await tx.select({
          id: staff.id,
          userId: staff.userId,
          organizationId: staff.organizationId,
          branchId: staff.branchId,
          firstName: staff.firstName,
          lastName: staff.lastName,
          phone: staff.phone,
          email: staff.email,
          dob: staff.dob,
          employeeType: staff.employeeType
        })
          .from(staff)
          .where(eq(staff.id, data.staffId))
          .limit(1);

        if (staffRecord.length === 0) {
          return {
            success: false,
            error: 'Staff member not found'
          };
        }

        const staffMember = staffRecord[0]!;

        // Check if staff already has a user account
        if (staffMember.userId) {
          return {
            success: false,
            error: 'Staff member already has a user account'
          };
        }

        // Check if staff has an email address
        if (!staffMember.email) {
          return {
            success: false,
            error: 'Staff member must have an email address to create user account'
          };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(staffMember.email)) {
          return {
            success: false,
            error: 'Staff member email address is not valid'
          };
        }

        // Check if user with this email already exists in the organization
        const existingUser = await tx.select()
          .from(users)
          .where(and(
            eq(users.email, staffMember.email.toLowerCase()),
            eq(users.organizationId, staffMember.organizationId)
          ))
          .limit(1);

        let userId: number;

        if (existingUser.length > 0) {
          // Connect to existing user
          userId = existingUser[0]!.id;
          console.log(`Connecting staff to existing user account: ${staffMember.email}`);
        } else {
          // Create new user account
          // Generate password: first 4 letters of name + DOB
          const namePrefix = staffMember.firstName.substring(0, 4).toLowerCase();
          const dobSuffix = staffMember.dob ? staffMember.dob.replace(/[-\/]/g, '') : '0000';
          const generatedPassword = namePrefix + dobSuffix;

          // Hash password
          const passwordHash = await bcrypt.hash(generatedPassword, 12);

          // Create user
          const newUsers = await tx.insert(users).values({
            email: staffMember.email.toLowerCase(),
            passwordHash,
            displayName: `${staffMember.firstName} ${staffMember.lastName || ''}`.trim(),
            phone: staffMember.phone || null,
            organizationId: staffMember.organizationId,
            branchId: staffMember.branchId,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }).returning();

          const newUser = newUsers[0];
          if (!newUser) {
            return {
              success: false,
              error: 'Failed to create user account'
            };
          }

          userId = newUser.id;

          // Add appropriate roles based on employee type
          // Add STAFF role (base role for all staff members)
          await tx.insert(userRoles).values({
            userId: userId,
            role: 'STAFF',
            organizationId: staffMember.organizationId,
            branchId: staffMember.branchId
          });

          // Add TEACHER role if employee is a teacher
          if (staffMember.employeeType === 'TEACHER') {
            await tx.insert(userRoles).values({
              userId: userId,
              role: 'TEACHER',
              organizationId: staffMember.organizationId,
              branchId: staffMember.branchId
            });
          }

          console.log(`Created user account: ${staffMember.email} (Password: ${generatedPassword})`);
        }

        // Update staff record with userId
        const updatedStaff = await tx.update(staff)
          .set({
            userId: userId,
            updatedAt: sql`CURRENT_TIMESTAMP`
          })
          .where(eq(staff.id, data.staffId))
          .returning();

        return {
          success: true,
          data: {
            staff: updatedStaff[0],
            userCreated: existingUser.length === 0,
            userId: userId
          }
        };
      } catch (error: any) {
        console.error('Error connecting/creating user account:', error);
        return {
          success: false,
          error: error.message || 'Failed to connect or create user account'
        };
      }
    });
  }

  static async checkExistingStaff(options: CheckExistingStaffOptions): Promise<ServiceResponse<any>> {
    try {
      const whereConditions = [];

      // Add organization filter
      if (options.organizationId) {
        whereConditions.push(eq(staff.organizationId, options.organizationId));
      }

      // Add branch filter for branch admins
      if (options.branchId) {
        whereConditions.push(eq(staff.branchId, options.branchId));
      }

      // Exclude current staff when editing
      if (options.excludeStaffId) {
        whereConditions.push(sql`${staff.id} != ${options.excludeStaffId}`);
      }

      // Build email/phone conditions
      const contactConditions = [];
      
      if (options.email) {
        contactConditions.push(eq(staff.email, options.email.toLowerCase()));
      }
      
      if (options.phone) {
        contactConditions.push(eq(staff.phone, options.phone));
      }

      // If no contact info provided, return no matches
      if (contactConditions.length === 0) {
        return {
          success: true,
          data: {
            exists: false,
            matchedStaff: []
          }
        };
      }

      // Combine all conditions
      const contactOrCondition = contactConditions.length === 1 
        ? contactConditions[0] 
        : or(...contactConditions);

      const finalConditions = whereConditions.length > 0 
        ? and(...whereConditions, contactOrCondition)
        : contactOrCondition;

      const result = await db.select({
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        phone: staff.phone,
        employeeNumber: staff.employeeNumber,
        employeeType: staff.employeeType,
        departmentName: departments.name,
        branchName: branches.name
      })
        .from(staff)
        .leftJoin(departments, eq(staff.departmentId, departments.id))
        .leftJoin(branches, eq(staff.branchId, branches.id))
        .where(finalConditions)
        .limit(5); // Limit to avoid too many results

      return {
        success: true,
        data: {
          exists: result.length > 0,
          matchedStaff: result
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to check existing staff'
      };
    }
  }

}