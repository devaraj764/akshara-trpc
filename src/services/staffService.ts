import { eq, and, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { 
  staff, 
  organizations, 
  branches, 
  users, 
  userRoles,
  staffProfessionalHistory,
  staffBenefits,
  staffPerformanceEvaluations,
  staffCredentials
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreateStaffData {
  userId?: number;
  organizationId: number;
  branchId: number; // Required in current database schema
  employeeNumber?: string | undefined;
  firstName: string;
  lastName?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  address?: string | undefined;
  dob?: string | undefined;
  gender?: string | undefined;
  position?: string | undefined;
  emergencyContact?: any;
  hireDate?: string | undefined;
  departmentId?: number | undefined;
  employeeType?: string | undefined;
  meta?: any; // For teacher qualifications and other custom data
  // Fields for automatic user creation
  createUser?: boolean;
  userEmail?: string;
  userDisplayName?: string;
  userPhone?: string;
  createdByUserId?: number;
}

export interface UpdateStaffData {
  employeeNumber?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  address?: string | undefined;
  dob?: string | undefined;
  gender?: string | undefined;
  position?: string | undefined;
  emergencyContact?: any;
  hireDate?: string | undefined;
  departmentId?: number | undefined;
  employeeType?: string | undefined;
  isActive?: boolean | undefined;
  meta?: any;
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
        // Department info temporarily disabled due to schema mismatch
        // ...(options.includeDepartmentInfo ? {
        //   departmentName: departments.name,
        //   departmentCode: departments.code
        // } : {}),
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
        // .leftJoin(departments, eq(staff.departmentId, departments.id)) // departmentId field doesn't exist
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
        // departmentName: departments.name, // Field doesn't exist in current database
        // departmentCode: departments.code, // Field doesn't exist in current database
        userEmail: users.email,
        userDisplayName: users.displayName,
        userIsActive: users.isActive
      })
        .from(staff)
        .leftJoin(organizations, eq(staff.organizationId, organizations.id))
        .leftJoin(branches, eq(staff.branchId, branches.id))
        // .leftJoin(departments, eq(staff.departmentId, departments.id)) // departmentId field doesn't exist
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
    return await db.transaction(async (tx) => {
      try {
        // Validate required fields for current database schema
        if (!data.branchId) {
          return {
            success: false,
            error: 'branchId is required'
          };
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

        // First, create the staff record with a temporary userId (we'll update it later)
        const staffResult = await tx.insert(staff).values({
          userId: data.userId || 1, // Temporary userId, will be updated after user creation
          organizationId: data.organizationId,
          branchId: data.branchId,
          employeeNumber: employeeNumber,
          firstName: data.firstName,
          lastName: data.lastName || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          dob: data.dob || null,
          gender: data.gender || null,
          position: data.position || null,
          emergencyContact: data.emergencyContact || null,
          hireDate: data.hireDate || null,
          departmentId: data.departmentId || null,
          employeeType: data.employeeType || 'STAFF',
          meta: data.meta || null
        }).returning();

        const createdStaff = staffResult[0];
        if (!createdStaff) {
          return {
            success: false,
            error: 'Failed to create staff record'
          };
        }

        let userId = data.userId;

        // Create user account if needed (for teachers and staff who need login access)
        if (!userId && (data.employeeType === 'TEACHER' || data.employeeType === 'STAFF')) {
          try {
            // Generate password based on first 4 letters of name + DOB
            const namePrefix = data.firstName.substring(0, 4).toLowerCase();
            const dobSuffix = data.dob ? data.dob.replace(/[-\/]/g, '') : '0000';
            const generatedPassword = namePrefix + dobSuffix;

            let userEmail = data.userEmail;
            
            // For teachers, require email. For staff, generate if not provided
            if (data.employeeType === 'TEACHER') {
              if (!userEmail) {
                return {
                  success: false,
                  error: 'Email is required for teacher accounts'
                };
              }
              
              // Check if user with this email already exists
              const existingUser = await tx.select()
                .from(users)
                .where(and(
                  eq(users.email, userEmail),
                  eq(users.organizationId, data.organizationId)
                ))
                .limit(1);

              if (existingUser.length > 0) {
                userId = existingUser[0]?.id;
                console.log(`Using existing user account for teacher: ${userEmail}`);
              } else if (data.createUser) {
                // Create new teacher account within transaction
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(userEmail)) {
                  return { success: false, error: 'Invalid email format' };
                }

                // Hash password
                const passwordHash = await bcrypt.hash(generatedPassword, 12);

                // Create user within transaction
                const newUsers = await tx.insert(users).values({
                  email: userEmail.toLowerCase(),
                  passwordHash,
                  displayName: data.userDisplayName || `${data.firstName} ${data.lastName || ''}`.trim(),
                  phone: data.userPhone || null,
                  organizationId: data.organizationId,
                  branchId: data.branchId,
                  isActive: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }).returning();

                const newUser = newUsers[0];
                if (!newUser) {
                  return { success: false, error: 'Failed to create teacher user account' };
                }

                userId = newUser.id;

                // Add STAFF role (base role for branch members)
                await tx.insert(userRoles).values({
                  userId: userId,
                  role: 'STAFF',
                  organizationId: data.organizationId,
                  branchId: data.branchId
                });

                // Add TEACHER role
                await tx.insert(userRoles).values({
                  userId: userId,
                  role: 'TEACHER',
                  organizationId: data.organizationId,
                  branchId: data.branchId
                });

                console.log(`Created teacher account: ${userEmail} (Employee: ${employeeNumber}, Password: ${generatedPassword})`);
              } else {
                return {
                  success: false,
                  error: 'User account is required for teachers but email not found and createUser not enabled'
                };
              }
            } else if (data.employeeType === 'STAFF' && data.createUser) {
              // Create staff user account within transaction
              userEmail = data.email || userEmail || `${employeeNumber.toLowerCase()}@${data.organizationId}.local`;
              
              // Validate email format
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(userEmail)) {
                return { success: false, error: 'Invalid email format' };
              }

              // Hash password
              const passwordHash = await bcrypt.hash(generatedPassword, 12);

              // Create user within transaction
              const newUsers = await tx.insert(users).values({
                email: userEmail.toLowerCase(),
                passwordHash,
                displayName: `${data.firstName} ${data.lastName || ''}`.trim(),
                phone: data.phone || null,
                organizationId: data.organizationId,
                branchId: data.branchId,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }).returning();

              const newUser = newUsers[0];
              if (!newUser) {
                return { success: false, error: 'Failed to create staff user account' };
              }

              userId = newUser.id;

              // Add STAFF role
              await tx.insert(userRoles).values({
                userId: userId,
                role: 'STAFF',
                organizationId: data.organizationId,
                branchId: data.branchId
              });

              console.log(`Created staff account: ${userEmail} (Employee: ${employeeNumber}, Password: ${generatedPassword})`);
            }
          } catch (userError: any) {
            return {
              success: false,
              error: `Failed to create user account: ${userError.message}`
            };
          }
        }

        // Update the staff record with the correct userId
        if (userId && userId !== createdStaff.userId) {
          await tx.update(staff)
            .set({ userId: userId })
            .where(eq(staff.id, createdStaff.id));
          
          createdStaff.userId = userId;
        }

        return {
          success: true,
          data: createdStaff
        };
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
    });
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

  // Staff Professional History Methods
  static async addProfessionalHistory(staffId: number, historyData: any): Promise<ServiceResponse<any>> {
    try {
      const result = await db.insert(staffProfessionalHistory).values({
        staffId,
        organizationName: historyData.organizationName,
        position: historyData.position,
        startDate: historyData.startDate,
        endDate: historyData.endDate || null,
        responsibilities: historyData.responsibilities || null,
        reasonForLeaving: historyData.reasonForLeaving || null,
        supervisorName: historyData.supervisorName || null,
        supervisorContact: historyData.supervisorContact || null,
        salary: historyData.salary || null,
        achievements: historyData.achievements || null
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to add professional history' };
    }
  }

  static async getProfessionalHistory(staffId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select()
        .from(staffProfessionalHistory)
        .where(eq(staffProfessionalHistory.staffId, staffId))
        .orderBy(staffProfessionalHistory.startDate);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch professional history' };
    }
  }

  // Staff Benefits Methods
  static async addBenefit(staffId: number, benefitData: any): Promise<ServiceResponse<any>> {
    try {
      const result = await db.insert(staffBenefits).values({
        staffId,
        benefitType: benefitData.benefitType,
        benefitName: benefitData.benefitName,
        description: benefitData.description || null,
        amountValue: benefitData.amountValue || null,
        percentageValue: benefitData.percentageValue || null,
        isActive: benefitData.isActive ?? true,
        effectiveFrom: benefitData.effectiveFrom,
        effectiveTo: benefitData.effectiveTo || null,
        eligibilityCriteria: benefitData.eligibilityCriteria || null,
        benefitDetails: benefitData.benefitDetails || null
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to add benefit' };
    }
  }

  static async getStaffBenefits(staffId: number, isActive?: boolean): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [eq(staffBenefits.staffId, staffId)];
      
      if (isActive !== undefined) {
        whereConditions.push(eq(staffBenefits.isActive, isActive));
      }

      const result = await db.select()
        .from(staffBenefits)
        .where(and(...whereConditions))
        .orderBy(staffBenefits.effectiveFrom);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch staff benefits' };
    }
  }

  // Staff Performance Evaluations Methods
  static async addPerformanceEvaluation(staffId: number, evaluationData: any): Promise<ServiceResponse<any>> {
    try {
      const result = await db.insert(staffPerformanceEvaluations).values({
        staffId,
        evaluationPeriod: evaluationData.evaluationPeriod,
        evaluationDate: evaluationData.evaluationDate,
        evaluatorId: evaluationData.evaluatorId || null,
        overallRating: evaluationData.overallRating || null,
        teachingEffectiveness: evaluationData.teachingEffectiveness || null,
        classroomManagement: evaluationData.classroomManagement || null,
        professionalDevelopment: evaluationData.professionalDevelopment || null,
        collaboration: evaluationData.collaboration || null,
        punctuality: evaluationData.punctuality || null,
        strengths: evaluationData.strengths || null,
        areasForImprovement: evaluationData.areasForImprovement || null,
        goalsNextPeriod: evaluationData.goalsNextPeriod || null,
        actionPlan: evaluationData.actionPlan || null,
        evaluatorComments: evaluationData.evaluatorComments || null,
        staffComments: evaluationData.staffComments || null,
        isFinal: evaluationData.isFinal ?? false
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to add performance evaluation' };
    }
  }

  static async getPerformanceEvaluations(staffId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select()
        .from(staffPerformanceEvaluations)
        .where(eq(staffPerformanceEvaluations.staffId, staffId))
        .orderBy(staffPerformanceEvaluations.evaluationDate);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch performance evaluations' };
    }
  }

  // Staff Credentials Methods
  static async addCredential(staffId: number, credentialData: any): Promise<ServiceResponse<any>> {
    try {
      const result = await db.insert(staffCredentials).values({
        staffId,
        credentialType: credentialData.credentialType,
        credentialName: credentialData.credentialName,
        issuingAuthority: credentialData.issuingAuthority,
        credentialNumber: credentialData.credentialNumber || null,
        issueDate: credentialData.issueDate || null,
        expiryDate: credentialData.expiryDate || null,
        documentUrl: credentialData.documentUrl || null,
        isVerified: credentialData.isVerified ?? false,
        verificationDate: credentialData.verificationDate || null,
        notes: credentialData.notes || null
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to add credential' };
    }
  }

  static async getStaffCredentials(staffId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select()
        .from(staffCredentials)
        .where(eq(staffCredentials.staffId, staffId))
        .orderBy(staffCredentials.expiryDate);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch staff credentials' };
    }
  }

  static async getExpiringCredentials(daysAhead: number = 30, organizationId?: number, branchId?: number): Promise<ServiceResponse<any[]>> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const whereConditions = [
        sql`${staffCredentials.expiryDate} <= ${futureDate.toISOString()}`,
        sql`${staffCredentials.expiryDate} >= CURRENT_DATE`
      ];

      if (organizationId) {
        whereConditions.push(eq(staff.organizationId, organizationId));
      }

      if (branchId) {
        whereConditions.push(eq(staff.branchId, branchId));
      }

      const result = await db.select({
        id: staffCredentials.id,
        staffId: staffCredentials.staffId,
        credentialName: staffCredentials.credentialName,
        credentialType: staffCredentials.credentialType,
        expiryDate: staffCredentials.expiryDate,
        staffName: sql<string>`CONCAT(${staff.firstName}, ' ', ${staff.lastName})`,
        staffEmail: staff.email,
        organizationName: organizations.name,
        branchName: branches.name
      })
        .from(staffCredentials)
        .leftJoin(staff, eq(staffCredentials.staffId, staff.id))
        .leftJoin(organizations, eq(staff.organizationId, organizations.id))
        .leftJoin(branches, eq(staff.branchId, branches.id))
        .where(and(...whereConditions))
        .orderBy(staffCredentials.expiryDate);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch expiring credentials' };
    }
  }

  // Organization and Branch Level Methods
  static async getOrganizationStaffPerformance(organizationId: number, period?: string): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [eq(staff.organizationId, organizationId)];
      
      if (period) {
        whereConditions.push(eq(staffPerformanceEvaluations.evaluationPeriod, period));
      }

      const result = await db.select({
        staffId: staff.id,
        staffName: sql<string>`CONCAT(${staff.firstName}, ' ', ${staff.lastName})`,
        employeeNumber: staff.employeeNumber,
        position: staff.position,
        branchName: branches.name,
        evaluationPeriod: staffPerformanceEvaluations.evaluationPeriod,
        evaluationDate: staffPerformanceEvaluations.evaluationDate,
        overallRating: staffPerformanceEvaluations.overallRating,
        teachingEffectiveness: staffPerformanceEvaluations.teachingEffectiveness,
        isFinal: staffPerformanceEvaluations.isFinal
      })
        .from(staff)
        .leftJoin(branches, eq(staff.branchId, branches.id))
        .leftJoin(staffPerformanceEvaluations, eq(staff.id, staffPerformanceEvaluations.staffId))
        .where(and(...whereConditions))
        .orderBy(staffPerformanceEvaluations.evaluationDate);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch organization staff performance' };
    }
  }

  static async getBranchStaffCredentials(branchId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        staffId: staff.id,
        staffName: sql<string>`CONCAT(${staff.firstName}, ' ', ${staff.lastName})`,
        employeeNumber: staff.employeeNumber,
        position: staff.position,
        credentialType: staffCredentials.credentialType,
        credentialName: staffCredentials.credentialName,
        expiryDate: staffCredentials.expiryDate,
        isVerified: staffCredentials.isVerified
      })
        .from(staff)
        .leftJoin(staffCredentials, eq(staff.id, staffCredentials.staffId))
        .where(eq(staff.branchId, branchId))
        .orderBy(staff.firstName, staffCredentials.expiryDate);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch branch staff credentials' };
    }
  }

  static async getOrganizationStaffBenefits(organizationId: number, benefitType?: string): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [eq(staff.organizationId, organizationId)];
      
      if (benefitType) {
        whereConditions.push(eq(staffBenefits.benefitType, benefitType));
      }

      const result = await db.select({
        staffId: staff.id,
        staffName: sql<string>`CONCAT(${staff.firstName}, ' ', ${staff.lastName})`,
        employeeNumber: staff.employeeNumber,
        branchName: branches.name,
        benefitType: staffBenefits.benefitType,
        benefitName: staffBenefits.benefitName,
        amountValue: staffBenefits.amountValue,
        percentageValue: staffBenefits.percentageValue,
        isActive: staffBenefits.isActive,
        effectiveFrom: staffBenefits.effectiveFrom,
        effectiveTo: staffBenefits.effectiveTo
      })
        .from(staff)
        .leftJoin(branches, eq(staff.branchId, branches.id))
        .leftJoin(staffBenefits, eq(staff.id, staffBenefits.staffId))
        .where(and(...whereConditions))
        .orderBy(staff.firstName, staffBenefits.effectiveFrom);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch organization staff benefits' };
    }
  }
}