import { eq, and, desc, sql } from 'drizzle-orm';
import db from '../db/index.js';
import { enrollments, students, classes, sections, academicYears } from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

interface CreateEnrollmentData {
  studentId: number;
  branchId: number;
  classId: number;
  sectionId?: number;
  academicYearId: number;
  rollNumber?: number;
  status?: string;
}

interface UpdateEnrollmentData {
  id: number;
  classId?: number;
  sectionId?: number;
  rollNumber?: number;
  status?: string;
}

export class EnrollmentService {
  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: enrollments.id,
        studentId: enrollments.studentId,
        branchId: enrollments.branchId,
        classId: enrollments.classId,
        sectionId: enrollments.sectionId,
        academicYearId: enrollments.academicYearId,
        rollNumber: enrollments.rollNumber,
        status: enrollments.status,
        enrolledAt: enrollments.enrolledAt,
        leftAt: enrollments.leftAt,
        student: {
          id: students.id,
          firstName: students.firstName,
          lastName: students.lastName,
          admissionNumber: students.admissionNumber,
        },
        grade: {
          id: classes.id,
          name: classes.name,
        },
        section: {
          id: sections.id,
          name: sections.name,
        },
        academicYear: {
          id: academicYears.id,
          name: academicYears.name,
          startDate: academicYears.startDate,
          endDate: academicYears.endDate,
        }
      })
      .from(enrollments)
      .leftJoin(students, eq(enrollments.studentId, students.id))
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .leftJoin(sections, eq(enrollments.sectionId, sections.id))
      .leftJoin(academicYears, eq(enrollments.academicYearId, academicYears.id))
      .where(and(
        eq(enrollments.id, id),
        eq(enrollments.isDeleted, false)
      ))
      .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Enrollment not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      console.error('Error fetching enrollment:', error);
      return { success: false, error: error.message || 'Failed to fetch enrollment' };
    }
  }

  static async getByStudentId(studentId: number, academicYearId?: number): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [
        eq(enrollments.studentId, studentId),
        eq(enrollments.isDeleted, false)
      ];
      
      if (academicYearId) {
        whereConditions.push(eq(enrollments.academicYearId, academicYearId));
      }

      const result = await db.select({
        id: enrollments.id,
        studentId: enrollments.studentId,
        branchId: enrollments.branchId,
        classId: enrollments.classId,
        sectionId: enrollments.sectionId,
        academicYearId: enrollments.academicYearId,
        rollNumber: enrollments.rollNumber,
        status: enrollments.status,
        enrolledAt: enrollments.enrolledAt,
        leftAt: enrollments.leftAt,
        grade: {
          id: classes.id,
          name: classes.name,
        },
        section: {
          id: sections.id,
          name: sections.name,
        },
        academicYear: {
          id: academicYears.id,
          name: academicYears.name,
        }
      })
      .from(enrollments)
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .leftJoin(sections, eq(enrollments.sectionId, sections.id))
      .leftJoin(academicYears, eq(enrollments.academicYearId, academicYears.id))
      .where(and(...whereConditions))
      .orderBy(desc(enrollments.enrolledAt));

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error fetching student enrollments:', error);
      return { success: false, error: error.message || 'Failed to fetch student enrollments' };
    }
  }

  static async getAll(filters: { 
    branchId?: number; 
    classId?: number;
    sectionId?: number;
    academicYearId?: number;
    status?: string;
  } = {}): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [eq(enrollments.isDeleted, false)];

      if (filters.branchId) {
        whereConditions.push(eq(enrollments.branchId, filters.branchId));
      }

      if (filters.classId) {
        whereConditions.push(eq(enrollments.classId, filters.classId));
      }

      if (filters.sectionId) {
        whereConditions.push(eq(enrollments.sectionId, filters.sectionId));
      }

      if (filters.academicYearId) {
        whereConditions.push(eq(enrollments.academicYearId, filters.academicYearId));
      }

      if (filters.status) {
        whereConditions.push(eq(enrollments.status, filters.status));
      }

      const result = await db.select({
        id: enrollments.id,
        studentId: enrollments.studentId,
        branchId: enrollments.branchId,
        classId: enrollments.classId,
        sectionId: enrollments.sectionId,
        academicYearId: enrollments.academicYearId,
        rollNumber: enrollments.rollNumber,
        status: enrollments.status,
        enrolledAt: enrollments.enrolledAt,
        leftAt: enrollments.leftAt,
        student: {
          id: students.id,
          firstName: students.firstName,
          lastName: students.lastName,
          admissionNumber: students.admissionNumber,
        },
        grade: {
          id: classes.id,
          name: classes.name,
        },
        section: {
          id: sections.id,
          name: sections.name,
        },
        academicYear: {
          id: academicYears.id,
          name: academicYears.name,
        }
      })
      .from(enrollments)
      .leftJoin(students, eq(enrollments.studentId, students.id))
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .leftJoin(sections, eq(enrollments.sectionId, sections.id))
      .leftJoin(academicYears, eq(enrollments.academicYearId, academicYears.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(enrollments.enrolledAt));

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error fetching enrollments:', error);
      return { success: false, error: error.message || 'Failed to fetch enrollments' };
    }
  }

  static async create(data: CreateEnrollmentData): Promise<ServiceResponse<any>> {
    try {
      // Check if student is already enrolled in the same academic year
      const existingEnrollment = await db.select()
        .from(enrollments)
        .where(and(
          eq(enrollments.studentId, data.studentId),
          eq(enrollments.academicYearId, data.academicYearId),
          eq(enrollments.isDeleted, false)
        ))
        .limit(1);

      if (existingEnrollment.length > 0) {
        return { success: false, error: 'Student is already enrolled in this academic year' };
      }

      // Auto-assign roll number if not provided and section is specified
      let rollNumber = data.rollNumber;
      if (!rollNumber && data.sectionId) {
        // Get the highest roll number for this section in the current academic year
        const maxRollResult = await db.select({
          maxRoll: sql<number>`COALESCE(MAX(${enrollments.rollNumber}), 0)`
        })
        .from(enrollments)
        .where(and(
          eq(enrollments.sectionId, data.sectionId),
          eq(enrollments.academicYearId, data.academicYearId),
          eq(enrollments.isDeleted, false)
        ));

        rollNumber = (maxRollResult[0]?.maxRoll || 0) + 1;
      }

      const result = await db.insert(enrollments)
        .values({
          studentId: data.studentId,
          branchId: data.branchId,
          classId: data.classId,
          sectionId: data.sectionId,
          academicYearId: data.academicYearId,
          rollNumber: rollNumber,
          status: data.status || 'ENROLLED',
        })
        .returning({
          id: enrollments.id,
          studentId: enrollments.studentId,
          branchId: enrollments.branchId,
          classId: enrollments.classId,
          sectionId: enrollments.sectionId,
          academicYearId: enrollments.academicYearId,
          rollNumber: enrollments.rollNumber,
          status: enrollments.status,
          enrolledAt: enrollments.enrolledAt,
        });

      return { success: true, data: result[0] };
    } catch (error: any) {
      console.error('Error creating enrollment:', error);
      return { success: false, error: error.message || 'Failed to create enrollment' };
    }
  }

  static async update(data: UpdateEnrollmentData): Promise<ServiceResponse<any>> {
    try {
      const updateData: any = {};
      
      if (data.classId !== undefined) updateData.classId = data.classId;
      if (data.sectionId !== undefined) updateData.sectionId = data.sectionId;
      if (data.rollNumber !== undefined) updateData.rollNumber = data.rollNumber;
      if (data.status !== undefined) updateData.status = data.status;

      const result = await db.update(enrollments)
        .set(updateData)
        .where(eq(enrollments.id, data.id))
        .returning({
          id: enrollments.id,
          studentId: enrollments.studentId,
          branchId: enrollments.branchId,
          classId: enrollments.classId,
          sectionId: enrollments.sectionId,
          academicYearId: enrollments.academicYearId,
          rollNumber: enrollments.rollNumber,
          status: enrollments.status,
          enrolledAt: enrollments.enrolledAt,
          leftAt: enrollments.leftAt,
        });

      if (result.length === 0) {
        return { success: false, error: 'Enrollment not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      console.error('Error updating enrollment:', error);
      return { success: false, error: error.message || 'Failed to update enrollment' };
    }
  }

  static async delete(id: number): Promise<ServiceResponse<boolean>> {
    try {
      // Soft delete by setting leftAt timestamp, status, and isDeleted flag
      const result = await db.update(enrollments)
        .set({ 
          status: 'LEFT',
          leftAt: sql`CURRENT_TIMESTAMP`,
          isDeleted: true
        })
        .where(and(
          eq(enrollments.id, id),
          eq(enrollments.isDeleted, false)
        ))
        .returning({ id: enrollments.id });

      if (result.length === 0) {
        return { success: false, error: 'Enrollment not found' };
      }

      return { success: true, data: true };
    } catch (error: any) {
      console.error('Error deleting enrollment:', error);
      return { success: false, error: error.message || 'Failed to delete enrollment' };
    }
  }

  static async getCurrentEnrollment(studentId: number): Promise<ServiceResponse<any>> {
    try {
      // Get the current academic year's enrollment
      const result = await db.select({
        id: enrollments.id,
        studentId: enrollments.studentId,
        branchId: enrollments.branchId,
        classId: enrollments.classId,
        sectionId: enrollments.sectionId,
        academicYearId: enrollments.academicYearId,
        rollNumber: enrollments.rollNumber,
        status: enrollments.status,
        enrolledAt: enrollments.enrolledAt,
        className: classes.name,
        sectionName: sections.name,
        academicYearName: academicYears.name,
      })
      .from(enrollments)
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .leftJoin(sections, eq(enrollments.sectionId, sections.id))
      .leftJoin(academicYears, eq(enrollments.academicYearId, academicYears.id))
      .where(and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.status, 'ENROLLED'),
        eq(enrollments.isDeleted, false),
        eq(academicYears.isCurrent, true)
      ))
      .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'No current enrollment found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      console.error('Error fetching current enrollment:', error);
      return { success: false, error: error.message || 'Failed to fetch current enrollment' };
    }
  }
}