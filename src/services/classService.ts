import { eq, and, sql, isNull, inArray } from 'drizzle-orm';
import db from '../db/index.js';
import { classes, sections, branches, organizations, staff, personDetails } from '../db/schema.js';
import { ServiceResponse } from '../types.db.js';

export interface CreateClassData {
  name: string;
  displayName?: string | undefined;
  gradeLevel: number;
  level: 'Primary' | 'Middle School' | 'High School' | 'Senior Secondary';
  description?: string | undefined;
  organizationId?: number | undefined;
  branchId?: number | undefined;
  isPrivate?: boolean | undefined;
}

export interface UpdateClassData {
  name?: string | undefined;
  displayName?: string | undefined;
  gradeLevel?: number | undefined;
  level?: 'Primary' | 'Middle School' | 'High School' | 'Senior Secondary' | undefined;
  description?: string | undefined;
  isPrivate?: boolean | undefined;
}

export interface CreateSectionData {
  classId: number;
  name: string;
  capacity?: number | undefined;
  branchId: number;
  classTeacherId?: number | undefined;
}

export interface UpdateSectionData {
  name?: string | undefined;
  capacity?: number | undefined;
  classTeacherId?: number | undefined;
}

export interface GetAllOptions {
  includeSections?: boolean;
  includeBranches?: boolean;
  organizationId?: number;
}

export class ClassService {
  private static mapGradeLevelToLevel(gradeLevel: number): string {
    if (gradeLevel <= 5) return 'Primary';
    if (gradeLevel <= 8) return 'Middle School';
    if (gradeLevel <= 10) return 'High School';
    return 'Senior Secondary';
  }

  static async getAll(options: GetAllOptions = {}): Promise<ServiceResponse<any[]>> {
    try {
      // For now, return classes from any branch within the organization
      // In a real system, we'd need to implement organization-level classes
      let query = db.select({
        id: classes.id,
        name: classes.name,
        displayName: classes.displayName,
        gradeLevel: classes.order,
        level: sql<string>`
          CASE 
            WHEN ${classes.order} <= 5 THEN 'Primary'
            WHEN ${classes.order} <= 8 THEN 'Middle School'
            WHEN ${classes.order} <= 10 THEN 'High School'
            ELSE 'Senior Secondary'
          END
        `.as('level'),
        branchId: classes.branchId,
        organizationId: classes.organizationId,
        isPrivate: classes.isPrivate,
        createdAt: classes.createdAt,
        // Count sections if requested
        ...(options.includeSections ? {
          sectionCount: sql<number>`(
            SELECT COUNT(*) FROM ${sections} 
            WHERE ${sections.classId} = ${classes.id}
          )`.as('sectionCount')
        } : {})
      }).from(classes).where(eq(classes.isDeleted, false));

      let result = await query;

      // If including sections, fetch them separately
      if (options.includeSections && result.length > 0) {
        const classIds = result.map(r => r.id);
        
        const sectionsData = await db.select({
          id: sections.id,
          name: sections.name,
          capacity: sections.capacity,
          classId: sections.classId,
          branchId: sections.branchId,
          ...(options.includeBranches ? {
            branchName: branches.name,
            branchCode: branches.code,
          } : {})
        })
        .from(sections)
        .leftJoin(branches, eq(sections.branchId, branches.id))
        .where(and(
          sql`${sections.classId} IN (${sql.join(classIds.map(id => sql`${id}`), sql`, `)})`,
          eq(sections.isDeleted, false)
        ));

        // Attach sections to classes
        const enrichedResult = result.map(classItem => ({
          ...classItem,
          sections: sectionsData.filter(section => section.classId === classItem.id).map(section => ({
            id: section.id,
            name: section.name,
            capacity: section.capacity,
            branchId: section.branchId,
            ...(options.includeBranches ? {
              branch: {
                name: section.branchName,
                code: section.branchCode,
              }
            } : {})
          })),
          _count: {
            sections: sectionsData.filter(section => section.classId === classItem.id).length
          }
        }));

        return { success: true, data: enrichedResult };
      }

      // Add section count for display
      const enrichedResult = result.map(classItem => ({
        ...classItem,
        _count: {
          sections: classItem.sectionCount || 0
        }
      }));

      return { success: true, data: enrichedResult };
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      return { success: false, error: error.message || 'Failed to fetch classes' };
    }
  }

