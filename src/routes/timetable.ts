import { z } from 'zod';
import { router, protectedProcedure, branchAdminProcedure, TRPCError } from '../trpc.js';
import { TimetableService, CreateTimetableData, UpdateTimetableData, TimetableFilters } from '../services/timetableService.js';

const createTimetableSchema = z.object({
  sectionId: z.number(),
  classId: z.number(),
  dayOfWeek: z.number().min(1).max(7), // 1-7 (Monday to Sunday)
  periodId: z.number(),
  subjectId: z.number(),
  staffId: z.number().optional(),
});

const updateTimetableSchema = z.object({
  id: z.number(),
  sectionId: z.number().optional(),
  classId: z.number().optional(),
  dayOfWeek: z.number().min(1).max(7).optional(),
  periodId: z.number().optional(),
  subjectId: z.number().optional(),
  staffId: z.number().optional(),
});

const timetableFiltersSchema = z.object({
  sectionId: z.number().optional(),
  classId: z.number().optional(),
  dayOfWeek: z.number().min(1).max(7).optional(),
  periodId: z.number().optional(),
  subjectId: z.number().optional(),
  staffId: z.number().optional(),
});

export const timetableRouter = router({
  // Create timetable entry
  create: branchAdminProcedure
    .input(createTimetableSchema)
    .mutation(async ({ input, ctx }) => {
      const data: CreateTimetableData = {
        ...input,
        branchId: ctx.user.branchId!,
      };

      const result = await TimetableService.create(data);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create timetable entry',
        });
      }
      
      return result.data;
    }),

  // Update timetable entry
  update: branchAdminProcedure
    .input(updateTimetableSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await TimetableService.update(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update timetable entry',
        });
      }
      
      return result.data;
    }),

  // Delete timetable entry
  delete: branchAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await TimetableService.delete(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to delete timetable entry',
        });
      }
      
      return { success: true };
    }),

  // Get all timetable entries with filters
  getAll: protectedProcedure
    .input(timetableFiltersSchema)
    .query(async ({ input, ctx }) => {
      const filters: TimetableFilters = {
        ...input,
        branchId: ctx.user.branchId!,
      };

      const result = await TimetableService.getAll(filters);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch timetable entries',
        });
      }
      
      return result.data;
    }),

  // Get timetable grid for a specific section
  getTimetableGrid: protectedProcedure
    .input(z.object({ sectionId: z.number() }))
    .query(async ({ input, ctx }) => {
      const result = await TimetableService.getTimetableGrid(
        input.sectionId, 
        ctx.user.branchId!
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch timetable grid',
        });
      }
      
      return result.data;
    }),

  // Get available subjects for a section
  getAvailableSubjects: protectedProcedure
    .input(z.object({ sectionId: z.number() }))
    .query(async ({ input }) => {
      const result = await TimetableService.getAvailableSubjects(input.sectionId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch available subjects',
        });
      }
      
      return result.data;
    }),

  // Check staff conflicts for a time slot
  checkStaffConflicts: protectedProcedure
    .input(z.object({
      staffId: z.number(),
      dayOfWeek: z.number().min(1).max(7),
      periodId: z.number(),
      excludeTimetableId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const result = await TimetableService.checkStaffConflicts(
        input.staffId,
        input.dayOfWeek,
        input.periodId,
        input.excludeTimetableId
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to check staff conflicts',
        });
      }
      
      return result.data;
    }),

  // Get available staff
  getAvailableStaff: protectedProcedure
    .query(async ({ ctx }) => {
      const result = await TimetableService.getAvailableStaff(ctx.user.branchId!);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch available staff',
        });
      }
      
      return result.data;
    }),
});