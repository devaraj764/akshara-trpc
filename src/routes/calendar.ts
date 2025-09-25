import { z } from 'zod';
import { router, adminProcedure, branchAdminProcedure, TRPCError } from '../trpc.js';
import { CalendarService } from '../services/calendarService.js';

const createCalendarEventSchema = z.object({
  academicYearId: z.number(),
  branchId: z.number().optional(), // null means organization-level event
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  eventType: z.enum(['ACADEMIC', 'HOLIDAY', 'EXAM', 'MEETING', 'WORKSHOP', 'CONFERENCE', 'SPORTS', 'CULTURAL', 'OTHER']).optional().default('ACADEMIC'),
  isHoliday: z.boolean().optional().default(false),
  isFullDay: z.boolean().optional().default(true),
  recurringRule: z.string().optional(),
});

const updateCalendarEventSchema = z.object({
  id: z.number(),
  title: z.string().min(1, 'Event title is required').optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  eventType: z.enum(['ACADEMIC', 'HOLIDAY', 'EXAM', 'MEETING', 'WORKSHOP', 'CONFERENCE', 'SPORTS', 'CULTURAL', 'OTHER']).optional(),
  isHoliday: z.boolean().optional(),
  isFullDay: z.boolean().optional(),
  recurringRule: z.string().optional(),
});

const getCalendarEventsSchema = z.object({
  academicYearId: z.number().optional(),
  branchId: z.number().optional(),
  organizationId: z.number().optional(),
  eventType: z.enum(['ACADEMIC', 'HOLIDAY', 'EXAM', 'MEETING', 'WORKSHOP', 'CONFERENCE', 'SPORTS', 'CULTURAL', 'OTHER']).optional(),
  isHoliday: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  includeOrgEvents: z.boolean().optional().default(true),
});

const dateRangeSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  branchId: z.number().optional(),
});

export const calendarRouter = router({
  // Admin procedures - can manage all events
  create: adminProcedure
    .input(createCalendarEventSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await CalendarService.create({
        ...input,
        branchId: input.branchId ?? null,
        description: input.description ?? null,
        endDate: input.endDate ?? null,
        recurringRule: input.recurringRule ?? null,
        createdBy: ctx.user.id
      });
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to create calendar event',
        });
      }
      
      return result.data;
    }),

  update: adminProcedure
    .input(updateCalendarEventSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const cleanedData = {
        ...updateData,
        description: updateData.description ?? null,
        endDate: updateData.endDate ?? null,
        recurringRule: updateData.recurringRule ?? null
      };
      const result = await CalendarService.update(id, cleanedData);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to update calendar event',
        });
      }
      
      return result.data;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await CalendarService.delete(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to delete calendar event',
        });
      }
      
      return result.data;
    }),

  // Shared procedures - both admin and branch admin
  getAll: adminProcedure
    .input(getCalendarEventsSchema.optional())
    .query(async ({ input, ctx }) => {
      // For admin users, get organization events
      const options = {
        ...input,
        organizationId: ctx.user.organizationId
      };
      
      const result = await CalendarService.getOrganizationEvents(
        ctx.user.organizationId!,
        options.academicYearId
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch calendar events',
        });
      }
      
      return result.data;
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const result = await CalendarService.getById(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch calendar event',
        });
      }
      
      return result.data;
    }),

  // Branch-specific procedures
  getBranchEvents: branchAdminProcedure
    .input(z.object({
      academicYearId: z.number().optional(),
      includeOrgEvents: z.boolean().optional().default(true)
    }).optional())
    .query(async ({ input, ctx }) => {
      const result = await CalendarService.getBranchEvents(
        ctx.user.branchId!,
        input?.academicYearId,
        input?.includeOrgEvents
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch branch calendar events',
        });
      }
      
      return result.data;
    }),

  // Organization-level queries for admins
  getOrganizationEvents: adminProcedure
    .input(z.object({
      academicYearId: z.number().optional(),
      branchId: z.number().optional() // for filtering by specific branch
    }).optional())
    .query(async ({ input, ctx }) => {
      let result;
      
      if (input?.branchId) {
        // Get events for specific branch + org events
        result = await CalendarService.getBranchEvents(
          input.branchId,
          input.academicYearId,
          true
        );
      } else {
        // Get all organization events
        result = await CalendarService.getOrganizationEvents(
          ctx.user.organizationId!,
          input?.academicYearId
        );
      }
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch organization events',
        });
      }
      
      return result.data;
    }),

  getUpcomingEvents: adminProcedure
    .input(z.object({
      branchId: z.number().optional(),
      daysAhead: z.number().optional().default(30)
    }).optional())
    .query(async ({ input }) => {
      const result = await CalendarService.getUpcomingEvents(
        input?.branchId,
        input?.daysAhead
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch upcoming events',
        });
      }
      
      return result.data;
    }),

  getHolidays: adminProcedure
    .input(z.object({
      branchId: z.number().optional(),
      academicYearId: z.number().optional()
    }).optional())
    .query(async ({ input }) => {
      const result = await CalendarService.getHolidays(
        input?.branchId,
        input?.academicYearId
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch holidays',
        });
      }
      
      return result.data;
    }),

  getEventsByDateRange: adminProcedure
    .input(dateRangeSchema)
    .query(async ({ input }) => {
      const result = await CalendarService.getEventsByDateRange(
        input.startDate,
        input.endDate,
        input.branchId
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch events by date range',
        });
      }
      
      return result.data;
    }),

  // Branch admin procedures
  createBranchEvent: branchAdminProcedure
    .input(createCalendarEventSchema.omit({ branchId: true }))
    .mutation(async ({ input, ctx }) => {
      const result = await CalendarService.create({
        ...input,
        branchId: ctx.user.branchId!,
        description: input.description ?? null,
        endDate: input.endDate ?? null,
        recurringRule: input.recurringRule ?? null,
        createdBy: ctx.user.id
      });
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to create branch calendar event',
        });
      }
      
      return result.data;
    }),

  // Utility procedures
  getBranchUpcomingEvents: branchAdminProcedure
    .input(z.object({
      daysAhead: z.number().optional().default(30)
    }).optional())
    .query(async ({ input, ctx }) => {
      const result = await CalendarService.getUpcomingEvents(
        ctx.user.branchId!,
        input?.daysAhead
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch upcoming branch events',
        });
      }
      
      return result.data;
    }),
});