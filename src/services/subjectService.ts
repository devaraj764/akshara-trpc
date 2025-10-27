import { eq, and, sql, inArray, isNull, or } from 'drizzle-orm';
import db from '../db/index.js';
import { subjects, branches, staff, subjectAssignments, organizations, sections, personDetails } from '../db/schema.js';
import { ServiceResponse } from '../types.db.js';

export interface CreateSubjectData {
  name: string;
  code?: string | undefined;
  shortName?: string | undefined;
  organizationId?: number | undefined;
  isPrivate?: boolean | undefined;
}

export interface UpdateSubjectData {
  name?: string | undefined;
  code?: string | undefined;
  shortName?: string | undefined;
}

export interface GetAllOptions {
  organizationId?: number | undefined;
  branchId?: number | undefined;
  includeTeachers?: boolean | undefined;
  includeStats?: boolean | undefined;
  includeAssignments?: boolean | undefined;
}

export interface CreateSubjectAssignmentData {
  teacherId: number;
  subjectId: number;
  sectionId: number;
}

export class SubjectService {
  static async getAll(options: GetAllOptions = {}): Promise<ServiceResponse<any[]>> {
    try {
      // Build where conditions for subjects
      let whereConditions = [eq(subjects.isDeleted, false)];

      // Filter by organization if specified
      if (options.organizationId) {
        whereConditions.push(eq(subjects.organizationId, options.organizationId));
      }

      if (options.branchId) {
        // If branch ID is specified, get subjects assigned to that branch
        const result = await db.select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          shortName: subjects.shortName,
          organizationId: subjects.organizationId,
          createdAt: subjects.createdAt,
          // Include assignment info
          assignmentId: subjectAssignments.id,
          assignedAt: subjectAssignments.assignedAt,
          // Count assigned teachers if requested
          ...(options.includeStats ? {
            teacherCount: sql<number>`(
              SELECT COUNT(DISTINCT sa.staff_id) FROM ${subjectAssignments} sa
              INNER JOIN ${staff} s ON sa.staff_id = s.id
              WHERE sa.subject_id = ${subjects.id} 
              AND s.branch_id = ${options.branchId}
              AND s.is_active = true
              AND s.employee_type = 'TEACHER'
            )`.as('teacherCount')
          } : {})
        })
          .from(subjects)
          .innerJoin(subjectAssignments, eq(subjectAssignments.subjectId, subjects.id))
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
          .orderBy(subjects.name);

        // If including teachers, fetch them separately for better performance
        let finalResult = result;
        if (options.includeTeachers && result.length > 0) {
          const subjectIds = result.map(s => s.id);

          const subjectTeachersData = await db.select({
            subjectId: subjectAssignments.subjectId,
            teacherId: staff.id,
            teacherName: personDetails.firstName,
            teacherLastName: personDetails.lastName,
            teacherEmail: personDetails.email,
          })
            .from(subjectAssignments)
            .innerJoin(staff, and(
              eq(subjectAssignments.staffId, staff.id),
              eq(staff.branchId, options.branchId),
              eq(staff.employeeType, 'TEACHER'),
              eq(staff.isActive, true)
            ))
            .innerJoin(personDetails, eq(staff.personDetailId, personDetails.id))
            .where(inArray(subjectAssignments.subjectId, subjectIds));

          // Group teachers by subject
          const teachersBySubject = subjectTeachersData.reduce((acc, row) => {
            if (row.subjectId !== null && row.subjectId !== undefined) {
              if (!acc[row.subjectId]) {
                acc[row.subjectId] = [];
              }
              acc[row.subjectId]!.push({
                id: row.teacherId,
                name: `${row.teacherName} ${row.teacherLastName || ''}`.trim(),
                email: row.teacherEmail
              });
            }
            return acc;
          }, {} as Record<number, any[]>);

          finalResult = result.map(subject => ({
            ...subject,
            teachers: teachersBySubject[subject.id] || []
          }));
        }

        return {
          success: true,
          data: finalResult
        };
      } else {
        // Get all organization subjects
        const result = await db.select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          shortName: subjects.shortName,
          organizationId: subjects.organizationId,
          createdAt: subjects.createdAt,
          // Include organization info
          organizationName: organizations.name,
          // Count assigned teachers if requested
          ...(options.includeStats ? {
            teacherCount: sql<number>`(
              SELECT COUNT(DISTINCT sa.staff_id) FROM ${subjectAssignments} sa
              INNER JOIN ${staff} s ON sa.staff_id = s.id
              WHERE sa.subject_id = ${subjects.id}
              AND s.is_active = true
              AND s.employee_type = 'TEACHER'
            )`.as('teacherCount'),
            branchCount: sql<number>`(
              SELECT COUNT(*) FROM ${subjectAssignments} 
              WHERE ${subjectAssignments.subjectId} = ${subjects.id}
            )`.as('branchCount')
          } : {})
        })
          .from(subjects)
          .leftJoin(organizations, eq(subjects.organizationId, organizations.id))
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
          .orderBy(subjects.name);

        // If including teachers, fetch them separately for better performance
        let finalResult = result;
        if (options.includeTeachers && result.length > 0) {
          const subjectIds = result.map(s => s.id);

          const subjectTeachersData = await db.select({
            subjectId: subjectAssignments.subjectId,
            teacherId: staff.id,
            teacherName: personDetails.firstName,
            teacherLastName: personDetails.lastName,
            teacherEmail: personDetails.email
          })
            .from(subjectAssignments)
            .innerJoin(staff, eq(subjectAssignments.staffId, staff.id))
            .innerJoin(personDetails, eq(staff.personDetailId, personDetails.id))
            .where(
              and(
                inArray(subjectAssignments.subjectId, subjectIds),
                eq(staff.employeeType, 'TEACHER'),
                eq(staff.isActive, true)
              )
            );

          // Group teachers by subject
          const teachersBySubject = subjectTeachersData.reduce((acc, row) => {
            if (!acc[row.subjectId]) {
              acc[row.subjectId] = [];
            }
            acc[row.subjectId]?.push({
              id: row.teacherId,
              name: `${row.teacherName} ${row.teacherLastName || ''}`.trim(),
              email: row.teacherEmail
            });
            return acc;
          }, {} as Record<number, any[]>);

          finalResult = result.map(subject => ({
            ...subject,
            teachers: teachersBySubject[subject.id] || []
          }));
        }

        return {
          success: true,
          data: finalResult
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch subjects'
      };
    }
  }

  static async getById(id: number, userBranchId?: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        shortName: subjects.shortName,
        organizationId: subjects.organizationId,
        createdAt: subjects.createdAt,
        organizationName: organizations.name,
      })
        .from(subjects)
        .leftJoin(organizations, eq(subjects.organizationId, organizations.id))
        .where(and(
          eq(subjects.id, id),
          eq(subjects.isDeleted, false)
        ))
        .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Subject not found' };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch subject'
      };
    }
  }

  static async create(data: CreateSubjectData): Promise<ServiceResponse<any>> {
    console.log(data)
    try {
      // Start a transaction to ensure both operations succeed
      return await db.transaction(async (tx) => {
        // Create the subject
        const insertData: CreateSubjectData = {
          name: data.name,
          isPrivate: data.isPrivate ?? false,
        };
        
        if (data.organizationId !== undefined) {
          insertData.organizationId = data.organizationId;
        }
        // Only add optional fields if they have values
        if (data.code) insertData.code = data.code;
        if (data.shortName) insertData.shortName = data.shortName;

        const newSubject = await tx.insert(subjects).values(insertData).returning();

        if (!newSubject || !newSubject[0]) {
          return { success: false, error: 'Failed to create subject' };
        }

        // If it's a private subject for an organization, automatically add to enabled list
        if (data.isPrivate && data.organizationId) {
          // Get current enabled subjects
          const orgResult = await tx.select({ enabledSubjects: organizations.enabledSubjects })
            .from(organizations)
            .where(eq(organizations.id, data.organizationId))
            .limit(1);

          if (!orgResult || !orgResult[0]) {
            return { success: false, error: 'Failed to add subject to organization' };
          }

          if (orgResult.length > 0) {
            const currentEnabled = orgResult[0].enabledSubjects || [];
            const newEnabled = [...currentEnabled, newSubject[0].id];

            // Update organization's enabled subjects
            await tx.update(organizations)
              .set({ enabledSubjects: newEnabled })
              .where(eq(organizations.id, data.organizationId));
          }
        }

        return {
          success: true,
          data: newSubject[0]
        };;
      });


    } catch (error: any) {
      console.log(error)
      return {
        success: false,
        error: error.message || 'Failed to create subject'
      };
    }
  }

  static async update(id: number, data: UpdateSubjectData, userRole?: string, userOrganizationId?: number): Promise<ServiceResponse<any>> {
    try {
      // Check if the subject exists and get its organization info
      const existing = await db.select({ organizationId: subjects.organizationId })
        .from(subjects)
        .where(and(eq(subjects.id, id), eq(subjects.isDeleted, false)))
        .limit(1);

      if (existing.length === 0) {
        return { success: false, error: 'Subject not found' };
      }

      const existingSubject = existing[0];

      // Prevent non-SUPER_ADMIN users from editing global subjects (organizationId = null)
      if (userRole !== 'SUPER_ADMIN' && existingSubject!.organizationId === null) {
        return { success: false, error: 'Cannot edit global subjects. Only super admins can modify global entities.' };
      }

      // For organization-specific subjects, ensure user can only edit subjects from their organization
      if (userRole !== 'SUPER_ADMIN' && userOrganizationId && existingSubject!.organizationId !== userOrganizationId) {
        return { success: false, error: 'Access denied' };
      }

      const result = await db.update(subjects)
        .set(data)
        .where(eq(subjects.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Subject not found' };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update subject'
      };
    }
  }

  static async delete(id: number, userRole?: string, userOrganizationId?: number): Promise<ServiceResponse<any>> {
    try {
      // Check if the subject exists and get its organization info
      const existing = await db.select({ organizationId: subjects.organizationId })
        .from(subjects)
        .where(and(eq(subjects.id, id), eq(subjects.isDeleted, false)))
        .limit(1);

      if (existing.length === 0) {
        return { success: false, error: 'Subject not found' };
      }

      const existingSubject = existing[0];

      // Prevent non-SUPER_ADMIN users from deleting global subjects (organizationId = null)
      if (userRole !== 'SUPER_ADMIN' && existingSubject!.organizationId === null) {
        return { success: false, error: 'Cannot delete global subjects. Only super admins can modify global entities.' };
      }

      // For organization-specific subjects, ensure user can only delete subjects from their organization
      if (userRole !== 'SUPER_ADMIN' && userOrganizationId && existingSubject!.organizationId !== userOrganizationId) {
        return { success: false, error: 'Access denied' };
      }

      const result = await db.update(subjects)
        .set({ isDeleted: true })
        .where(eq(subjects.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Subject not found' };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete subject'
      };
    }
  }

  // Subject Assignment methods for teacher-subject-section
  static async createAssignment(data: CreateSubjectAssignmentData): Promise<ServiceResponse<any>> {
    try {
      const result = await db.insert(subjectAssignments).values({
        staffId: data.teacherId, // Using teacherId parameter but mapping to staffId field
        subjectId: data.subjectId,
        sectionId: data.sectionId
      }).returning();

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create subject assignment'
      };
    }
  }

  static async deleteAssignment(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.delete(subjectAssignments)
        .where(eq(subjectAssignments.id, id))
        .returning();

      return {
        success: true,
        data: result[0] || null
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete subject assignment'
      };
    }
  }

  static async getAssignmentsByBranch(branchId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: subjectAssignments.id,
        teacherId: subjectAssignments.staffId, // Map staffId to teacherId for backwards compatibility
        subjectId: subjectAssignments.subjectId,
        sectionId: subjectAssignments.sectionId,
        assignedAt: subjectAssignments.assignedAt,
        // Subject info
        subjectName: subjects.name,
        subjectCode: subjects.code,
        subjectShortName: subjects.shortName,
        // Teacher info
        teacherName: personDetails.firstName,
        teacherLastName: personDetails.lastName,
        teacherEmail: personDetails.email,
        // Section info
        sectionName: sections.name,
        sectionCapacity: sections.capacity
      })
        .from(subjectAssignments)
        .innerJoin(subjects, eq(subjectAssignments.subjectId, subjects.id))
        .innerJoin(staff, eq(subjectAssignments.staffId, staff.id))
        .innerJoin(personDetails, eq(staff.personDetailId, personDetails.id))
        .innerJoin(sections, eq(subjectAssignments.sectionId, sections.id))
        .where(and(
          eq(staff.branchId, branchId),
          eq(sections.branchId, branchId),
          eq(subjects.isDeleted, false),
          eq(staff.employeeType, 'TEACHER'),
          eq(staff.isActive, true),
          eq(sections.isDeleted, false)
        ))
        .orderBy(subjects.name, sections.name);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch branch assignments'
      };
    }
  }

  // Teacher assignment methods (unchanged since they work with organization-level subjects)
  static async assignTeacher(subjectId: number, teacherId: number, sectionId: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.insert(subjectAssignments).values({
        subjectId,
        staffId: teacherId,
        sectionId
      }).returning();

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to assign teacher'
      };
    }
  }

  static async unassignTeacher(subjectId: number, teacherId: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.delete(subjectAssignments)
        .where(and(
          eq(subjectAssignments.subjectId, subjectId),
          eq(subjectAssignments.staffId, teacherId)
        ))
        .returning();

      return {
        success: true,
        data: result[0] || null
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to unassign teacher'
      };
    }
  }

  static async getSubjectsByTeacher(teacherId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        shortName: subjects.shortName,
        assignedAt: subjectAssignments.assignedAt,
        sectionId: subjectAssignments.sectionId,
      })
        .from(subjectAssignments)
        .innerJoin(subjects, eq(subjectAssignments.subjectId, subjects.id))
        .where(and(
          eq(subjectAssignments.staffId, teacherId),
          eq(subjects.isDeleted, false)
        ))
        .orderBy(subjects.name);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch teacher subjects'
      };
    }
  }

  static async restore(id: number, organizationId?: number): Promise<ServiceResponse<any>> {
    try {
      console.log('Restoring subject with ID:', id);
      
      // First get the subject to check if it exists and get organization info
      const subjectResult = await db.select({
        id: subjects.id,
        name: subjects.name,
        organizationId: subjects.organizationId,
        isDeleted: subjects.isDeleted,
        isPrivate: subjects.isPrivate
      })
      .from(subjects)
      .where(eq(subjects.id, id))
      .limit(1);

      if (subjectResult.length === 0) {
        return {
          success: false,
          error: 'Subject not found'
        };
      }

      const subject = subjectResult[0];
      console.log('Subject found:', subject);
      if(!subject?.isDeleted) {
        return {
          success: false,
          error: 'Subject is not deleted'
        };
      }

      // For private subjects, they must be deleted to restore
      if (subject.isPrivate && subject.organizationId) {
        if (!subject.isDeleted) {
          return {
            success: false,
            error: 'Private subject is not deleted'
          };
        }
        
        // Check for name conflicts
        const existingSubject = await db.select()
          .from(subjects)
          .where(and(
            eq(subjects.name, subject.name),
            eq(subjects.organizationId, subject.organizationId),
            eq(subjects.isDeleted, false)
          ))
          .limit(1);
          
        if (existingSubject.length > 0) {
          return {
            success: false,
            error: 'A subject with this name already exists in the organization'
          };
        }
      }

      // For global subjects, we need organizationId to add them back to enabled list
      if (!subject.isPrivate && !organizationId) {
        return {
          success: false,
          error: 'Organization ID is required to restore global subject'
        };
      }

      // Use transaction to restore subject and add to enabled list
      const result = await db.transaction(async (tx) => {
        let restoredSubject = subject;
        
        // Step 1: For private subjects, restore the subject (set isDeleted = false)
        if (subject.isPrivate && subject.organizationId && subject.isDeleted) {
          const restored = await tx.update(subjects)
            .set({ 
              isDeleted: false
            })
            .where(eq(subjects.id, id))
            .returning();

          console.log('Private subject restored:', restored[0]);
          if (restored[0]) {
            restoredSubject = restored[0];
          }
        }

        // Step 2: Add subject back to organization's enabled list
        const targetOrgId = organizationId || subject.organizationId;
        if (targetOrgId) {
          const orgResult = await tx.select({ enabledSubjects: organizations.enabledSubjects })
            .from(organizations)
            .where(eq(organizations.id, targetOrgId))
            .limit(1);

          if (orgResult && orgResult[0]) {
            const currentEnabled = orgResult[0].enabledSubjects || [];
            
            // Only add if not already in enabled list
            if (!currentEnabled.includes(id)) {
              const newEnabled = [...currentEnabled, id];
              
              await tx.update(organizations)
                .set({ enabledSubjects: newEnabled })
                .where(eq(organizations.id, targetOrgId));
                
              console.log('Added subject to enabled list for organization:', targetOrgId);
            } else {
              console.log('Subject already in enabled list');
            }
          }
        }

        return restoredSubject;
      });

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('Error in restore (subjects):', error);
      return {
        success: false,
        error: error.message || 'Failed to restore subject'
      };
    }
  }

  // Get enabled subjects for an organization (both global and private)
  static async getEnabledForOrganization(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      console.log('getEnabledForOrganization (subjects) called with organizationId:', organizationId);
      
      // First get the organization's enabled subjects list
      const orgResult = await db.select({ enabledSubjects: organizations.enabledSubjects })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!orgResult || !orgResult[0]) {
        return {
          success: false,
          error: 'Organization not found'
        };
      }

      const enabledIds = orgResult[0].enabledSubjects || [];
      console.log('Enabled subject IDs:', enabledIds);
      
      // Include ALL subjects that either:
      // 1. Are in the enabled list (global + enabled private subjects)
      // 2. OR belong to this organization (all org subjects including deleted ones)
      const conditions = [];
      
      // Add enabled subjects condition
      if (enabledIds.length > 0) {
        conditions.push(inArray(subjects.id, enabledIds));
        console.log('Added condition for enabled subjects');
      }
      
      // Add organization-owned subjects condition (including deleted ones)
      conditions.push(eq(subjects.organizationId, organizationId));
      console.log('Added condition for ALL organization subjects');
      
      // Use OR to combine both conditions
      const finalCondition = conditions.length > 1 ? or(...conditions) : conditions[0];
      console.log('Using OR condition to combine enabled + organization subjects');

      const result = await db.select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        shortName: subjects.shortName,
        organizationId: subjects.organizationId,
        isPrivate: subjects.isPrivate,
        isDeleted: subjects.isDeleted,
        createdAt: subjects.createdAt,
        organizationName: organizations.name,
      })
        .from(subjects)
        .leftJoin(organizations, eq(subjects.organizationId, organizations.id))
        .where(finalCondition)
        .orderBy(subjects.isDeleted, subjects.name);

      console.log('Query result (subjects):', result.length, 'subjects found');
      console.log('Result preview (subjects):', result.map(s => ({ id: s.id, name: s.name, isDeleted: s.isDeleted, organizationId: s.organizationId })));

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('Error in getEnabledForOrganization (subjects):', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch enabled subjects'
      };
    }
  }

  // Get all global subjects (for selection by org admin)
  static async getGlobal(): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        shortName: subjects.shortName,
        organizationId: subjects.organizationId,
        isPrivate: subjects.isPrivate,
        createdAt: subjects.createdAt,
      })
        .from(subjects)
        .where(and(
          eq(subjects.isDeleted, false),
          eq(subjects.isPrivate, false),
          isNull(subjects.organizationId)
        ))
        .orderBy(subjects.name);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch global subjects'
      };
    }
  }

  // Get private subjects for an organization
  static async getPrivateForOrganization(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        shortName: subjects.shortName,
        organizationId: subjects.organizationId,
        isPrivate: subjects.isPrivate,
        createdAt: subjects.createdAt,
      })
        .from(subjects)
        .where(and(
          eq(subjects.isDeleted, false),
          eq(subjects.isPrivate, true),
          eq(subjects.organizationId, organizationId)
        ))
        .orderBy(subjects.name);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch private subjects'
      };
    }
  }

  // Check removal info - determines if subject should be deleted or just removed from enabled list
  static async checkRemoval(subjectId: number, organizationId: number): Promise<ServiceResponse<any>> {
    try {
      // First, get the subject to check if it's private or global
      const subjectResult = await this.getById(subjectId);
      if (!subjectResult.success) {
        return { success: false, error: 'Subject not found' };
      }

      const subject = subjectResult.data;
      if (!subject) {
        return { success: false, error: 'Subject not found' };
      }
      const isPrivate = subject.organizationId !== null;
      
      // Check if subject is currently used by any subject assignments (teacher assignments)
      const usageResult = await db.select({
        count: sql`COUNT(*)`.as('count')
      })
        .from(subjectAssignments)
        .where(eq(subjectAssignments.subjectId, subjectId));

      const usageCount = parseInt(usageResult[0]?.count as string) || 0;
      const hasUsage = usageCount > 0;

      let willDelete = false;
      let message = '';

      if (isPrivate) {
        // Check if user belongs to same organization
        if (subject.organizationId === organizationId) {
          willDelete = true;
          message = hasUsage 
            ? `This private subject will be permanently deleted. ${usageCount} teacher assignment${usageCount !== 1 ? 's' : ''} currently use this subject.`
            : 'This private subject will be permanently deleted from your organization.';
        } else {
          return { 
            success: false, 
            error: 'You do not have permission to delete this subject' 
          };
        }
      } else {
        // Global subject - just remove from enabled list
        willDelete = false;
        message = hasUsage
          ? `This subject will be removed from your organization's enabled subjects. ${usageCount} teacher assignment${usageCount !== 1 ? 's' : ''} currently use this subject and should be reassigned.`
          : 'This subject will be removed from your organization\'s enabled subjects.';
      }

      return {
        success: true,
        data: {
          willDelete,
          hasUsage,
          usageCount,
          message,
          isPrivate,
          subjectName: subject.name
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to check removal info' };
    }
  }

  // Remove or delete subject based on ownership and usage
  static async removeOrDelete(subjectId: number, organizationId: number): Promise<ServiceResponse<any>> {
    try {
      return await db.transaction(async (tx) => {
        // First check what action should be taken
        const checkResult = await this.checkRemoval(subjectId, organizationId);
        if (!checkResult.success) {
          return checkResult;
        }

        const { willDelete, hasUsage, usageCount } = checkResult.data;

        if (willDelete) {
          // Private subject - delete it entirely
          if (hasUsage) {
            // Remove subject assignments first
            await tx.delete(subjectAssignments)
              .where(eq(subjectAssignments.subjectId, subjectId));
            console.warn(`Deleted ${usageCount} subject assignments for subject ${subjectId}`);
          }

          // Remove from all organizations' enabled lists first
          const orgsWithThisSubject = await tx.select({
            id: organizations.id,
            enabledSubjects: organizations.enabledSubjects
          })
            .from(organizations)
            .where(sql`${subjectId} = ANY(${organizations.enabledSubjects})`);

          for (const org of orgsWithThisSubject) {
            const updatedEnabled = (org.enabledSubjects || []).filter(id => id !== subjectId);
            await tx.update(organizations)
              .set({ enabledSubjects: updatedEnabled })
              .where(eq(organizations.id, org.id));
          }

          // Soft delete the subject
          const deleteResult = await tx.update(subjects)
            .set({ isDeleted: true })
            .where(eq(subjects.id, subjectId))
            .returning();

          return {
            success: true,
            data: {
              action: 'deleted',
              subject: deleteResult[0],
              message: `Subject permanently deleted${hasUsage ? ` (removed ${usageCount} teacher assignments)` : ''}`
            }
          };
        } else {
          // Global subject - just remove from organization's enabled list
          const orgResult = await tx.select({ enabledSubjects: organizations.enabledSubjects })
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1);

          if (orgResult.length === 0) {
            return { success: false, error: 'Organization not found' };
          }

          const currentEnabled = orgResult[0]?.enabledSubjects || [];
          const updatedEnabled = currentEnabled.filter(id => id !== subjectId);

          await tx.update(organizations)
            .set({ enabledSubjects: updatedEnabled })
            .where(eq(organizations.id, organizationId));

          return {
            success: true,
            data: {
              action: 'removed',
              enabledSubjects: updatedEnabled,
              message: `Subject removed from organization${hasUsage ? ` (was used by ${usageCount} teacher assignments)` : ''}`
            }
          };
        }
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to remove or delete subject' };
    }
  }
}