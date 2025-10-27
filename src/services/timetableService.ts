import { eq, and, or, sql, count, desc } from 'drizzle-orm';
import db from '../db/index.js';
import { 
  timetables, 
  sections, 
  classes, 
  periods, 
  subjects, 
  staff, 
  subjectAssignments,
  personDetails 
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreateTimetableData {
  branchId: number;
  sectionId: number;
  classId: number;
  dayOfWeek: number; // 1-7 (Monday to Sunday)
  periodId: number;
  subjectId: number;
  staffId?: number;
}

export interface UpdateTimetableData extends Partial<CreateTimetableData> {
  id: number;
}

export interface TimetableFilters {
  branchId?: number;
  sectionId?: number;
  classId?: number;
  dayOfWeek?: number;
  periodId?: number;
  subjectId?: number;
  staffId?: number;
}

export interface TimetableGridData {
  periodId: number;
  periodName: string;
  startTime: string;
  endTime: string;
  order: number;
  isBreak: boolean;
  days: {
    [dayOfWeek: number]: {
      id?: number;
      subjectId?: number;
      subjectName?: string;
      staffId?: number;
      staffName?: string;
      hasConflict?: boolean;
    };
  };
}

export class TimetableService {
  // Create a new timetable entry
  static async create(data: CreateTimetableData): Promise<ServiceResponse<any>> {
    try {
      // Check for conflicts - same section/period/day or same staff/period/day
      const conflicts = await db
        .select({ id: timetables.id })
        .from(timetables)
        .where(
          or(
            // Section conflict
            and(
              eq(timetables.sectionId, data.sectionId),
              eq(timetables.dayOfWeek, data.dayOfWeek),
              eq(timetables.periodId, data.periodId)
            ),
            // Staff conflict (if staff is assigned)
            data.staffId ? and(
              eq(timetables.staffId, data.staffId),
              eq(timetables.dayOfWeek, data.dayOfWeek),
              eq(timetables.periodId, data.periodId)
            ) : sql`false`
          )
        )
        .limit(1);

      if (conflicts.length > 0) {
        return {
          success: false,
          error: 'Timetable conflict: This slot is already occupied'
        };
      }

      const [timetable] = await db.insert(timetables).values(data).returning();

      return {
        success: true,
        data: timetable
      };
    } catch (error: any) {
      console.error('TimetableService.create error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create timetable entry'
      };
    }
  }

  // Update timetable entry
  static async update(data: UpdateTimetableData): Promise<ServiceResponse<any>> {
    try {
      // Check for conflicts if relevant fields are being updated
      if (data.sectionId || data.dayOfWeek || data.periodId || data.staffId) {
        const conflicts = await db
          .select({ id: timetables.id })
          .from(timetables)
          .where(
            and(
              sql`${timetables.id} != ${data.id}`, // Exclude current record
              or(
                // Section conflict
                and(
                  eq(timetables.sectionId, data.sectionId || sql`${timetables.sectionId}`),
                  eq(timetables.dayOfWeek, data.dayOfWeek || sql`${timetables.dayOfWeek}`),
                  eq(timetables.periodId, data.periodId || sql`${timetables.periodId}`)
                ),
                // Staff conflict (if staff is assigned)
                data.staffId ? and(
                  eq(timetables.staffId, data.staffId),
                  eq(timetables.dayOfWeek, data.dayOfWeek || sql`${timetables.dayOfWeek}`),
                  eq(timetables.periodId, data.periodId || sql`${timetables.periodId}`)
                ) : sql`false`
              )
            )
          )
          .limit(1);

        if (conflicts.length > 0) {
          return {
            success: false,
            error: 'Timetable conflict: This slot is already occupied'
          };
        }
      }

      const { id, ...updateData } = data;
      const [updatedTimetable] = await db
        .update(timetables)
        .set(updateData)
        .where(eq(timetables.id, id))
        .returning();

      return {
        success: true,
        data: updatedTimetable
      };
    } catch (error: any) {
      console.error('TimetableService.update error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update timetable entry'
      };
    }
  }

  // Delete timetable entry
  static async delete(id: number): Promise<ServiceResponse<any>> {
    try {
      await db.delete(timetables).where(eq(timetables.id, id));

      return {
        success: true,
        data: { deleted: true }
      };
    } catch (error: any) {
      console.error('TimetableService.delete error:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete timetable entry'
      };
    }
  }

  // Get timetable entries with filters
  static async getAll(filters: TimetableFilters = {}): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [];

      if (filters.branchId) {
        whereConditions.push(eq(timetables.branchId, filters.branchId));
      }
      if (filters.sectionId) {
        whereConditions.push(eq(timetables.sectionId, filters.sectionId));
      }
      if (filters.classId) {
        whereConditions.push(eq(timetables.classId, filters.classId));
      }
      if (filters.dayOfWeek) {
        whereConditions.push(eq(timetables.dayOfWeek, filters.dayOfWeek));
      }
      if (filters.periodId) {
        whereConditions.push(eq(timetables.periodId, filters.periodId));
      }
      if (filters.subjectId) {
        whereConditions.push(eq(timetables.subjectId, filters.subjectId));
      }
      if (filters.staffId) {
        whereConditions.push(eq(timetables.staffId, filters.staffId));
      }

      const result = await db
        .select({
          id: timetables.id,
          branchId: timetables.branchId,
          sectionId: timetables.sectionId,
          classId: timetables.classId,
          dayOfWeek: timetables.dayOfWeek,
          periodId: timetables.periodId,
          subjectId: timetables.subjectId,
          staffId: timetables.staffId,
          // Period details
          periodName: periods.name,
          startTime: periods.startTime,
          endTime: periods.endTime,
          periodOrder: periods.order,
          // Subject details
          subjectName: subjects.name,
          subjectCode: subjects.code,
          // Staff details
          staffFirstName: personDetails.firstName,
          staffLastName: personDetails.lastName,
          // Section details
          sectionName: sections.name,
          // Class details
          className: classes.name,
          classDisplayName: classes.displayName,
        })
        .from(timetables)
        .innerJoin(periods, eq(timetables.periodId, periods.id))
        .innerJoin(subjects, eq(timetables.subjectId, subjects.id))
        .innerJoin(sections, eq(timetables.sectionId, sections.id))
        .innerJoin(classes, eq(timetables.classId, classes.id))
        .leftJoin(staff, eq(timetables.staffId, staff.id))
        .leftJoin(personDetails, eq(staff.personDetailId, personDetails.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(timetables.dayOfWeek, periods.order);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('TimetableService.getAll error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch timetable entries'
      };
    }
  }

  // Get timetable in grid format for a specific section
  static async getTimetableGrid(sectionId: number, branchId: number): Promise<ServiceResponse<TimetableGridData[]>> {
    try {
      // Get all periods for the branch
      const periodsData = await db
        .select({
          id: periods.id,
          name: periods.name,
          startTime: periods.startTime,
          endTime: periods.endTime,
          order: periods.order,
          isBreak: periods.isBreak,
        })
        .from(periods)
        .where(eq(periods.branchId, branchId))
        .orderBy(periods.order);

      // Get all timetable entries for the section
      const timetableEntries = await db
        .select({
          id: timetables.id,
          dayOfWeek: timetables.dayOfWeek,
          periodId: timetables.periodId,
          subjectId: timetables.subjectId,
          staffId: timetables.staffId,
          subjectName: subjects.name,
          staffFirstName: personDetails.firstName,
          staffLastName: personDetails.lastName,
        })
        .from(timetables)
        .innerJoin(subjects, eq(timetables.subjectId, subjects.id))
        .leftJoin(staff, eq(timetables.staffId, staff.id))
        .leftJoin(personDetails, eq(staff.personDetailId, personDetails.id))
        .where(eq(timetables.sectionId, sectionId));

      // Build grid data
      const gridData: TimetableGridData[] = periodsData.map(period => ({
        periodId: period.id,
        periodName: period.name || `Period ${period.order}`,
        startTime: period.startTime || '',
        endTime: period.endTime || '',
        order: period.order || 0,
        isBreak: period.isBreak || false,
        days: {}
      }));

      // Populate grid with timetable entries
      timetableEntries.forEach(entry => {
        const periodData = gridData.find(p => p.periodId === entry.periodId);
        if (periodData) {
          periodData.days[entry.dayOfWeek] = {
            id: entry.id,
            subjectId: entry.subjectId,
            subjectName: entry.subjectName,
            staffId: entry.staffId,
            staffName: entry.staffFirstName && entry.staffLastName 
              ? `${entry.staffFirstName} ${entry.staffLastName}` 
              : undefined,
          };
        }
      });

      return {
        success: true,
        data: gridData
      };
    } catch (error: any) {
      console.error('TimetableService.getTimetableGrid error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch timetable grid'
      };
    }
  }

  // Get available subjects for a section (from subject assignments)
  static async getAvailableSubjects(sectionId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          staffId: subjectAssignments.staffId,
          staffFirstName: personDetails.firstName,
          staffLastName: personDetails.lastName,
        })
        .from(subjectAssignments)
        .innerJoin(subjects, eq(subjectAssignments.subjectId, subjects.id))
        .leftJoin(staff, eq(subjectAssignments.staffId, staff.id))
        .leftJoin(personDetails, eq(staff.personDetailId, personDetails.id))
        .where(eq(subjectAssignments.sectionId, sectionId));

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('TimetableService.getAvailableSubjects error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch available subjects'
      };
    }
  }

  // Check staff conflicts for a specific time slot
  static async checkStaffConflicts(
    staffId: number, 
    dayOfWeek: number, 
    periodId: number, 
    excludeTimetableId?: number
  ): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [
        eq(timetables.staffId, staffId),
        eq(timetables.dayOfWeek, dayOfWeek),
        eq(timetables.periodId, periodId)
      ];

      if (excludeTimetableId) {
        whereConditions.push(sql`${timetables.id} != ${excludeTimetableId}`);
      }

      const conflicts = await db
        .select({
          id: timetables.id,
          sectionName: sections.name,
          className: classes.name,
          classDisplayName: classes.displayName,
          subjectName: subjects.name,
        })
        .from(timetables)
        .innerJoin(sections, eq(timetables.sectionId, sections.id))
        .innerJoin(classes, eq(timetables.classId, classes.id))
        .innerJoin(subjects, eq(timetables.subjectId, subjects.id))
        .where(and(...whereConditions));

      return {
        success: true,
        data: conflicts
      };
    } catch (error: any) {
      console.error('TimetableService.checkStaffConflicts error:', error);
      return {
        success: false,
        error: error.message || 'Failed to check staff conflicts'
      };
    }
  }

  // Get all available staff for subject assignments
  static async getAvailableStaff(branchId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db
        .select({
          id: staff.id,
          firstName: personDetails.firstName,
          lastName: personDetails.lastName,
          employeeNumber: staff.employeeNumber,
          position: staff.position,
        })
        .from(staff)
        .innerJoin(personDetails, eq(staff.personDetailId, personDetails.id))
        .where(
          and(
            eq(staff.branchId, branchId),
            eq(staff.isActive, true)
          )
        )
        .orderBy(personDetails.firstName);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('TimetableService.getAvailableStaff error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch available staff'
      };
    }
  }
}