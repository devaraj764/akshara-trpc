import { z } from 'zod';
import { router, protectedProcedure, teacherProcedure, TRPCError } from '../trpc.js';
import { AttendanceService } from '../services/attendanceService.js';

const markAttendanceSchema = z.object({
  studentId: z.number(),
  classId: z.number(),
  date: z.string(),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  notes: z.string().optional(),
});

const updateAttendanceSchema = z.object({
  id: z.number(),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  notes: z.string().optional(),
});

export const attendanceRouter = router({
  getByStudent: protectedProcedure
    .input(z.object({
      studentId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const result = await AttendanceService.getByStudent(input.studentId, input.startDate, input.endDate);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch attendance',
        });
      }
      
      return result.data;
    }),

  getByClass: teacherProcedure
    .input(z.object({
      classId: z.number(),
      date: z.string(),
    }))
    .query(async ({ input }) => {
      const result = await AttendanceService.getByClass(input.classId, input.date);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch class attendance',
        });
      }
      
      return result.data;
    }),

  markAttendance: teacherProcedure
    .input(markAttendanceSchema)
    .mutation(async ({ input }) => {
      const result = await AttendanceService.markAttendance(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to mark attendance',
        });
      }
      
      return result.data;
    }),

  updateAttendance: teacherProcedure
    .input(updateAttendanceSchema)
    .mutation(async ({ input }) => {
      const result = await AttendanceService.updateAttendance(input.id, input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update attendance',
        });
      }
      
      return result.data;
    }),

  getReport: teacherProcedure
    .input(z.object({
      classId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      const result = await AttendanceService.getReport(input.classId, input.startDate, input.endDate);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to generate attendance report',
        });
      }
      
      return result.data;
    }),
});