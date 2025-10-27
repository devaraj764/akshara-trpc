import db from '../db/index.js';
import { parents, studentParents, students, personDetails, addresses } from '../db/schema.js';
import { eq, and, desc, or, ilike, ne, sql, count } from 'drizzle-orm';

export interface CreateParentData {
  organizationId: number;
  branchId: number;
  firstName: string;
  phone: string;
  lastName?: string | undefined;
  email?: string | undefined;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    pincode?: string;
    cityVillage: string;
    district: string;
    state: string;
    country?: string;
  } | undefined;
  addressId?: number | undefined;
  occupation?: string | undefined;
  companyName?: string | undefined;
  annualIncome?: number | undefined;
}

export interface CreateStudentParentData {
  studentId: number;
  parentId: number;
  relationship?: string | undefined;
  isPrimary?: boolean | undefined;
  canViewReports?: boolean | undefined;
  canViewFees?: boolean | undefined;
  contactPriority?: number | undefined;
}

export interface UpdateParentData {
  id: number;
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
  } | undefined;
  addressId?: number | undefined;
  occupation?: string | undefined;
  companyName?: string | undefined;
  annualIncome?: number | undefined;
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginationOptions {
  page?: number | undefined;
  limit?: number | undefined;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ParentSearchFilters {
  searchTerm?: string | undefined;
  branchId?: number | undefined;
  organizationId?: number | undefined;
  hasStudents?: boolean | undefined;
  excludeStudentId?: number | undefined;
}

export class ParentService {
  // Validate required fields
  private static validateCreateData(data: CreateParentData): string | null {
    if (!data.firstName?.trim()) return 'First name is required';
    if (!data.phone?.trim()) return 'Phone number is required';
    if (!data.organizationId || data.organizationId <= 0) return 'Valid organization ID is required';
    if (!data.branchId || data.branchId <= 0) return 'Valid branch ID is required';
    
    // Validate phone number format (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(data.phone.replace(/\D/g, ''))) return 'Phone number must be 10 digits';
    
    // Validate email if provided
    if (data.email && data.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) return 'Invalid email format';
    }
    
    return null;
  }

  // Check if phone number or email already exists
  static async checkDuplicateContact(phone: string, email?: string, organizationId?: number, excludeParentId?: number): Promise<ServiceResult> {
    try {
      const whereConditions = [eq(parents.isDeleted, false)];
      
      if (organizationId) {
        whereConditions.push(eq(parents.organizationId, organizationId));
      }
      
      if (excludeParentId) {
        whereConditions.push(ne(parents.id, excludeParentId));
      }

      // Check phone number
      const phoneCheckResult = await db
        .select({ 
          id: parents.id,
          phone: personDetails.phone,
          firstName: personDetails.firstName,
          lastName: personDetails.lastName 
        })
        .from(parents)
        .innerJoin(personDetails, eq(parents.personDetailId, personDetails.id))
        .where(
          and(
            ...whereConditions,
            eq(personDetails.phone, phone.replace(/\D/g, ''))
          )
        )
        .limit(1);

      if (phoneCheckResult.length > 0) {
        return {
          success: false,
          error: 'Phone number already exists',
          code: 'DUPLICATE_PHONE',
          data: { field: 'phone', existing: phoneCheckResult[0] }
        };
      }

      // Check email if provided
      if (email && email.trim()) {
        const emailCheckResult = await db
          .select({ 
            id: parents.id,
            email: personDetails.email,
            firstName: personDetails.firstName,
            lastName: personDetails.lastName 
          })
          .from(parents)
          .innerJoin(personDetails, eq(parents.personDetailId, personDetails.id))
          .where(
            and(
              ...whereConditions,
              eq(personDetails.email, email.trim())
            )
          )
          .limit(1);

        if (emailCheckResult.length > 0) {
          return {
            success: false,
            error: 'Email already exists',
            code: 'DUPLICATE_EMAIL',
            data: { field: 'email', existing: emailCheckResult[0] }
          };
        }
      }

      return { success: true, data: { available: true } };
    } catch (error: any) {
      console.error('ParentService.checkDuplicateContact error:', error);
      return {
        success: false,
        error: error.message || 'Failed to check duplicate contact',
        code: 'CHECK_ERROR'
      };
    }
  }

  // Create a new parent with enhanced validation
  static async create(data: CreateParentData): Promise<ServiceResult> {
    try {
      // Validate input data
      const validationError = this.validateCreateData(data);
      if (validationError) {
        return {
          success: false,
          error: validationError,
          code: 'VALIDATION_ERROR'
        };
      }

      // Check for duplicate contact information
      const duplicateCheck = await this.checkDuplicateContact(
        data.phone, 
        data.email, 
        data.organizationId
      );
      
      if (!duplicateCheck.success) {
        return duplicateCheck;
      }

      return await db.transaction(async (tx) => {
        // Create address if provided and not using existing addressId
        let addressId: number | undefined = data.addressId;
        if (data.address && !data.addressId) {
          const addressResult = await tx.insert(addresses).values({
            addressLine1: data.address.addressLine1,
            addressLine2: data.address.addressLine2,
            pincode: data.address.pincode,
            cityVillage: data.address.cityVillage,
            district: data.address.district,
            state: data.address.state,
            country: data.address.country || 'India',
          }).returning({ id: addresses.id });
          addressId = addressResult[0]?.id;
        }

        // Create person details
        const personDetailsResult = await tx.insert(personDetails).values({
          firstName: data.firstName.trim(),
          lastName: data.lastName?.trim() || null,
          phone: data.phone.replace(/\D/g, ''), // Store only digits
          email: data.email?.trim() || null,
        }).returning({ id: personDetails.id });

        const personDetailId = personDetailsResult[0]?.id;
        if (!personDetailId) {
          throw new Error('Failed to create person details');
        }

        // Create parent record
        const [parent] = await tx.insert(parents).values({
          organizationId: data.organizationId,
          branchId: data.branchId,
          personDetailId: personDetailId,
          occupation: data.occupation?.trim() || null,
          companyName: data.companyName?.trim() || null,
          annualIncome: data.annualIncome || null,
        }).returning();

        // If addressId was created or provided, link it to student if this is for address sharing
        // This will be handled by the calling function for address sharing

        return {
          success: true,
          data: {
            ...parent,
            firstName: data.firstName.trim(),
            lastName: data.lastName?.trim() || null,
            phone: data.phone.replace(/\D/g, ''),
            email: data.email?.trim() || null,
            addressId
          }
        };
      });
    } catch (error: any) {
      console.error('ParentService.create error:', error);
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        return {
          success: false,
          error: 'A parent with this information already exists',
          code: 'DUPLICATE_ENTRY'
        };
      }
      
      if (error.code === '23503') { // Foreign key constraint violation
        return {
          success: false,
          error: 'Invalid organization or branch ID',
          code: 'INVALID_REFERENCE'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to create parent',
        code: 'DATABASE_ERROR'
      };
    }
  }

  // Link parent to student with enhanced validation
  static async linkToStudent(data: CreateStudentParentData): Promise<ServiceResult> {
    try {
      // Validate that student and parent exist
      const [student, parent] = await Promise.all([
        db.select({ id: students.id }).from(students).where(eq(students.id, data.studentId)).limit(1),
        db.select({ id: parents.id }).from(parents).where(eq(parents.id, data.parentId)).limit(1)
      ]);

      if (student.length === 0) {
        return {
          success: false,
          error: 'Student not found',
          code: 'STUDENT_NOT_FOUND'
        };
      }

      if (parent.length === 0) {
        return {
          success: false,
          error: 'Parent not found',
          code: 'PARENT_NOT_FOUND'
        };
      }

      // Check if link already exists
      const existingLink = await db
        .select({ id: studentParents.id })
        .from(studentParents)
        .where(
          and(
            eq(studentParents.studentId, data.studentId),
            eq(studentParents.parentId, data.parentId)
          )
        )
        .limit(1);

      if (existingLink.length > 0) {
        return {
          success: false,
          error: 'Parent is already linked to this student',
          code: 'ALREADY_LINKED'
        };
      }

      // If this is set as primary, ensure no other parent is primary for this student
      if (data.isPrimary) {
        await db
          .update(studentParents)
          .set({ isPrimary: false })
          .where(eq(studentParents.studentId, data.studentId));
      }

      const [studentParent] = await db.insert(studentParents).values({
        studentId: data.studentId,
        parentId: data.parentId,
        relationship: data.relationship?.trim() || null,
        isPrimary: data.isPrimary || false,
        canViewReports: data.canViewReports !== undefined ? data.canViewReports : true,
        canViewFees: data.canViewFees !== undefined ? data.canViewFees : true,
        contactPriority: data.contactPriority || null,
      }).returning();

      return {
        success: true,
        data: studentParent
      };
    } catch (error: any) {
      console.error('ParentService.linkToStudent error:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return {
          success: false,
          error: 'Parent is already linked to this student',
          code: 'ALREADY_LINKED'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to link parent to student',
        code: 'LINK_ERROR'
      };
    }
  }

  // Create parent and link to student in one transaction
  static async createAndLinkToStudent(
    parentData: CreateParentData,
    studentId: number,
    linkData?: Partial<CreateStudentParentData>
  ): Promise<ServiceResult> {
    try {
      // Validate input data
      const validationError = this.validateCreateData(parentData);
      if (validationError) {
        return {
          success: false,
          error: validationError,
          code: 'VALIDATION_ERROR'
        };
      }

      // Check for duplicate contact information
      const duplicateCheck = await this.checkDuplicateContact(
        parentData.phone, 
        parentData.email, 
        parentData.organizationId
      );
      
      if (!duplicateCheck.success) {
        return duplicateCheck;
      }

      return await db.transaction(async (tx) => {
        // Verify student exists
        const studentExists = await tx
          .select({ id: students.id, addressId: students.addressId })
          .from(students)
          .where(eq(students.id, studentId))
          .limit(1);

        if (studentExists.length === 0) {
          throw new Error('Student not found');
        }

        const student = studentExists[0];

        // Create address if provided and not using existing addressId
        let addressId: number | undefined = parentData.addressId;
        if (parentData.address && !parentData.addressId) {
          const addressResult = await tx.insert(addresses).values({
            addressLine1: parentData.address.addressLine1,
            addressLine2: parentData.address.addressLine2,
            pincode: parentData.address.pincode,
            cityVillage: parentData.address.cityVillage,
            district: parentData.address.district,
            state: parentData.address.state,
            country: parentData.address.country || 'India',
          }).returning({ id: addresses.id });
          addressId = addressResult[0]?.id;
        } else if (parentData.addressId) {
          // Use the provided addressId (e.g., student's address)
          addressId = parentData.addressId;
        } else if (!parentData.address && student.addressId) {
          // If no address provided but student has address, could be inherited
          addressId = student.addressId;
        }

        // Create person details
        const personDetailsResult = await tx.insert(personDetails).values({
          firstName: parentData.firstName.trim(),
          lastName: parentData.lastName?.trim() || null,
          phone: parentData.phone.replace(/\D/g, ''), // Store only digits
          email: parentData.email?.trim() || null,
        }).returning({ id: personDetails.id });

        const personDetailId = personDetailsResult[0]?.id;
        if (!personDetailId) {
          throw new Error('Failed to create person details');
        }

        // Create parent record
        const [parent] = await tx.insert(parents).values({
          organizationId: parentData.organizationId,
          branchId: parentData.branchId,
          personDetailId: personDetailId,
          relationship: parentData.relationship.trim(),
          occupation: parentData.occupation?.trim() || null,
          companyName: parentData.companyName?.trim() || null,
          annualIncome: parentData.annualIncome || null,
        }).returning();

        // If this is set as primary, ensure no other parent is primary for this student
        if (linkData?.isPrimary) {
          await tx
            .update(studentParents)
            .set({ isPrimary: false })
            .where(eq(studentParents.studentId, studentId));
        }

        // Link to student
        const [studentParent] = await tx.insert(studentParents).values({
          studentId: studentId,
          parentId: parent.id,
          relationship: linkData?.relationship || parentData.relationship,
          isPrimary: linkData?.isPrimary || false,
          canViewReports: linkData?.canViewReports !== undefined ? linkData.canViewReports : true,
          canViewFees: linkData?.canViewFees !== undefined ? linkData.canViewFees : true,
          contactPriority: linkData?.contactPriority,
        }).returning();

        return {
          success: true,
          data: {
            parent: {
              ...parent,
              firstName: parentData.firstName.trim(),
              lastName: parentData.lastName?.trim() || null,
              phone: parentData.phone.replace(/\D/g, ''),
              email: parentData.email?.trim() || null,
              addressId
            },
            studentParent
          }
        };
      });
    } catch (error: any) {
      console.error('ParentService.createAndLinkToStudent error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create and link parent'
      };
    }
  }

  // Get parent by ID
  static async getById(id: number): Promise<ServiceResult> {
    try {
      const result = await db
        .select({
          id: parents.id,
          organizationId: parents.organizationId,
          branchId: parents.branchId,
          userId: parents.userId,
          occupation: parents.occupation,
          companyName: parents.companyName,
          annualIncome: parents.annualIncome,
          isDeleted: parents.isDeleted,
          createdAt: parents.createdAt,
          updatedAt: parents.updatedAt,
          // Person details
          firstName: personDetails.firstName,
          lastName: personDetails.lastName,
          phone: personDetails.phone,
          email: personDetails.email,
          photoUrl: personDetails.photoUrl,
          profileUrl: personDetails.profileUrl,
          // Address details
          addressId: sql<number>`COALESCE(parent_addresses.id, NULL)`,
          addressLine1: sql<string>`parent_addresses.address_line_1`,
          addressLine2: sql<string>`parent_addresses.address_line_2`,
          pincode: sql<string>`parent_addresses.pincode`,
          cityVillage: sql<string>`parent_addresses.city_village`,
          district: sql<string>`parent_addresses.district`,
          state: sql<string>`parent_addresses.state`,
          country: sql<string>`parent_addresses.country`,
        })
        .from(parents)
        .innerJoin(personDetails, eq(parents.personDetailId, personDetails.id))
        .leftJoin(sql`addresses as parent_addresses`, sql`parent_addresses.id = (
          SELECT address_id FROM students 
          WHERE students.id IN (
            SELECT student_id FROM student_parents 
            WHERE student_parents.parent_id = ${parents.id} LIMIT 1
          ) LIMIT 1
        )`)
        .where(and(
          eq(parents.id, id),
          eq(parents.isDeleted, false)
        ))
        .limit(1);

      if (result.length === 0) {
        return {
          success: false,
          error: 'Parent not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      console.error('ParentService.getById error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch parent'
      };
    }
  }

  // Get parents by student ID with enhanced data
  static async getByStudentId(studentId: number): Promise<ServiceResult> {
    try {
      // First verify student exists
      const student = await db
        .select({ id: students.id })
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);

      if (student.length === 0) {
        return {
          success: false,
          error: 'Student not found',
          code: 'STUDENT_NOT_FOUND'
        };
      }

      const studentParentRelations = await db
        .select({
          // Parent fields
          id: parents.id,
          organizationId: parents.organizationId,
          branchId: parents.branchId,
          occupation: parents.occupation,
          companyName: parents.companyName,
          annualIncome: parents.annualIncome,
          // Person details
          firstName: personDetails.firstName,
          lastName: personDetails.lastName,
          phone: personDetails.phone,
          email: personDetails.email,
          photoUrl: personDetails.photoUrl,
          profileUrl: personDetails.profileUrl,
          // Student-parent relationship fields
          studentParentId: studentParents.id,
          relationship: studentParents.relationship,
          isPrimary: studentParents.isPrimary,
          canViewReports: studentParents.canViewReports,
          canViewFees: studentParents.canViewFees,
          contactPriority: studentParents.contactPriority,
          linkedAt: studentParents.createdAt,
          startDate: studentParents.startDate,
          endDate: studentParents.endDate
        })
        .from(studentParents)
        .innerJoin(parents, eq(studentParents.parentId, parents.id))
        .innerJoin(personDetails, eq(parents.personDetailId, personDetails.id))
        .where(
          and(
            eq(studentParents.studentId, studentId),
            eq(parents.isDeleted, false)
          )
        )
        .orderBy(
          desc(studentParents.isPrimary),
          studentParents.contactPriority,
          desc(studentParents.createdAt)
        );

      return {
        success: true,
        data: studentParentRelations
      };
    } catch (error: any) {
      console.error('ParentService.getByStudentId error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch student parents',
        code: 'FETCH_ERROR'
      };
    }
  }

  // Update parent
  static async update(data: UpdateParentData): Promise<ServiceResult> {
    try {
      return await db.transaction(async (tx) => {
        // Get current parent data
        const currentParent = await tx
          .select({
            id: parents.id,
            personDetailId: parents.personDetailId,
          })
          .from(parents)
          .where(and(
            eq(parents.id, data.id),
            eq(parents.isDeleted, false)
          ))
          .limit(1);

        if (currentParent.length === 0) {
          throw new Error('Parent not found or already deleted');
        }

        const parent = currentParent[0]!;

        // Check for duplicate contact if phone or email is being updated
        if (data.phone || data.email) {
          const duplicateCheck = await this.checkDuplicateContact(
            data.phone || '',
            data.email,
            undefined, // organizationId not needed for existing parent
            data.id // exclude current parent
          );
          
          if (!duplicateCheck.success && (data.phone || data.email)) {
            return duplicateCheck;
          }
        }

        // Update person details if any personal info is provided
        if (parent.personDetailId && (data.firstName !== undefined || data.lastName !== undefined || 
            data.phone !== undefined || data.email !== undefined)) {
          const personUpdateData: any = {};
          if (data.firstName !== undefined) personUpdateData.firstName = data.firstName.trim();
          if (data.lastName !== undefined) personUpdateData.lastName = data.lastName?.trim() || null;
          if (data.phone !== undefined) personUpdateData.phone = data.phone.replace(/\D/g, '');
          if (data.email !== undefined) personUpdateData.email = data.email?.trim() || null;

          if (Object.keys(personUpdateData).length > 0) {
            personUpdateData.updatedAt = sql`CURRENT_TIMESTAMP`;
            await tx.update(personDetails)
              .set(personUpdateData)
              .where(eq(personDetails.id, parent.personDetailId));
          }
        }

        // Update parent-specific fields
        const parentUpdateData: any = {};
        if (data.occupation !== undefined) parentUpdateData.occupation = data.occupation?.trim() || null;
        if (data.companyName !== undefined) parentUpdateData.companyName = data.companyName?.trim() || null;
        if (data.annualIncome !== undefined) parentUpdateData.annualIncome = data.annualIncome;

        if (Object.keys(parentUpdateData).length > 0) {
          parentUpdateData.updatedAt = sql`CURRENT_TIMESTAMP`;
          await tx.update(parents)
            .set(parentUpdateData)
            .where(eq(parents.id, data.id));
        }

        // Handle address update if provided
        if (data.address || data.addressId) {
          // Address handling would need to be implemented based on your specific requirements
          // This is complex as it involves checking if parent shares address with student, etc.
        }

        // Return updated parent data
        return this.getById(data.id);
      });
    } catch (error: any) {
      console.error('ParentService.update error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update parent'
      };
    }
  }

  // Delete parent (soft delete)
  static async delete(id: number): Promise<ServiceResult> {
    try {
      await db.update(parents)
        .set({
          isDeleted: true,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(parents.id, id));

      return {
        success: true
      };
    } catch (error: any) {
      console.error('ParentService.delete error:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete parent'
      };
    }
  }

  // Enhanced search with filters and pagination
  static async searchParents(
    filters: ParentSearchFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<ServiceResult<PaginatedResult<any>>> {
    try {
      const { searchTerm, branchId, organizationId, hasStudents, excludeStudentId } = filters;
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      let whereConditions = [eq(parents.isDeleted, false)];

      // Add search term conditions
      if (searchTerm && searchTerm.trim()) {
        const searchPattern = `%${searchTerm.trim()}%`;
        whereConditions.push(
          or(
            ilike(personDetails.firstName, searchPattern),
            ilike(personDetails.lastName, searchPattern),
            ilike(personDetails.phone, searchPattern),
            ilike(personDetails.email, searchPattern)
          )!
        );
      }

      // Add filter conditions
      if (branchId) whereConditions.push(eq(parents.branchId, branchId));
      if (organizationId) whereConditions.push(eq(parents.organizationId, organizationId));

      // Filter by hasStudents using a subquery approach
      if (hasStudents !== undefined) {
        if (hasStudents) {
          whereConditions.push(
            sql`EXISTS (
              SELECT 1 FROM ${studentParents} 
              WHERE ${studentParents.parentId} = ${parents.id}
            )`
          );
        } else {
          whereConditions.push(
            sql`NOT EXISTS (
              SELECT 1 FROM ${studentParents} 
              WHERE ${studentParents.parentId} = ${parents.id}
            )`
          );
        }
      }

      // Exclude parents already linked to a specific student
      if (excludeStudentId) {
        whereConditions.push(
          sql`${parents.id} NOT IN (
            SELECT ${studentParents.parentId} 
            FROM ${studentParents} 
            WHERE ${studentParents.studentId} = ${excludeStudentId}
          )`
        );
      }

      // Get total count for pagination
      const [countResult] = await db
        .select({ count: count() })
        .from(parents)
        .innerJoin(personDetails, eq(parents.personDetailId, personDetails.id))
        .where(and(...whereConditions));

      const total = countResult?.count || 0;
      const totalPages = Math.ceil(total / limit);

      // Get paginated results
      const searchResults = await db
        .select({
          id: parents.id,
          organizationId: parents.organizationId,
          branchId: parents.branchId,
          occupation: parents.occupation,
          companyName: parents.companyName,
          createdAt: parents.createdAt,
          // Person details
          firstName: personDetails.firstName,
          lastName: personDetails.lastName,
          phone: personDetails.phone,
          email: personDetails.email,
          profileUrl: personDetails.profileUrl
        })
        .from(parents)
        .innerJoin(personDetails, eq(parents.personDetailId, personDetails.id))
        .where(and(...whereConditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(parents.createdAt));

      return {
        success: true,
        data: {
          data: searchResults,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      };
    } catch (error: any) {
      console.error('ParentService.searchParents error:', error);
      return {
        success: false,
        error: error.message || 'Failed to search parents',
        code: 'SEARCH_ERROR'
      };
    }
  }

  // Unlink parent from student with validation
  static async unlinkFromStudent(studentId: number, parentId: number): Promise<ServiceResult> {
    try {
      // Check if link exists
      const link = await db
        .select({ id: studentParents.id, isPrimary: studentParents.isPrimary })
        .from(studentParents)
        .where(
          and(
            eq(studentParents.studentId, studentId),
            eq(studentParents.parentId, parentId)
          )
        )
        .limit(1);

      if (link.length === 0) {
        return {
          success: false,
          error: 'Parent is not linked to this student',
          code: 'NOT_LINKED'
        };
      }

      const deletedRows = await db.delete(studentParents)
        .where(
          and(
            eq(studentParents.studentId, studentId),
            eq(studentParents.parentId, parentId)
          )
        );

      return {
        success: true,
        data: { deleted: deletedRows }
      };
    } catch (error: any) {
      console.error('ParentService.unlinkFromStudent error:', error);
      return {
        success: false,
        error: error.message || 'Failed to unlink parent from student',
        code: 'UNLINK_ERROR'
      };
    }
  }

  // Get parent statistics
  static async getParentStats(organizationId: number, branchId?: number): Promise<ServiceResult> {
    try {
      let whereClause = and(
        eq(parents.organizationId, organizationId),
        eq(parents.isDeleted, false)
      );

      if (branchId) {
        whereClause = and(whereClause, eq(parents.branchId, branchId));
      }

      const [stats] = await db
        .select({
          totalParents: count(),
          parentsWithStudents: sql<number>`COUNT(DISTINCT CASE WHEN sp.parent_id IS NOT NULL THEN ${parents.id} END)`,
          orphanedParents: sql<number>`COUNT(DISTINCT CASE WHEN sp.parent_id IS NULL THEN ${parents.id} END)`
        })
        .from(parents)
        .leftJoin(studentParents, eq(parents.id, studentParents.parentId))
        .where(whereClause);

      return {
        success: true,
        data: stats
      };
    } catch (error: any) {
      console.error('ParentService.getParentStats error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get parent statistics',
        code: 'STATS_ERROR'
      };
    }
  }

  // Update student-parent relationship
  static async updateStudentParentRelation(
    studentId: number,
    parentId: number,
    updates: Partial<Pick<CreateStudentParentData, 'relationship' | 'isPrimary' | 'canViewReports' | 'canViewFees' | 'contactPriority'>>
  ): Promise<ServiceResult> {
    try {
      // If setting as primary, ensure no other parent is primary for this student
      if (updates.isPrimary) {
        await db
          .update(studentParents)
          .set({ isPrimary: false })
          .where(
            and(
              eq(studentParents.studentId, studentId),
              ne(studentParents.parentId, parentId)
            )
          );
      }

      const [updatedRelation] = await db
        .update(studentParents)
        .set({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .where(
          and(
            eq(studentParents.studentId, studentId),
            eq(studentParents.parentId, parentId)
          )
        )
        .returning();

      if (!updatedRelation) {
        return {
          success: false,
          error: 'Parent-student relationship not found',
          code: 'RELATION_NOT_FOUND'
        };
      }

      return {
        success: true,
        data: updatedRelation
      };
    } catch (error: any) {
      console.error('ParentService.updateStudentParentRelation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update parent-student relationship',
        code: 'UPDATE_RELATION_ERROR'
      };
    }
  }

  // Bulk link parents to student
  static async bulkLinkToStudent(
    studentId: number,
    parentData: Array<Omit<CreateStudentParentData, 'studentId'>>
  ): Promise<ServiceResult> {
    try {
      if (parentData.length === 0) {
        return {
          success: false,
          error: 'No parent data provided',
          code: 'NO_DATA'
        };
      }

      const results = await db.transaction(async (tx) => {
        const linkedParents = [];
        
        for (const data of parentData) {
          // If this is set as primary, ensure no other parent is primary
          if (data.isPrimary) {
            await tx
              .update(studentParents)
              .set({ isPrimary: false })
              .where(eq(studentParents.studentId, studentId));
          }

          const [studentParent] = await tx.insert(studentParents).values({
            studentId,
            parentId: data.parentId,
            relationship: data.relationship?.trim() || null,
            isPrimary: data.isPrimary || false,
            canViewReports: data.canViewReports !== undefined ? data.canViewReports : true,
            canViewFees: data.canViewFees !== undefined ? data.canViewFees : true,
            contactPriority: data.contactPriority || null,
          }).returning();

          linkedParents.push(studentParent);
        }

        return linkedParents;
      });

      return {
        success: true,
        data: results
      };
    } catch (error: any) {
      console.error('ParentService.bulkLinkToStudent error:', error);
      
      if (error.code === '23505') {
        return {
          success: false,
          error: 'One or more parents are already linked to this student',
          code: 'DUPLICATE_LINKS'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to bulk link parents to student',
        code: 'BULK_LINK_ERROR'
      };
    }
  }
}