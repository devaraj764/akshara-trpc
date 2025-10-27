import db from '../db/index.js'
import { attendance, studentAttendanceRecords, enrollments, students, sections, classes, branches, academicYears, personDetails } from '../db/schema.js'
import { eq, and, sql, inArray, desc, gte, lte } from 'drizzle-orm'
import type { ServiceResponse } from '../types.db.js'

export interface CreateAttendanceData {
  date: string
  shift: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'FULL_DAY'
  academicYearId: number
  studentRecords: {
    studentId: number
    enrollmentId: number
    status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY'
    note?: string
  }[]
}

export interface UpdateAttendanceRecordData {
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY'
  note?: string
}

export interface AttendanceFilters {
  date?: string
  startDate?: string
  endDate?: string
  shift?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'FULL_DAY'
  classId?: number
  sectionId?: number
  studentId?: number
}

export class AttendanceService {
  // Create or update attendance for a specific date/shift/branch
  static async markAttendance(
    data: CreateAttendanceData, 
    branchId: number, 
    organizationId: number, 
    markedBy: number
  ): Promise<ServiceResponse<any>> {
    try {
      return await db.transaction(async (tx) => {
        // Check if attendance record already exists for this date/shift/branch
        const existingAttendance = await tx.select()
          .from(attendance)
          .where(and(
            eq(attendance.branchId, branchId),
            eq(attendance.date, data.date),
            eq(attendance.shift, data.shift),
            eq(attendance.academicYearId, data.academicYearId)
          ))
          .limit(1)

        let attendanceRecord
        
        if (existingAttendance.length > 0) {
          attendanceRecord = existingAttendance[0]
        } else {
          // Create new attendance record
          const newAttendance = await tx.insert(attendance)
            .values({
              branchId,
              date: data.date,
              shift: data.shift,
              academicYearId: data.academicYearId
            })
            .returning()
          
          if (!newAttendance[0]) {
            throw new Error('Failed to create attendance record')
          }
          attendanceRecord = newAttendance[0]
        }

        // Verify all enrollments belong to the user's branch
        const enrollmentIds = data.studentRecords.map(r => r.enrollmentId)
        const enrollmentCheck = await tx.select({ id: enrollments.id })
          .from(enrollments)
          .where(and(
            inArray(enrollments.id, enrollmentIds),
            eq(enrollments.branchId, branchId)
          ))

        if (enrollmentCheck.length !== enrollmentIds.length) {
          throw new Error('Some enrollments do not belong to your branch')
        }

        // Upsert student attendance records
        const recordPromises = data.studentRecords.map(async (record) => {
          // Check if record exists
          const existing = await tx.select()
            .from(studentAttendanceRecords)
            .where(and(
              eq(studentAttendanceRecords.attendanceId, attendanceRecord!.id),
              eq(studentAttendanceRecords.studentId, record.studentId)
            ))
            .limit(1)

          if (existing.length > 0) {
            // Update existing record
            return await tx.update(studentAttendanceRecords)
              .set({
                status: record.status,
                note: record.note || null,
                markedBy,
                markedAt: sql`CURRENT_TIMESTAMP`
              })
              .where(eq(studentAttendanceRecords.id, existing[0]!.id))
              .returning()
          } else {
            // Insert new record
            return await tx.insert(studentAttendanceRecords)
              .values({
                attendanceId: attendanceRecord!.id,
                studentId: record.studentId,
                enrollmentId: record.enrollmentId,
                status: record.status,
                note: record.note || null,
                markedBy
              })
              .returning()
          }
        })

        const results = await Promise.all(recordPromises)
        
        return {
          success: true,
          data: {
            attendance: attendanceRecord,
            records: results.flat()
          }
        }
      })
    } catch (error: any) {
      console.error('Error marking attendance:', error)
      return { success: false, error: error.message || 'Failed to mark attendance' }
    }
  }

