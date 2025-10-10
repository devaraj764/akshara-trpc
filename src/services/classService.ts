import { eq, and, sql, isNull, inArray } from 'drizzle-orm';
import db from '../db/index.js';
import { grades, sections, branches, organizations, staff } from '../db/schema.js';
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
  gradeId: number;
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
      // For now, return grades from any branch within the organization
      // In a real system, we'd need to implement organization-level grades
      let query = db.select({
        id: grades.id,
        name: grades.name,
        displayName: grades.displayName,
        gradeLevel: grades.order,
        level: sql<string>`
          CASE 
            WHEN ${grades.order} <= 5 THEN 'Primary'
            WHEN ${grades.order} <= 8 THEN 'Middle School'
            WHEN ${grades.order} <= 10 THEN 'High School'
            ELSE 'Senior Secondary'
          END
        `.as('level'),
        branchId: grades.branchId,
        organizationId: grades.organizationId,
        isPrivate: grades.isPrivate,
        createdAt: grades.createdAt,
        // Count sections if requested
        ...(options.includeSections ? {
          sectionCount: sql<number>`(
            SELECT COUNT(*) FROM ${sections} 
            WHERE ${sections.gradeId} = ${grades.id}
          )`.as('sectionCount')
        } : {})
      }).from(grades).where(eq(grades.isDeleted, false));

      let result = await query;

      // If including sections, fetch them separately
      if (options.includeSections && result.length > 0) {
        const gradeIds = result.map(r => r.id);
        
        const sectionsData = await db.select({
          id: sections.id,
          name: sections.name,
          capacity: sections.capacity,
          gradeId: sections.gradeId,
          branchId: sections.branchId,
          ...(options.includeBranches ? {
            branchName: branches.name,
            branchCode: branches.code,
          } : {})
        })
        .from(sections)
        .leftJoin(branches, eq(sections.branchId, branches.id))
        .where(and(
          sql`${sections.gradeId} IN (${sql.join(gradeIds.map(id => sql`${id}`), sql`, `)})`,
          eq(sections.isDeleted, false)
        ));

        // Attach sections to grades
        const enrichedResult = result.map(grade => ({
          ...grade,
          sections: sectionsData.filter(section => section.gradeId === grade.id).map(section => ({
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
            sections: sectionsData.filter(section => section.gradeId === grade.id).length
          }
        }));

        return { success: true, data: enrichedResult };
      }

      // Add section count for display
      const enrichedResult = result.map(grade => ({
        ...grade,
        _count: {
          sections: grade.sectionCount || 0
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
        id: grades.id,
        name: grades.name,
        displayName: grades.displayName,
        gradeLevel: grades.order,
        branchId: grades.branchId,
        organizationId: grades.organizationId,
        isPrivate: grades.isPrivate,
        createdAt: grades.createdAt,
      }).from(grades).where(eq(grades.id, id)).limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Class not found' };
      }

      const grade = result[0];
      let enrichedGrade = { ...grade };

      if (includeSections) {
        const sectionsData = await db.select({
          id: sections.id,
          name: sections.name,
          capacity: sections.capacity,
          branchId: sections.branchId,
        }).from(sections).where(eq(sections.gradeId, id));

        enrichedGrade = {
          ...enrichedGrade,
          sections: sectionsData,
          _count: { sections: sectionsData.length }
        } as any;
      }

      return { success: true, data: enrichedGrade };
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
        
        const newGrade = await tx.insert(grades).values(insertData).returning();

        if (!newGrade || !newGrade[0]) {
          return { success: false, error: 'Failed to create class' };
        }

        // If it's a private class for an organization, automatically add to enabled list
        if (data.isPrivate && data.organizationId) {
          // Get current enabled grades
          const orgResult = await tx.select({ enabledGrades: organizations.enabledGrades })
            .from(organizations)
            .where(eq(organizations.id, data.organizationId))
            .limit(1);

          if (!orgResult || !orgResult[0]) {
            return { success: false, error: 'Organization not found' };
          }
          

          if (orgResult.length > 0) {
            const currentEnabled = orgResult[0].enabledGrades || [];
            const newEnabled = [...currentEnabled, newGrade[0].id];
            
            // Update organization's enabled grades
            await tx.update(organizations)
              .set({ enabledGrades: newEnabled })
              .where(eq(organizations.id, data.organizationId));
          }
        }

        // Map the database result to match frontend expectations
        const mappedResult = {
          ...newGrade[0],
          gradeLevel: newGrade[0]!.order,
          level: this.mapGradeLevelToLevel(newGrade[0]!.order || 1)
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
        id: grades.id, 
        organizationId: grades.organizationId 
      })
        .from(grades)
        .where(and(eq(grades.id, id), eq(grades.isDeleted, false)))
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

      const updatedGrade = await db.update(grades)
        .set(updateData)
        .where(eq(grades.id, id))
        .returning();

      if (updatedGrade.length === 0) {
        return { success: false, error: 'Class not found' };
      }

      // Map the database result to match frontend expectations
      const mappedResult = {
        ...updatedGrade[0],
        gradeLevel: updatedGrade[0]!.order,
        // Use provided level if available, otherwise auto-calculate
        level: data.level || this.mapGradeLevelToLevel(updatedGrade[0]!.order || 1)
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
        id: grades.id, 
        organizationId: grades.organizationId 
      })
        .from(grades)
        .where(and(eq(grades.id, id), eq(grades.isDeleted, false)))
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
        eq(sections.gradeId, id),
        eq(sections.isDeleted, false)
      )).limit(1);
      
      if (existingSections.length > 0) {
        return { success: false, error: 'Cannot delete class with existing sections' };
      }

      // Soft delete the grade
      await db.update(grades)
        .set({ isDeleted: true })
        .where(eq(grades.id, id));
      
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
        gradeId: sections.gradeId,
        branchId: sections.branchId,
        gradeName: grades.name,
        gradeDisplayName: grades.displayName,
        gradeOrder: grades.order,
      }).from(sections)
      .leftJoin(grades, eq(sections.gradeId, grades.id))
      .where(and(
        eq(sections.branchId, branchId),
        eq(sections.isDeleted, false),
        eq(grades.isDeleted, false)
      ))
      .orderBy(grades.order, sections.name);

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error fetching sections by branch:', error);
      return { success: false, error: error.message || 'Failed to fetch sections' };
    }
  }

  static async getSectionsByClass(gradeId: number, branchId: number, includeDeleted: boolean = false): Promise<ServiceResponse<any[]>> {
    try {
      // Build the where condition based on includeDeleted parameter
      let whereCondition = and(
        eq(sections.gradeId, gradeId),
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
        gradeId: sections.gradeId,
        branchId: sections.branchId,
        organizationId: sections.organizationId,
        isDeleted: sections.isDeleted,
        createdAt: sections.createdAt,
        classTeacherId: sections.classTeacherId,
        teacher: {
          id: staff.id,
          name: sql<string>`CONCAT(${staff.firstName}, ' ', COALESCE(${staff.lastName}, ''))`.as('fullName')
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
      .where(whereCondition)
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
        eq(sections.gradeId, data.gradeId),
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
        gradeId: data.gradeId,
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
        eq(sections.gradeId, section[0]!.gradeId),
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

  // Get enabled grades for an organization (both global and private)
  static async getEnabledForOrganization(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      // First get the organization's enabled grades list
      const orgResult = await db.select({ enabledGrades: organizations.enabledGrades })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!orgResult || !orgResult[0]) {
        return {
          success: false,
          error: 'Organization not found'
        };
      }

      const enabledIds = orgResult[0].enabledGrades || [];

      console.log(enabledIds)
      
      if (enabledIds.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      // Get all enabled grades (global and private ones for this org)
      const result = await db.select({
        id: grades.id,
        name: grades.name,
        displayName: grades.displayName,
        gradeLevel: grades.order,
        level: sql<string>`
          CASE 
            WHEN ${grades.order} <= 5 THEN 'Primary'
            WHEN ${grades.order} <= 8 THEN 'Middle School'
            WHEN ${grades.order} <= 10 THEN 'High School'
            ELSE 'Senior Secondary'
          END
        `.as('level'),
        branchId: grades.branchId,
        organizationId: grades.organizationId,
        isPrivate: grades.isPrivate,
        createdAt: grades.createdAt,
      })
      .from(grades)
      .where(and(
        inArray(grades.id, enabledIds),
        eq(grades.isDeleted, false)
      ))
      .orderBy(grades.order);

      // Get all sections for these grades, organized by branches
      if (result.length > 0) {
        const gradeIds = result.map(r => r.id);
        
        const sectionsData = await db.select({
          id: sections.id,
          name: sections.name,
          capacity: sections.capacity,
          gradeId: sections.gradeId,
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
          sql`${sections.gradeId} IN (${sql.join(gradeIds.map(id => sql`${id}`), sql`, `)})`,
          eq(sections.isDeleted, false),
          eq(sections.organizationId, organizationId)
        ));

        // Attach sections to grades
        const enrichedResult = result.map(grade => ({
          ...grade,
          sections: sectionsData.filter(section => section.gradeId === grade.id).map(section => ({
            id: section.id,
            name: section.name,
            capacity: section.capacity,
            branchId: section.branchId,
            organizationId: section.organizationId,
            classTeacherId: section.classTeacherId,
            branch: {
              name: section.branchName,
              code: section.branchCode
            },
            _count: {
              students: section._count?.students || 0
            }
          })),
          _count: {
            sections: sectionsData.filter(section => section.gradeId === grade.id).length
          }
        }));

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
      console.error('Error fetching enabled grades:', error);
      return { success: false, error: error.message || 'Failed to fetch enabled grades' };
    }
  }

  // Get all global grades (for selection by org admin)
  static async getGlobal(): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: grades.id,
        name: grades.name,
        displayName: grades.displayName,
        gradeLevel: grades.order,
        level: sql<string>`
          CASE 
            WHEN ${grades.order} <= 5 THEN 'Primary'
            WHEN ${grades.order} <= 8 THEN 'Middle School'
            WHEN ${grades.order} <= 10 THEN 'High School'
            ELSE 'Senior Secondary'
          END
        `.as('level'),
        branchId: grades.branchId,
        organizationId: grades.organizationId,
        isPrivate: grades.isPrivate,
        createdAt: grades.createdAt,
      })
      .from(grades)
      .where(and(
        eq(grades.isDeleted, false),
        eq(grades.isPrivate, false),
        isNull(grades.organizationId)
      ))
      .orderBy(grades.order);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('Error fetching global grades:', error);
      return { success: false, error: error.message || 'Failed to fetch global grades' };
    }
  }

  // Get private grades for an organization
  static async getPrivateForOrganization(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: grades.id,
        name: grades.name,
        displayName: grades.displayName,
        gradeLevel: grades.order,
        level: sql<string>`
          CASE 
            WHEN ${grades.order} <= 5 THEN 'Primary'
            WHEN ${grades.order} <= 8 THEN 'Middle School'
            WHEN ${grades.order} <= 10 THEN 'High School'
            ELSE 'Senior Secondary'
          END
        `.as('level'),
        branchId: grades.branchId,
        organizationId: grades.organizationId,
        isPrivate: grades.isPrivate,
        createdAt: grades.createdAt,
      })
      .from(grades)
      .where(and(
        eq(grades.isDeleted, false),
        eq(grades.isPrivate, true),
        eq(grades.organizationId, organizationId)
      ))
      .orderBy(grades.order);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('Error fetching private grades:', error);
      return { success: false, error: error.message || 'Failed to fetch private grades' };
    }
  }

  // Get enabled grades for an organization
  static async getEnabledGrades(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      // Get enabled grade IDs from organization
      const orgResult = await db.select({ enabledGrades: organizations.enabledGrades })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (orgResult.length === 0) {
        return { success: false, error: 'Organization not found' };
      }

      const enabledIds = orgResult[0]?.enabledGrades || [];
      
      // If no grades are specifically enabled, return all organization grades
      if (enabledIds.length === 0) {
        return await this.getAll({ organizationId });
      }

      // Fetch the enabled grades
      const result = await db.select({
        id: grades.id,
        name: grades.name,
        displayName: grades.displayName,
        gradeLevel: grades.order,
        level: sql<string>`
          CASE 
            WHEN ${grades.order} <= 5 THEN 'Primary'
            WHEN ${grades.order} <= 8 THEN 'Middle School'
            WHEN ${grades.order} <= 10 THEN 'High School'
            ELSE 'Senior Secondary'
          END
        `.as('level'),
        branchId: grades.branchId,
        organizationId: grades.organizationId,
        isPrivate: grades.isPrivate,
        createdAt: grades.createdAt
      })
        .from(grades)
        .where(
          and(
            inArray(grades.id, enabledIds),
            eq(grades.isDeleted, false)
          )
        )
        .orderBy(grades.order);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch enabled grades' };
    }
  }

  // Check removal info - determines if class should be deleted or just removed from enabled list
  static async checkRemoval(classId: number, organizationId?: number): Promise<ServiceResponse<any>> {
    try {
      // Get class/grade details
      const classResult = await db.select({
        id: grades.id,
        name: grades.name,
        isPrivate: grades.isPrivate,
        organizationId: grades.organizationId,
      })
      .from(grades)
      .where(and(eq(grades.id, classId), eq(grades.isDeleted, false)))
      .limit(1);

      if (classResult.length === 0) {
        return {
          success: false,
          error: 'Class not found'
        };
      }

      const classData = classResult[0];

      // Check if class has sections
      const sectionCount = await db.select({ count: sql<number>`COUNT(*)` })
        .from(sections)
        .where(and(eq(sections.gradeId, classId), eq(sections.isDeleted, false)));

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
        const result = await db.update(grades)
          .set({ 
            isDeleted: true,
            updatedAt: sql`CURRENT_TIMESTAMP`
          })
          .where(and(eq(grades.id, classId), eq(grades.isDeleted, false)))
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
        // Remove from organization's enabled grades list
        if (!organizationId) {
          return {
            success: false,
            error: 'Organization ID is required'
          };
        }

        const result = await db.transaction(async (tx) => {
          // Get current enabled grades
          const orgResult = await tx.select({ enabledGrades: organizations.enabledGrades })
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1);

          if (!orgResult || !orgResult[0]) {
            throw new Error('Organization not found');
          }

          const currentEnabled = orgResult[0].enabledGrades || [];
          const newEnabled = currentEnabled.filter(id => id !== classId);
          
          // Update organization's enabled grades
          await tx.update(organizations)
            .set({ enabledGrades: newEnabled })
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
}