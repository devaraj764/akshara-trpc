import db from '../db/index.js';
import { parents, studentParents, students } from '../db/schema.js';
import { eq, and, desc, or, ilike, ne, sql, count } from 'drizzle-orm';

export interface CreateParentData {
  organizationId: number;
  branchId: number;
  firstName: string;
  phone: string; // Now required
  relationship: string; // Now required
  lastName?: string | undefined;
  email?: string | undefined;
  address?: string | undefined;
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
  address?: string | undefined;
  occupation?: string | undefined;
  companyName?: string | undefined;
  annualIncome?: number | undefined;
  relationship?: string | undefined;
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
    if (!data.relationship?.trim()) return 'Relationship is required';
    if (!data.organizationId || data.organizationId <= 0) return 'Valid organization ID is required';
    if (!data.branchId || data.branchId <= 0) return 'Valid branch ID is required';
    
    // Validate phone number format (basic validation)
    const phoneRegex = /^[+]?[0-9\s\-\(\)]{7,}$/;
    if (!phoneRegex.test(data.phone)) return 'Invalid phone number format';
    
    // Validate email if provided
    if (data.email && data.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) return 'Invalid email format';
    }
    
    return null;
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

      // Check for duplicate phone number in the same organization
      const existingParent = await db
        .select({ id: parents.id })
        .from(parents)
        .where(
          and(
            eq(parents.organizationId, data.organizationId),
            eq(parents.phone, data.phone.trim()),
            eq(parents.isDeleted, false)
          )
        )
        .limit(1);

      if (existingParent.length > 0) {
        return {
          success: false,
          error: 'A parent with this phone number already exists in the organization',
          code: 'DUPLICATE_PHONE'
        };
      }

      const [parent] = await db.insert(parents).values({
        organizationId: data.organizationId,
        branchId: data.branchId,
        firstName: data.firstName.trim(),
        lastName: data.lastName?.trim() || null,
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        occupation: data.occupation?.trim() || null,
        companyName: data.companyName?.trim() || null,
        annualIncome: data.annualIncome || null,
        relationship: data.relationship.trim(),
      }).returning();

      return {
        success: true,
        data: parent
      };
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
      return await db.transaction(async (tx) => {
        // Create parent
        const [parent] = await tx.insert(parents).values({
          organizationId: parentData.organizationId,
          branchId: parentData.branchId,
          firstName: parentData.firstName,
          lastName: parentData.lastName,
          phone: parentData.phone,
          email: parentData.email,
          address: parentData.address,
          occupation: parentData.occupation,
          companyName: parentData.companyName,
          annualIncome: parentData.annualIncome,
          relationship: parentData.relationship,
        }).returning();

        // Link to student
        const [studentParent] = await tx.insert(studentParents).values({
          studentId: studentId,
          parentId: parent!.id,
          relationship: linkData?.relationship || parentData.relationship,
          isPrimary: linkData?.isPrimary || false,
          canViewReports: linkData?.canViewReports || true,
          canViewFees: linkData?.canViewFees || true,
          contactPriority: linkData?.contactPriority,
        }).returning();

        return {
          success: true,
          data: {
            parent,
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
      const parent = await db.select().from(parents).where(eq(parents.id, id)).limit(1);

      if (parent.length === 0) {
        return {
          success: false,
          error: 'Parent not found'
        };
      }

      return {
        success: true,
        data: parent[0]
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
          firstName: parents.firstName,
          lastName: parents.lastName,
          phone: parents.phone,
          email: parents.email,
          address: parents.address,
          occupation: parents.occupation,
          companyName: parents.companyName,
          profileUrl: parents.profileUrl,
          annualIncome: parents.annualIncome,
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
      const [updatedParent] = await db.update(parents)
        .set({
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email,
          address: data.address,
          occupation: data.occupation,
          companyName: data.companyName,
          annualIncome: data.annualIncome,
          relationship: data.relationship,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(parents.id, data.id))
        .returning();

      return {
        success: true,
        data: updatedParent
      };
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
            ilike(parents.firstName, searchPattern),
            ilike(parents.lastName, searchPattern),
            ilike(parents.phone, searchPattern),
            ilike(parents.email, searchPattern)
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
        .where(and(...whereConditions));

      const total = countResult?.count || 0;
      const totalPages = Math.ceil(total / limit);

      // Get paginated results
      const searchResults = await db
        .select({
          id: parents.id,
          firstName: parents.firstName,
          lastName: parents.lastName,
          phone: parents.phone,
          email: parents.email,
          address: parents.address,
          occupation: parents.occupation,
          companyName: parents.companyName,
          profileUrl: parents.profileUrl,
          relationship: parents.relationship,
          createdAt: parents.createdAt
        })
        .from(parents)
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