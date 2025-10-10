import { eq, and, desc, sql } from 'drizzle-orm';
import db from '../db/index.js';
import { 
  subjectAssignments,
  subjects,
  sections,
  staff,
  users,
  grades,
  branches
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreateSubjectAssignmentData {
  subjectId: number;
  sectionId: number;
  staffId: number;
}

export interface UpdateSubjectAssignmentData {
  subjectId?: number;
  sectionId?: number;
  staffId?: number;
}

export interface GetSubjectAssignmentsOptions {
  branchId?: number;
  sectionId?: number;
  subjectId?: number;
  staffId?: number;
}

export class SubjectAssignmentsService {
  static async create(data: CreateSubjectAssignmentData): Promise<ServiceResponse<any>> {
    try {
      const result = await db.insert(subjectAssignments).values({
        subjectId: data.subjectId,
        sectionId: data.sectionId,
        staffId: data.staffId,
        assignedAt: sql`CURRENT_TIMESTAMP`
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return { success: false, error: 'This subject assignment already exists for the selected staff, subject, and section' };
      }
      return { success: false, error: error.message || 'Failed to create subject assignment' };
    }
  }

  static async getAll(options: GetSubjectAssignmentsOptions = {}): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [];

      if (options.sectionId) {
        whereConditions.push(eq(subjectAssignments.sectionId, options.sectionId));
      }

      if (options.subjectId) {
        whereConditions.push(eq(subjectAssignments.subjectId, options.subjectId));
      }

      if (options.staffId) {
        whereConditions.push(eq(subjectAssignments.staffId, options.staffId));
      }

      if (options.branchId) {
        whereConditions.push(eq(sections.branchId, options.branchId));
      }

      const result = await db.select({
        id: subjectAssignments.id,
        subjectId: subjectAssignments.subjectId,
        sectionId: subjectAssignments.sectionId,
        staffId: subjectAssignments.staffId,
        assignedAt: subjectAssignments.assignedAt,
        createdAt: subjectAssignments.createdAt,
        updatedAt: subjectAssignments.updatedAt,
        // Subject info
        subjectName: subjects.name,
        subjectCode: subjects.code,
        subjectShortName: subjects.shortName,
        // Section info
        sectionName: sections.name,
        sectionCapacity: sections.capacity,
        // Grade info
        gradeName: grades.name,
        gradeDisplayName: grades.displayName,
        // Staff info
        staffFirstName: staff.firstName,
        staffLastName: staff.lastName,
        staffEmployeeNumber: staff.employeeNumber,
        staffPosition: staff.position,
        // User info for staff
        staffDisplayName: users.displayName,
        staffEmail: users.email
      })
        .from(subjectAssignments)
        .leftJoin(subjects, eq(subjectAssignments.subjectId, subjects.id))
        .leftJoin(sections, eq(subjectAssignments.sectionId, sections.id))
        .leftJoin(grades, eq(sections.gradeId, grades.id))
        .leftJoin(staff, eq(subjectAssignments.staffId, staff.id))
        .leftJoin(users, eq(staff.userId, users.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(subjectAssignments.createdAt));

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch subject assignments' };
    }
  }

  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: subjectAssignments.id,
        subjectId: subjectAssignments.subjectId,
        sectionId: subjectAssignments.sectionId,
        staffId: subjectAssignments.staffId,
        assignedAt: subjectAssignments.assignedAt,
        createdAt: subjectAssignments.createdAt,
        updatedAt: subjectAssignments.updatedAt,
        // Subject info
        subjectName: subjects.name,
        subjectCode: subjects.code,
        subjectShortName: subjects.shortName,
        // Section info
        sectionName: sections.name,
        sectionCapacity: sections.capacity,
        // Grade info
        gradeName: grades.name,
        gradeDisplayName: grades.displayName,
        // Staff info
        staffFirstName: staff.firstName,
        staffLastName: staff.lastName,
        staffEmployeeNumber: staff.employeeNumber,
        staffPosition: staff.position,
        // User info for staff
        staffDisplayName: users.displayName,
        staffEmail: users.email
      })
        .from(subjectAssignments)
        .leftJoin(subjects, eq(subjectAssignments.subjectId, subjects.id))
        .leftJoin(sections, eq(subjectAssignments.sectionId, sections.id))
        .leftJoin(grades, eq(sections.gradeId, grades.id))
        .leftJoin(staff, eq(subjectAssignments.staffId, staff.id))
        .leftJoin(users, eq(staff.userId, users.id))
        .where(eq(subjectAssignments.id, id))
        .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Subject assignment not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch subject assignment' };
    }
  }

  static async update(id: number, data: UpdateSubjectAssignmentData): Promise<ServiceResponse<any>> {
    try {
      const updateData: any = {};

      if (data.subjectId !== undefined) updateData.subjectId = data.subjectId;
      if (data.sectionId !== undefined) updateData.sectionId = data.sectionId;
      if (data.staffId !== undefined) updateData.staffId = data.staffId;

      if (Object.keys(updateData).length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      updateData.updatedAt = sql`CURRENT_TIMESTAMP`;

      const result = await db.update(subjectAssignments)
        .set(updateData)
        .where(eq(subjectAssignments.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Subject assignment not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return { success: false, error: 'This subject assignment already exists for the selected staff, subject, and section' };
      }
      return { success: false, error: error.message || 'Failed to update subject assignment' };
    }
  }

  static async delete(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.delete(subjectAssignments)
        .where(eq(subjectAssignments.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Subject assignment not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete subject assignment' };
    }
  }

  // Get assignments by branch
  static async getByBranch(branchId: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({ branchId });
  }

  // Get assignments by section
  static async getBySection(sectionId: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({ sectionId });
  }

  // Get assignments by staff
  static async getByStaff(staffId: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({ staffId });
  }

  // Get assignments by subject
  static async getBySubject(subjectId: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({ subjectId });
  }

  // Bulk assign subjects to a section
  static async bulkAssignToSection(sectionId: number, assignments: { subjectId: number; staffId: number }[]): Promise<ServiceResponse<any[]>> {
    try {
      const results = [];
      
      for (const assignment of assignments) {
        const result = await this.create({
          sectionId,
          subjectId: assignment.subjectId,
          staffId: assignment.staffId
        });
        
        if (result.success) {
          results.push(result.data);
        } else {
          // If one fails, return the error
          return result;
        }
      }

      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to bulk assign subjects' };
    }
  }

  // Get staff workload (number of assignments per staff member)
  static async getStaffWorkload(branchId?: number): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [];
      
      if (branchId) {
        whereConditions.push(eq(sections.branchId, branchId));
      }

      const result = await db.select({
        staffId: subjectAssignments.staffId,
        staffFirstName: staff.firstName,
        staffLastName: staff.lastName,
        staffDisplayName: users.displayName,
        staffEmployeeNumber: staff.employeeNumber,
        assignmentCount: sql<number>`count(${subjectAssignments.id})`,
        subjectCount: sql<number>`count(distinct ${subjectAssignments.subjectId})`,
        sectionCount: sql<number>`count(distinct ${subjectAssignments.sectionId})`
      })
        .from(subjectAssignments)
        .leftJoin(staff, eq(subjectAssignments.staffId, staff.id))
        .leftJoin(users, eq(staff.userId, users.id))
        .leftJoin(sections, eq(subjectAssignments.sectionId, sections.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .groupBy(
          subjectAssignments.staffId, 
          staff.firstName, 
          staff.lastName, 
          users.displayName, 
          staff.employeeNumber
        )
        .orderBy(desc(sql`count(${subjectAssignments.id})`));

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch staff workload' };
    }
  }
}