import { eq, and, sql, desc, isNull, or } from 'drizzle-orm';
import db from '../db/index.js';
import { 
  academicCalendarEvents,
  academicYears,
  branches,
  users
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreateCalendarEventData {
  academicYearId: number;
  branchId?: number | null; // null means organization-level event
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  eventType?: string; // 'ACADEMIC', 'HOLIDAY', 'EXAM', 'MEETING', etc.
  isHoliday?: boolean;
  isFullDay?: boolean;
  recurringRule?: string | null;
  createdBy?: number;
}

export interface UpdateCalendarEventData {
  title?: string;
  description?: string | null;
  startDate?: string;
  endDate?: string | null;
  eventType?: string;
  isHoliday?: boolean;
  isFullDay?: boolean;
  recurringRule?: string | null;
}

export interface GetCalendarEventsOptions {
  academicYearId?: number | null;
  branchId?: number | null;
  organizationId?: number | null;
  eventType?: string;
  isHoliday?: boolean;
  startDate?: string;
  endDate?: string;
  includeOrgEvents?: boolean; // for branch admins to see org-level events
}

export class CalendarService {
  static async create(data: CreateCalendarEventData): Promise<ServiceResponse<any>> {
    try {
      const result = await db.insert(academicCalendarEvents).values({
        academicYearId: data.academicYearId,
        branchId: data.branchId || null,
        title: data.title,
        description: data.description || null,
        startDate: data.startDate,
        endDate: data.endDate || null,
        eventType: data.eventType || 'ACADEMIC',
        isHoliday: data.isHoliday ?? false,
        isFullDay: data.isFullDay ?? true,
        recurringRule: data.recurringRule || null,
        createdBy: data.createdBy || null
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create calendar event' };
    }
  }

  static async getAll(options: GetCalendarEventsOptions = {}): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [];

      if (options.academicYearId) {
        whereConditions.push(eq(academicCalendarEvents.academicYearId, options.academicYearId));
      }

      if (options.eventType) {
        whereConditions.push(eq(academicCalendarEvents.eventType, options.eventType));
      }

      if (options.isHoliday !== undefined) {
        whereConditions.push(eq(academicCalendarEvents.isHoliday, options.isHoliday));
      }

      if (options.startDate) {
        whereConditions.push(sql`${academicCalendarEvents.startDate} >= ${options.startDate}`);
      }

      if (options.endDate) {
        whereConditions.push(sql`${academicCalendarEvents.startDate} <= ${options.endDate}`);
      }

      // Branch filtering logic
      if (options.branchId) {
        if (options.includeOrgEvents) {
          // For branch admins: show both branch-specific and organization-level events
          whereConditions.push(
            or(
              eq(academicCalendarEvents.branchId, options.branchId),
              isNull(academicCalendarEvents.branchId)
            )
          );
        } else {
          // Only branch-specific events
          whereConditions.push(eq(academicCalendarEvents.branchId, options.branchId));
        }
      } else if (options.organizationId) {
        // For admins: can see all events in organization
        // This would require joining with branches table to filter by organizationId
        // For now, we'll return all events and let the client filter
      }

      const result = await db.select({
        id: academicCalendarEvents.id,
        academicYearId: academicCalendarEvents.academicYearId,
        branchId: academicCalendarEvents.branchId,
        title: academicCalendarEvents.title,
        description: academicCalendarEvents.description,
        startDate: academicCalendarEvents.startDate,
        endDate: academicCalendarEvents.endDate,
        eventType: academicCalendarEvents.eventType,
        isHoliday: academicCalendarEvents.isHoliday,
        isFullDay: academicCalendarEvents.isFullDay,
        recurringRule: academicCalendarEvents.recurringRule,
        createdBy: academicCalendarEvents.createdBy,
        createdAt: academicCalendarEvents.createdAt,
        // Academic year info
        academicYearName: academicYears.name,
        academicYearStartDate: academicYears.startDate,
        academicYearEndDate: academicYears.endDate,
        // Branch info
        branchName: branches.name,
        branchCode: branches.code,
        // Creator info
        createdByName: users.displayName,
        createdByEmail: users.email
      })
        .from(academicCalendarEvents)
        .leftJoin(academicYears, eq(academicCalendarEvents.academicYearId, academicYears.id))
        .leftJoin(branches, eq(academicCalendarEvents.branchId, branches.id))
        .leftJoin(users, eq(academicCalendarEvents.createdBy, users.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(academicCalendarEvents.startDate, desc(academicCalendarEvents.createdAt));

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch calendar events' };
    }
  }

  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: academicCalendarEvents.id,
        academicYearId: academicCalendarEvents.academicYearId,
        branchId: academicCalendarEvents.branchId,
        title: academicCalendarEvents.title,
        description: academicCalendarEvents.description,
        startDate: academicCalendarEvents.startDate,
        endDate: academicCalendarEvents.endDate,
        eventType: academicCalendarEvents.eventType,
        isHoliday: academicCalendarEvents.isHoliday,
        isFullDay: academicCalendarEvents.isFullDay,
        recurringRule: academicCalendarEvents.recurringRule,
        createdBy: academicCalendarEvents.createdBy,
        createdAt: academicCalendarEvents.createdAt,
        // Academic year info
        academicYearName: academicYears.name,
        academicYearStartDate: academicYears.startDate,
        academicYearEndDate: academicYears.endDate,
        // Branch info
        branchName: branches.name,
        branchCode: branches.code,
        // Creator info
        createdByName: users.displayName,
        createdByEmail: users.email
      })
        .from(academicCalendarEvents)
        .leftJoin(academicYears, eq(academicCalendarEvents.academicYearId, academicYears.id))
        .leftJoin(branches, eq(academicCalendarEvents.branchId, branches.id))
        .leftJoin(users, eq(academicCalendarEvents.createdBy, users.id))
        .where(eq(academicCalendarEvents.id, id))
        .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Calendar event not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch calendar event' };
    }
  }

  static async update(id: number, data: UpdateCalendarEventData): Promise<ServiceResponse<any>> {
    try {
      const updateData: any = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.startDate !== undefined) updateData.startDate = data.startDate;
      if (data.endDate !== undefined) updateData.endDate = data.endDate;
      if (data.eventType !== undefined) updateData.eventType = data.eventType;
      if (data.isHoliday !== undefined) updateData.isHoliday = data.isHoliday;
      if (data.isFullDay !== undefined) updateData.isFullDay = data.isFullDay;
      if (data.recurringRule !== undefined) updateData.recurringRule = data.recurringRule;

      if (Object.keys(updateData).length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      const result = await db.update(academicCalendarEvents)
        .set(updateData)
        .where(eq(academicCalendarEvents.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Calendar event not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update calendar event' };
    }
  }

  static async delete(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.delete(academicCalendarEvents)
        .where(eq(academicCalendarEvents.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Calendar event not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete calendar event' };
    }
  }

  // Organization Level Methods for Admins
  static async getOrganizationEvents(organizationId: number, academicYearId?: number): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [];
      
      if (academicYearId) {
        whereConditions.push(eq(academicCalendarEvents.academicYearId, academicYearId));
      }

      // Join with branches to filter by organization
      const result = await db.select({
        id: academicCalendarEvents.id,
        academicYearId: academicCalendarEvents.academicYearId,
        branchId: academicCalendarEvents.branchId,
        title: academicCalendarEvents.title,
        description: academicCalendarEvents.description,
        startDate: academicCalendarEvents.startDate,
        endDate: academicCalendarEvents.endDate,
        eventType: academicCalendarEvents.eventType,
        isHoliday: academicCalendarEvents.isHoliday,
        isFullDay: academicCalendarEvents.isFullDay,
        recurringRule: academicCalendarEvents.recurringRule,
        createdBy: academicCalendarEvents.createdBy,
        createdAt: academicCalendarEvents.createdAt,
        // Academic year info
        academicYearName: academicYears.name,
        // Branch info
        branchName: branches.name,
        branchCode: branches.code,
        organizationId: branches.organizationId,
        // Creator info
        createdByName: users.displayName
      })
        .from(academicCalendarEvents)
        .leftJoin(academicYears, eq(academicCalendarEvents.academicYearId, academicYears.id))
        .leftJoin(branches, eq(academicCalendarEvents.branchId, branches.id))
        .leftJoin(users, eq(academicCalendarEvents.createdBy, users.id))
        .where(
          and(
            whereConditions.length > 0 ? and(...whereConditions) : undefined,
            or(
              isNull(academicCalendarEvents.branchId), // Organization-level events
              eq(branches.organizationId, organizationId) // Branch-specific events in this org
            )
          )
        )
        .orderBy(academicCalendarEvents.startDate);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch organization events' };
    }
  }

  // Branch Level Methods for Branch Admins
  static async getBranchEvents(branchId: number, academicYearId?: number, includeOrgEvents: boolean = true): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      branchId,
      academicYearId: academicYearId ?? null,
      includeOrgEvents
    });
  }

  static async getUpcomingEvents(branchId?: number, daysAhead: number = 30): Promise<ServiceResponse<any[]>> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const whereConditions = [
        sql`${academicCalendarEvents.startDate} >= CURRENT_DATE`,
        sql`${academicCalendarEvents.startDate} <= ${futureDate.toISOString()}`
      ];

      if (branchId) {
        whereConditions.push(
          or(
            eq(academicCalendarEvents.branchId, branchId),
            isNull(academicCalendarEvents.branchId)
          )!
        );
      }

      const result = await db.select({
        id: academicCalendarEvents.id,
        title: academicCalendarEvents.title,
        description: academicCalendarEvents.description,
        startDate: academicCalendarEvents.startDate,
        endDate: academicCalendarEvents.endDate,
        isHoliday: academicCalendarEvents.isHoliday,
        branchName: branches.name,
        branchCode: branches.code,
        academicYearName: academicYears.name
      })
        .from(academicCalendarEvents)
        .leftJoin(branches, eq(academicCalendarEvents.branchId, branches.id))
        .leftJoin(academicYears, eq(academicCalendarEvents.academicYearId, academicYears.id))
        .where(and(...whereConditions))
        .orderBy(academicCalendarEvents.startDate)
        .limit(10);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch upcoming events' };
    }
  }

  static async getHolidays(branchId?: number, academicYearId?: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      branchId: branchId ?? null,
      academicYearId: academicYearId ?? null,
      isHoliday: true,
      includeOrgEvents: true
    });
  }

  static async getEventsByDateRange(startDate: string, endDate: string, branchId?: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      startDate,
      endDate,
      branchId: branchId ?? null,
      includeOrgEvents: true
    });
  }
}