  static async getById(id: number, includeSections: boolean = false): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: classes.id,
        name: classes.name,
        displayName: classes.displayName,
        gradeLevel: classes.order,
        branchId: classes.branchId,
        organizationId: classes.organizationId,
        isPrivate: classes.isPrivate,
        createdAt: classes.createdAt,
      }).from(classes).where(eq(classes.id, id)).limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Class not found' };
      }

      const classItem = result[0];
      let enrichedClass = { ...classItem };

      if (includeSections) {
        const sectionsData = await db.select({
          id: sections.id,
          name: sections.name,
          capacity: sections.capacity,
          branchId: sections.branchId,
        }).from(sections).where(eq(sections.classId, id));

        enrichedClass = {
          ...enrichedClass,
          sections: sectionsData,
          _count: { sections: sectionsData.length }
        } as any;
      }

      return { success: true, data: enrichedClass };
    } catch (error: any) {
      console.error('Error fetching class by ID:', error);
      return { success: false, error: error.message || 'Failed to fetch class' };
    }
  }

  static async create(data: CreateClassData): Promise<ServiceResponse<any>> {
    try {
      // Start a transaction to ensure both operations succeed
      const result = await db.transaction(async (tx) => {
        // Create the grade/class
        const insertData: any = {
          name: data.name,
          displayName: data.displayName || data.name,
          order: data.gradeLevel,
          organizationId: data.organizationId || null,
          isPrivate: data.isPrivate || false,
        };
        
        // Only add branchId if it has a value
        if (data.branchId) insertData.branchId = data.branchId;
        
        const newClass = await tx.insert(classes).values(insertData).returning();

        if (!newClass || !newClass[0]) {
          return { success: false, error: 'Failed to create class' };
        }

        // If it's a private class for an organization, automatically add to enabled list
        if (data.isPrivate && data.organizationId) {
          // Get current enabled classes
          const orgResult = await tx.select({ enabledClasses: organizations.enabledClasses })
            .from(organizations)
            .where(eq(organizations.id, data.organizationId))
            .limit(1);

          if (!orgResult || !orgResult[0]) {
            return { success: false, error: 'Organization not found' };
          }
          

          if (orgResult.length > 0) {
            const currentEnabled = orgResult[0].enabledClasses || [];
            const newEnabled = [...currentEnabled, newClass[0].id];
            
            // Update organization's enabled classes
            await tx.update(organizations)
              .set({ enabledClasses: newEnabled })
              .where(eq(organizations.id, data.organizationId));
          }
        }

        // Map the database result to match frontend expectations
        const mappedResult = {
          ...newClass[0],
          gradeLevel: newClass[0]!.order,
          level: this.mapGradeLevelToLevel(newClass[0]!.order || 1)
        };

        return mappedResult;
      });

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error creating class:', error);
      return { success: false, error: error.message || 'Failed to create class' };
    }
  }

  static async update(id: number, data: UpdateClassData, userRole?: string, userOrganizationId?: number): Promise<ServiceResponse<any>> {
    try {
      // Check if the class exists and get its organization info
      const existing = await db.select({ 
        id: classes.id, 
        organizationId: classes.organizationId 
      })
        .from(classes)
        .where(and(eq(classes.id, id), eq(classes.isDeleted, false)))
        .limit(1);

      if (existing.length === 0) {
        return { success: false, error: 'Class not found' };
      }

      const existingClass = existing[0];

      // Prevent non-SUPER_ADMIN users from editing global classes (organizationId = null)
      if (userRole !== 'SUPER_ADMIN' && existingClass!.organizationId === null) {
        return { success: false, error: 'Cannot edit global classes. Only super admins can modify global entities.' };
      }

      // For organization-specific classes, ensure user can only edit classes from their organization
      if (userRole !== 'SUPER_ADMIN' && userOrganizationId && existingClass!.organizationId !== userOrganizationId) {
        return { success: false, error: 'Access denied' };
      }

      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.displayName !== undefined) updateData.displayName = data.displayName;
      if (data.gradeLevel !== undefined) updateData.order = data.gradeLevel;
      // Note: level is auto-calculated from gradeLevel, not stored in DB

      const updatedClass = await db.update(classes)
        .set(updateData)
        .where(eq(classes.id, id))
        .returning();

      if (updatedClass.length === 0) {
        return { success: false, error: 'Class not found' };
      }

      // Map the database result to match frontend expectations
      const mappedResult = {
        ...updatedClass[0],
        gradeLevel: updatedClass[0]!.order,
        // Use provided level if available, otherwise auto-calculate
        level: data.level || this.mapGradeLevelToLevel(updatedClass[0]!.order || 1)
      };
      
      return { success: true, data: mappedResult };
    } catch (error: any) {
      console.error('Error updating class:', error);
      return { success: false, error: error.message || 'Failed to update class' };
    }
  }

  static async delete(id: number, userRole?: string, userOrganizationId?: number): Promise<ServiceResponse<void>> {
    try {
      // Check if the class exists and get its organization info
      const existing = await db.select({ 
        id: classes.id, 
        organizationId: classes.organizationId 
      })
        .from(classes)
        .where(and(eq(classes.id, id), eq(classes.isDeleted, false)))
        .limit(1);

      if (existing.length === 0) {
        return { success: false, error: 'Class not found' };
      }

      const existingClass = existing[0];

      // Prevent non-SUPER_ADMIN users from deleting global classes (organizationId = null)
      if (userRole !== 'SUPER_ADMIN' && existingClass!.organizationId === null) {
        return { success: false, error: 'Cannot delete global classes. Only super admins can modify global entities.' };
      }

      // For organization-specific classes, ensure user can only delete classes from their organization
      if (userRole !== 'SUPER_ADMIN' && userOrganizationId && existingClass!.organizationId !== userOrganizationId) {
        return { success: false, error: 'Access denied' };
      }

      // Check if there are active sections using this grade
      const existingSections = await db.select().from(sections).where(and(
        eq(sections.classId, id),
        eq(sections.isDeleted, false)
      )).limit(1);
      
      if (existingSections.length > 0) {
        return { success: false, error: 'Cannot delete class with existing sections' };
      }

      // Soft delete the grade
      await db.update(classes)
        .set({ isDeleted: true })
        .where(eq(classes.id, id));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting class:', error);
      return { success: false, error: error.message || 'Failed to delete class' };
    }
  }

  // Section Management Methods
  static async getSectionsByBranch(branchId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: sections.id,
        name: sections.name,
        capacity: sections.capacity,
        classId: sections.classId,
        branchId: sections.branchId,
        gradeName: classes.name,
        gradeDisplayName: classes.displayName,
        gradeOrder: classes.order,
      }).from(sections)
      .leftJoin(classes, eq(sections.classId, classes.id))
      .where(and(
        eq(sections.branchId, branchId),
        eq(sections.isDeleted, false),
        eq(classes.isDeleted, false)
      ))
      .orderBy(classes.order, sections.name);

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error fetching sections by branch:', error);
      return { success: false, error: error.message || 'Failed to fetch sections' };
    }
  }

  static async getSectionsByClass(classId: number, branchId: number, includeDeleted: boolean = false): Promise<ServiceResponse<any[]>> {
    try {
      // Build the where condition based on includeDeleted parameter
      let whereCondition = and(
        eq(sections.classId, classId),
        eq(sections.branchId, branchId)
      );

      // Only filter out deleted sections if includeDeleted is false
      if (!includeDeleted) {
        whereCondition = and(whereCondition, eq(sections.isDeleted, false));
      }

      const result = await db.select({
        id: sections.id,
        name: sections.name,
        capacity: sections.capacity,
        classId: sections.classId,
        branchId: sections.branchId,
        organizationId: sections.organizationId,
        isDeleted: sections.isDeleted,
        createdAt: sections.createdAt,
        classTeacherId: sections.classTeacherId,
        teacher: {
          id: staff.id,
          name: sql<string>`CONCAT(${personDetails.firstName}, ' ', COALESCE(${personDetails.lastName}, ''))`.as('fullName')
        },
        // Add student count if needed
        _count: {
          students: sql<number>`(
            SELECT COUNT(*) FROM enrollments 
            WHERE enrollments.section_id = ${sections.id} 
            AND enrollments.is_deleted = false
          )`.as('studentCount')
        }
      })
      .from(sections)
      .leftJoin(staff, eq(sections.classTeacherId, staff.id))
      .leftJoin(classes, eq(sections.classId, classes.id))
      .leftJoin(branches, eq(sections.branchId, branches.id))
      .leftJoin(personDetails, eq(staff.personDetailId, personDetails.id))
      .where(and(
        whereCondition,
        eq(classes.isDeleted, false),
        eq(branches.status, "ACTIVE")
      ))

      .orderBy(sections.name);

      // Map the result to include proper structure
      const mappedResult = result.map(section => ({
        ...section,
        _count: {
          students: section._count?.students || 0
        }
      }));

      return { success: true, data: mappedResult };
    } catch (error: any) {
      console.error('Error fetching sections:', error);
      return { success: false, error: error.message || 'Failed to fetch sections' };
    }
  }

  static async createSection(data: CreateSectionData): Promise<ServiceResponse<any>> {
    try {
      // Check if section name already exists in this grade and branch (excluding soft-deleted)
      const existing = await db.select().from(sections).where(and(
        eq(sections.classId, data.classId),
        eq(sections.branchId, data.branchId),
        eq(sections.name, data.name),
        eq(sections.isDeleted, false)
      )).limit(1);

      if (existing.length > 0) {
        return { success: false, error: 'Section name already exists in this class and branch' };
      }

      // Get organization ID from the branch
      const branchResult = await db.select({ organizationId: branches.organizationId })
        .from(branches)
        .where(eq(branches.id, data.branchId))
        .limit(1);
      
      if (branchResult.length === 0) {
        return { success: false, error: 'Branch not found' };
      }

      const newSection = await db.insert(sections).values({
        classId: data.classId,
        name: data.name,
        capacity: data.capacity || null,
        branchId: data.branchId,
        organizationId: branchResult[0]!.organizationId,
        classTeacherId: data.classTeacherId || null,
      }).returning();

      if (newSection.length === 0) {
        return { success: false, error: 'Failed to create section' };
      }

      return { success: true, data: newSection[0] };
    } catch (error: any) {
      console.error('Error creating section:', error);
      return { success: false, error: error.message || 'Failed to create section' };
    }
  }

  static async updateSection(id: number, data: UpdateSectionData, userBranchId: number): Promise<ServiceResponse<any>> {
    try {
      // Verify section belongs to user's branch and is not soft-deleted
      const section = await db.select().from(sections).where(and(
        eq(sections.id, id),
        eq(sections.isDeleted, false)
      )).limit(1);
      
      if (section.length === 0) {
        return { success: false, error: 'Section not found' };
      }

      if (section[0]!.branchId !== userBranchId) {
        return { success: false, error: 'Cannot modify section from different branch' };
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.capacity !== undefined) updateData.capacity = data.capacity;
      if (data.classTeacherId !== undefined) updateData.classTeacherId = data.classTeacherId;

      const updatedSection = await db.update(sections)
        .set(updateData)
        .where(eq(sections.id, id))
        .returning();

      return { success: true, data: updatedSection[0] };
    } catch (error: any) {
      console.error('Error updating section:', error);
      return { success: false, error: error.message || 'Failed to update section' };
    }
  }

  static async deleteSection(id: number, userBranchId: number): Promise<ServiceResponse<void>> {
    try {
      // Verify section belongs to user's branch and is not already soft-deleted
      const section = await db.select().from(sections).where(and(
        eq(sections.id, id),
        eq(sections.isDeleted, false)
      )).limit(1);
      
      if (section.length === 0) {
        return { success: false, error: 'Section not found' };
      }

      if (section[0]!.branchId !== userBranchId) {
        return { success: false, error: 'Cannot delete section from different branch' };
      }

      // Soft delete the section
      await db.update(sections)
        .set({ isDeleted: true })
        .where(eq(sections.id, id));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting section:', error);
      return { success: false, error: error.message || 'Failed to delete section' };
    }
  }

  // Restore functionality for soft-deleted records
  static async restoreSection(id: number, userBranchId: number): Promise<ServiceResponse<void>> {
    try {
      // Verify section belongs to user's branch and is soft-deleted
      const section = await db.select().from(sections).where(and(
        eq(sections.id, id),
        eq(sections.isDeleted, true)
      )).limit(1);
      
      if (section.length === 0) {
        return { success: false, error: 'Deleted section not found' };
      }

      if (section[0]!.branchId !== userBranchId) {
        return { success: false, error: 'Cannot restore section from different branch' };
      }

      // Check if name conflicts with existing active sections
      const existing = await db.select().from(sections).where(and(
        eq(sections.classId, section[0]!.classId),
        eq(sections.branchId, section[0]!.branchId),
        eq(sections.name, section[0]!.name),
        eq(sections.isDeleted, false)
      )).limit(1);

      if (existing.length > 0) {
        return { success: false, error: 'Section name already exists in this class and branch' };
      }

      // Restore the section
      await db.update(sections)
        .set({ isDeleted: false })
        .where(eq(sections.id, id));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error restoring section:', error);
      return { success: false, error: error.message || 'Failed to restore section' };
    }
  }

  // Get enabled classes for an organization (both global and private)
  static async getEnabledForOrganization(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      // First get the organization's enabled classes list
      const orgResult = await db.select({ enabledClasses: organizations.enabledClasses })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!orgResult || !orgResult[0]) {
        return {
          success: false,
          error: 'Organization not found'
        };
      }

      const enabledIds = orgResult[0].enabledClasses;

      // Handle case where enabledClasses is null, undefined, or not an array
      if (!enabledIds || !Array.isArray(enabledIds)) {
        return {
          success: true,
          data: []
        };
      }

      // Filter out any null/undefined values from enabledIds
      const validEnabledIds = enabledIds.filter(id => id != null && typeof id === 'number');
      
      if (validEnabledIds.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      // Get all enabled classes (global and private ones for this org), including deleted ones for restore functionality
      const result = await db.select({
        id: classes.id,
        name: classes.name,
        displayName: classes.displayName,
        gradeLevel: classes.order,
        level: sql<string>`
          CASE 
            WHEN ${classes.order} <= 5 THEN 'Primary'
            WHEN ${classes.order} <= 8 THEN 'Middle School'
            WHEN ${classes.order} <= 10 THEN 'High School'
            ELSE 'Senior Secondary'
          END
        `.as('level'),
        branchId: classes.branchId,
        organizationId: classes.organizationId,
        isPrivate: classes.isPrivate,
        isDeleted: classes.isDeleted,
        createdAt: classes.createdAt,
      })
      .from(classes)
      .where(inArray(classes.id, validEnabledIds))
      .orderBy(classes.order);

      // Get all sections for these classes, organized by branches (only for non-deleted classes)
      if (result.length > 0) {
        const activeGradeIds = result.filter(r => !r.isDeleted).map(r => r.id);
        let sectionsData: any[] = [];
        
        if (activeGradeIds.length > 0) {
          try {
            sectionsData = await db.select({
            id: sections.id,
            name: sections.name,
            capacity: sections.capacity,
            classId: sections.classId,
            branchId: sections.branchId,
            organizationId: sections.organizationId,
            classTeacherId: sections.classTeacherId,
            branchName: branches.name,
            branchCode: branches.code,
            // Add student count
            _count: {
              students: sql<number>`(
                SELECT COUNT(*) FROM enrollments 
                WHERE enrollments.section_id = ${sections.id} 
                AND enrollments.is_deleted = false
              )`.as('studentCount')
            }
          })
          .from(sections)
          .leftJoin(branches, eq(sections.branchId, branches.id))
          .where(and(
            inArray(sections.classId, activeGradeIds),
            eq(sections.isDeleted, false),
            eq(sections.organizationId, organizationId)
          ));
          } catch (sectionError: any) {
            console.error('Error fetching sections for classes:', sectionError);
            // Continue without sections data if there's an error
            sectionsData = [];
          }
        }

        // Attach sections to classes
        const enrichedResult = result.map(classItem => {
          if (!classItem || !classItem.id) {
            console.warn('Invalid class found:', classItem);
            return null;
          }
          
          const classSections = sectionsData.filter(section => section && section.classId === classItem.id);
          
          return {
            ...classItem,
            sections: classSections.map(section => ({
              id: section.id,
              name: section.name || '',
              capacity: section.capacity || 0,
              branchId: section.branchId,
              organizationId: section.organizationId,
              classTeacherId: section.classTeacherId,
              branch: {
                name: section.branchName || '',
                code: section.branchCode || ''
              },
              _count: {
                students: section._count?.students || 0
              }
            })),
            _count: {
              sections: classSections.length
            }
          };
        }).filter(classItem => classItem !== null);

        return {
          success: true,
          data: enrichedResult
        };
      }

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('Error fetching enabled classes for organization:', organizationId, error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      return { success: false, error: error.message || 'Failed to fetch enabled classes' };
    }
  }

  // Get all global classes (for selection by org admin)
  static async getGlobal(): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: classes.id,
        name: classes.name,
        displayName: classes.displayName,
        gradeLevel: classes.order,
        level: sql<string>`
          CASE 
            WHEN ${classes.order} <= 5 THEN 'Primary'
            WHEN ${classes.order} <= 8 THEN 'Middle School'
            WHEN ${classes.order} <= 10 THEN 'High School'
            ELSE 'Senior Secondary'
          END
        `.as('level'),
        branchId: classes.branchId,
        organizationId: classes.organizationId,
        isPrivate: classes.isPrivate,
        createdAt: classes.createdAt,
      })
      .from(classes)
      .where(and(
        eq(classes.isDeleted, false),
        eq(classes.isPrivate, false),
        isNull(classes.organizationId)
      ))
      .orderBy(classes.order);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('Error fetching global classes:', error);
      return { success: false, error: error.message || 'Failed to fetch global classes' };
    }
  }

  // Get private classes for an organization
  static async getPrivateForOrganization(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: classes.id,
        name: classes.name,
        displayName: classes.displayName,
        gradeLevel: classes.order,
        level: sql<string>`
          CASE 
            WHEN ${classes.order} <= 5 THEN 'Primary'
            WHEN ${classes.order} <= 8 THEN 'Middle School'
            WHEN ${classes.order} <= 10 THEN 'High School'
            ELSE 'Senior Secondary'
          END
        `.as('level'),
        branchId: classes.branchId,
        organizationId: classes.organizationId,
        isPrivate: classes.isPrivate,
        createdAt: classes.createdAt,
      })
      .from(classes)
      .where(and(
        eq(classes.isDeleted, false),
        eq(classes.isPrivate, true),
        eq(classes.organizationId, organizationId)
      ))
      .orderBy(classes.order);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('Error fetching private classes:', error);
      return { success: false, error: error.message || 'Failed to fetch private classes' };
    }
  }

  // Get enabled classes for an organization
  static async getEnabledClasses(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      // Get enabled grade IDs from organization
      const orgResult = await db.select({ enabledClasses: organizations.enabledClasses })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (orgResult.length === 0) {
        return { success: false, error: 'Organization not found' };
      }

      const enabledIds = orgResult[0]?.enabledClasses || [];
      
      // If no classes are specifically enabled, return all organization classes
      if (enabledIds.length === 0) {
        return await this.getAll({ organizationId });
      }

      // Fetch the enabled classes
      const result = await db.select({
        id: classes.id,
        name: classes.name,
        displayName: classes.displayName,
        gradeLevel: classes.order,
        level: sql<string>`
          CASE 
            WHEN ${classes.order} <= 5 THEN 'Primary'
            WHEN ${classes.order} <= 8 THEN 'Middle School'
            WHEN ${classes.order} <= 10 THEN 'High School'
            ELSE 'Senior Secondary'
          END
        `.as('level'),
        branchId: classes.branchId,
        organizationId: classes.organizationId,
        isPrivate: classes.isPrivate,
        createdAt: classes.createdAt
      })
        .from(classes)
        .where(
          and(
            inArray(classes.id, enabledIds),
            eq(classes.isDeleted, false)
          )
        )
        .orderBy(classes.order);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch enabled classes' };
    }
  }

  // Check removal info - determines if class should be deleted or just removed from enabled list
  static async checkRemoval(classId: number, organizationId?: number): Promise<ServiceResponse<any>> {
    try {

      if(!organizationId) {
        return { success: false, error: 'Organization ID is required' };
      }

      // Get class/grade details
      const classResult = await db.select({
        id: classes.id,
        name: classes.name,
        isPrivate: classes.isPrivate,
        organizationId: classes.organizationId,
      })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.isDeleted, false)))
      .limit(1);

      if (classResult.length === 0) {
        return {
          success: false,
          error: 'Class not found'
        };
      }

      const classData = classResult[0];

      if(!classData) {
        return { success: false, error: 'Class data not found' };
      }

      // Check if class has sections
      const sectionCount = await db.select({ count: sql<number>`COUNT(*)` })
        .from(sections)
        .where(and(eq(sections.classId, classId), eq(sections.isDeleted, false)));


      if(!sectionCount[0]) {
        return { success: false, error: 'Section count data not found' };
      }

      const hasSections = sectionCount[0]?.count > 0;

      // Determine removal type
      let removalType: 'remove' | 'delete';
      let canRemove = true;
      let reason = '';

      if (classData.isPrivate && classData.organizationId === organizationId) {
        // Private class owned by user's organization - delete entirely
        removalType = 'delete';
        if (hasSections) {
          canRemove = false;
          reason = `Cannot delete class as it has ${sectionCount[0]?.count} sections`;
        }
      } else {
        // Global class - just remove from enabled list
        removalType = 'remove';
        // Can always remove from enabled list
      }

      return {
        success: true,
        data: {
          classId,
          className: classData.name,
          removalType,
          canRemove,
          reason,
          hasSections,
          sectionCount: sectionCount[0]?.count || 0,
          isPrivate: classData.isPrivate,
          ownedByOrganization: classData.organizationId === organizationId
        }
      };
    } catch (error: any) {
      console.error('Error checking class removal:', error);
      return {
        success: false,
        error: error.message || 'Failed to check removal info'
      };
    }
  }

  // Remove or delete class based on ownership and usage
  static async removeOrDelete(classId: number, organizationId?: number): Promise<ServiceResponse<any>> {
    try {
      // First check removal info
      const checkResult = await this.checkRemoval(classId, organizationId);
      
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
        // Delete the private class entirely
        const result = await db.update(classes)
          .set({ 
            isDeleted: true,
          })
          .where(and(eq(classes.id, classId), eq(classes.isDeleted, false)))
          .returning();

        if (result.length === 0) {
          return {
            success: false,
            error: 'Class not found'
          };
        }

        return {
          success: true,
          data: {
            action: 'deleted',
            class: result[0]
          }
        };
      } else {
        // Remove from organization's enabled classes list
        if (!organizationId) {
          return {
            success: false,
            error: 'Organization ID is required'
          };
        }

        const result = await db.transaction(async (tx) => {
          // Get current enabled classes
          const orgResult = await tx.select({ enabledClasses: organizations.enabledClasses })
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1);

          if (!orgResult || !orgResult[0]) {
            throw new Error('Organization not found');
          }

          const currentEnabled = orgResult[0].enabledClasses || [];
          const newEnabled = currentEnabled.filter(id => id !== classId);
          
          // Update organization's enabled classes
          await tx.update(organizations)
            .set({ enabledClasses: newEnabled })
            .where(eq(organizations.id, organizationId));

          return { classId, organizationId };
        });

        return {
          success: true,
          data: {
            action: 'removed',
            classId: result.classId,
            organizationId: result.organizationId
          }
        };
      }
    } catch (error: any) {
      console.error('Error removing/deleting class:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove or delete class'
      };
    }
  }

  // Restore class (soft-deleted private classes or removed public classes)
  static async restore(id: number, userRole?: string, userOrganizationId?: number): Promise<ServiceResponse<any>> {
    try {
      // Check if the class exists (both deleted and active)
      const existing = await db.select({ 
        id: classes.id, 
        organizationId: classes.organizationId,
        name: classes.name,
        isPrivate: classes.isPrivate,
        isDeleted: classes.isDeleted,
        order: classes.order
      })
        .from(classes)
        .where(eq(classes.id, id))
        .limit(1);

      if (existing.length === 0) {
        return { success: false, error: 'Class not found' };
      }

      const existingClass = existing[0];

      if (!existingClass?.isDeleted) {
        return { success: false, error: 'Class is not deleted' };
      }

      // For private classes, they must be deleted to restore
      if (existingClass.isPrivate && existingClass.organizationId) {
        if (!existingClass.isDeleted) {
          return { success: false, error: 'Private class is not deleted' };
        }

        // Prevent non-SUPER_ADMIN users from restoring private classes from other organizations
        if (userRole !== 'SUPER_ADMIN' && userOrganizationId && existingClass.organizationId !== userOrganizationId) {
          return { success: false, error: 'Access denied' };
        }

        // Check for name conflicts with existing active classes
        const nameConflict = await db.select()
          .from(classes)
          .where(and(
            eq(classes.name, existingClass.name),
            eq(classes.isDeleted, false),
            eq(classes.organizationId, existingClass.organizationId)
          ))
          .limit(1);

        if (nameConflict.length > 0) {
          return { success: false, error: 'A class with this name already exists in the organization' };
        }
      }

      // For global classes, we need organization ID to add them back to enabled list
      if (!existingClass.isPrivate && !userOrganizationId) {
        return { success: false, error: 'Organization ID is required to restore global class' };
      }

      // For global classes, prevent non-SUPER_ADMIN users from restoring
      if (!existingClass.isPrivate && existingClass.organizationId === null && userRole !== 'SUPER_ADMIN') {
        return { success: false, error: 'Cannot restore global classes. Only super admins can restore global entities.' };
      }

      const result = await db.transaction(async (tx) => {
        let restoredClass = existingClass;

        // Step 1: For private classes, restore the class (set isDeleted = false)
        if (existingClass.isPrivate && existingClass.organizationId && existingClass.isDeleted) {
          const restored = await tx.update(classes)
            .set({ 
              isDeleted: false,
            })
            .where(eq(classes.id, id))
            .returning();

          if (restored.length === 0) {
            throw new Error('Failed to restore class');
          }

          restoredClass = { ...existingClass, ...restored[0], isDeleted: false };
        }

        // Step 2: Add class back to organization's enabled list
        const targetOrgId = userOrganizationId || existingClass.organizationId;
        if (targetOrgId) {
          // Get current enabled classes
          const orgResult = await tx.select({ enabledClasses: organizations.enabledClasses })
            .from(organizations)
            .where(eq(organizations.id, targetOrgId))
            .limit(1);

          if (orgResult && orgResult[0]) {
            const currentEnabled = orgResult[0].enabledClasses || [];
            
            // Only add if not already in the list
            if (!currentEnabled.includes(id)) {
              const newEnabled = [...currentEnabled, id];
              
              // Update organization's enabled classes
              await tx.update(organizations)
                .set({ enabledClasses: newEnabled })
                .where(eq(organizations.id, targetOrgId));
            }
          }
        }

        return restoredClass;
      });

      // Map the database result to match frontend expectations
      const mappedResult = {
        ...result,
        gradeLevel: result.name,
        level: this.mapGradeLevelToLevel(result.order || 1)
      };
      
      return { success: true, data: mappedResult };
    } catch (error: any) {
      console.error('Error restoring class:', error);
      return { success: false, error: error.message || 'Failed to restore class' };
    }
  }
}