  // Get attendance for a specific date/shift/branch with student details
  static async getAttendanceByDate(
    date: string,
    shift: string,
    branchId: number,
    organizationId: number,
    filters: AttendanceFilters = {}
  ): Promise<ServiceResponse<any>> {
    try {
      // Build the query conditions
      const conditions = [
        eq(attendance.branchId, branchId),
        eq(attendance.date, date),
        eq(attendance.shift, shift as any)
      ]

      // Get attendance record
      const attendanceRecord = await db.select()
        .from(attendance)
        .where(and(...conditions))
        .limit(1)

      if (attendanceRecord.length === 0) {
        return { success: true, data: null }
      }

      // Build student query conditions
      const studentConditions = [
        eq(studentAttendanceRecords.attendanceId, attendanceRecord[0]!.id),
        eq(enrollments.branchId, branchId)
      ]

      if (filters.classId) {
        studentConditions.push(eq(enrollments.classId, filters.classId))
      }

      if (filters.sectionId) {
        studentConditions.push(eq(enrollments.sectionId, filters.sectionId))
      }

      if (filters.studentId) {
        studentConditions.push(eq(studentAttendanceRecords.studentId, filters.studentId))
      }

      // Get student attendance records with student details
      const records = await db.select({
        id: studentAttendanceRecords.id,
        studentId: studentAttendanceRecords.studentId,
        enrollmentId: studentAttendanceRecords.enrollmentId,
        status: studentAttendanceRecords.status,
        note: studentAttendanceRecords.note,
        markedBy: studentAttendanceRecords.markedBy,
        markedAt: studentAttendanceRecords.markedAt,
        student: {
          id: students.id,
          firstName: personDetails.firstName,
          lastName: personDetails.lastName,
          admissionNumber: students.admissionNumber,
          photoUrl: personDetails.photoUrl
        },
        enrollment: {
          id: enrollments.id,
          rollNumber: enrollments.rollNumber,
          classId: enrollments.classId,
          sectionId: enrollments.sectionId
        },
        grade: {
          id: classes.id,
          name: classes.name,
          displayName: classes.displayName
        },
        section: {
          id: sections.id,
          name: sections.name
        }
      })
      .from(studentAttendanceRecords)
      .innerJoin(enrollments, eq(studentAttendanceRecords.enrollmentId, enrollments.id))
      .innerJoin(students, eq(studentAttendanceRecords.studentId, students.id))
      .leftJoin(personDetails, eq(students.personDetailId, personDetails.id))
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .leftJoin(sections, eq(enrollments.sectionId, sections.id))
      .where(and(...studentConditions))
      .orderBy(personDetails.firstName, personDetails.lastName)

      return {
        success: true,
        data: {
          attendance: attendanceRecord[0],
          records
        }
      }
    } catch (error: any) {
      console.error('Error fetching attendance:', error)
      return { success: false, error: error.message || 'Failed to fetch attendance' }
    }
  }

  // Get attendance summary for a branch within date range
  static async getAttendanceSummary(
    branchId: number,
    organizationId: number,
    filters: AttendanceFilters = {}
  ): Promise<ServiceResponse<any[]>> {
    try {
      const conditions = [eq(attendance.branchId, branchId)]

      if (filters.startDate) {
        conditions.push(gte(attendance.date, filters.startDate))
      }

      if (filters.endDate) {
        conditions.push(lte(attendance.date, filters.endDate))
      }

      if (filters.shift) {
        conditions.push(eq(attendance.shift, filters.shift))
      }

      const summaryData = await db.select({
        date: attendance.date,
        shift: attendance.shift,
        totalStudents: sql<number>`COUNT(${studentAttendanceRecords.id})`.as('totalStudents'),
        presentCount: sql<number>`COUNT(CASE WHEN ${studentAttendanceRecords.status} = 'PRESENT' THEN 1 END)`.as('presentCount'),
        absentCount: sql<number>`COUNT(CASE WHEN ${studentAttendanceRecords.status} = 'ABSENT' THEN 1 END)`.as('absentCount'),
        leaveCount: sql<number>`COUNT(CASE WHEN ${studentAttendanceRecords.status} = 'LEAVE' THEN 1 END)`.as('leaveCount'),
        holidayCount: sql<number>`COUNT(CASE WHEN ${studentAttendanceRecords.status} = 'HOLIDAY' THEN 1 END)`.as('holidayCount')
      })
      .from(attendance)
      .leftJoin(studentAttendanceRecords, eq(attendance.id, studentAttendanceRecords.attendanceId))
      .where(and(...conditions))
      .groupBy(attendance.date, attendance.shift)
      .orderBy(desc(attendance.date), attendance.shift)

      return { success: true, data: summaryData }
    } catch (error: any) {
      console.error('Error fetching attendance summary:', error)
      return { success: false, error: error.message || 'Failed to fetch attendance summary' }
    }
  }

  // Get student list for attendance marking (enrolled students in a section/grade)
  static async getStudentsForAttendance(
    branchId: number,
    organizationId: number,
    academicYearId: number,
    classId?: number,
    sectionId?: number
  ): Promise<ServiceResponse<any[]>> {
    try {
      console.log('getStudentsForAttendance called with:', {
        branchId,
        organizationId,
        academicYearId,
        classId,
        sectionId
      })

      // Validate required parameters
      if (!branchId || !organizationId || !academicYearId) {
        throw new Error('Missing required parameters: branchId, organizationId, or academicYearId')
      }

      const conditions = [
        eq(enrollments.branchId, branchId),
        eq(enrollments.academicYearId, academicYearId),
        eq(enrollments.status, 'ENROLLED'),
        eq(enrollments.isDeleted, false),
        eq(students.isDeleted, false)
      ]

      if (classId) {
        conditions.push(eq(enrollments.classId, classId))
      }

      if (sectionId) {
        conditions.push(eq(enrollments.sectionId, sectionId))
      }

      console.log('Query conditions:', conditions.length)

      const studentsList = await db.select({
        studentId: students.id,
        enrollmentId: enrollments.id,
        admissionNumber: students.admissionNumber,
        firstName: personDetails.firstName,
        lastName: personDetails.lastName,
        photoUrl: personDetails.photoUrl,
        rollNumber: enrollments.rollNumber,
        classId: enrollments.classId,
        sectionId: enrollments.sectionId,
        grade: {
          id: classes.id,
          name: classes.name,
          displayName: classes.displayName
        },
        section: {
          id: sections.id,
          name: sections.name
        }
      })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .leftJoin(personDetails, eq(students.personDetailId, personDetails.id))
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .leftJoin(sections, eq(enrollments.sectionId, sections.id))
      .where(and(...conditions))
      .orderBy(
        classes.order,
        sections.name,
        enrollments.rollNumber,
        personDetails.firstName,
        personDetails.lastName
      )

      console.log('getStudentsForAttendance query result:', studentsList)
      console.log('Number of students found:', studentsList.length)

      return { success: true, data: studentsList }
    } catch (error: any) {
      console.error('Error fetching students for attendance:', error)
      return { success: false, error: error.message || 'Failed to fetch students' }
    }
  }

  // Update individual student attendance record
  static async updateStudentAttendance(
    recordId: number,
    data: UpdateAttendanceRecordData,
    branchId: number,
    markedBy: number
  ): Promise<ServiceResponse<any>> {
    try {
      // Verify the record belongs to the user's branch
      const record = await db.select({
        id: studentAttendanceRecords.id,
        attendanceId: studentAttendanceRecords.attendanceId
      })
      .from(studentAttendanceRecords)
      .innerJoin(attendance, eq(studentAttendanceRecords.attendanceId, attendance.id))
      .where(and(
        eq(studentAttendanceRecords.id, recordId),
        eq(attendance.branchId, branchId)
      ))
      .limit(1)

      if (record.length === 0) {
        return { success: false, error: 'Attendance record not found or access denied' }
      }

      const updatedRecord = await db.update(studentAttendanceRecords)
        .set({
          status: data.status,
          note: data.note || null,
          markedBy,
          markedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(studentAttendanceRecords.id, recordId))
        .returning()

      return { success: true, data: updatedRecord[0] }
    } catch (error: any) {
      console.error('Error updating student attendance:', error)
      return { success: false, error: error.message || 'Failed to update attendance' }
    }
  }

  // Get attendance statistics for dashboard
  static async getAttendanceStats(
    branchId: number,
    organizationId: number,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<ServiceResponse<any>> {
    try {
      const conditions = [eq(attendance.branchId, branchId)]

      if (dateRange) {
        conditions.push(
          gte(attendance.date, dateRange.startDate),
          lte(attendance.date, dateRange.endDate)
        )
      }

      const stats = await db.select({
        totalAttendanceDays: sql<number>`COUNT(DISTINCT ${attendance.date})`.as('totalAttendanceDays'),
        totalStudentRecords: sql<number>`COUNT(${studentAttendanceRecords.id})`.as('totalStudentRecords'),
        presentCount: sql<number>`COUNT(CASE WHEN ${studentAttendanceRecords.status} = 'PRESENT' THEN 1 END)`.as('presentCount'),
        absentCount: sql<number>`COUNT(CASE WHEN ${studentAttendanceRecords.status} = 'ABSENT' THEN 1 END)`.as('absentCount'),
        leaveCount: sql<number>`COUNT(CASE WHEN ${studentAttendanceRecords.status} = 'LEAVE' THEN 1 END)`.as('leaveCount'),
        averageAttendance: sql<number>`
          CASE 
            WHEN COUNT(${studentAttendanceRecords.id}) > 0 
            THEN ROUND(
              (COUNT(CASE WHEN ${studentAttendanceRecords.status} = 'PRESENT' THEN 1 END) * 100.0) / 
              COUNT(${studentAttendanceRecords.id}), 2
            )
            ELSE 0 
          END
        `.as('averageAttendance')
      })
      .from(attendance)
      .leftJoin(studentAttendanceRecords, eq(attendance.id, studentAttendanceRecords.attendanceId))
      .where(and(...conditions))

      return { success: true, data: stats[0] || {} }
    } catch (error: any) {
      console.error('Error fetching attendance stats:', error)
      return { success: false, error: error.message || 'Failed to fetch attendance statistics' }
    }
  }
}