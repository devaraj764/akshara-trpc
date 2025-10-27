import { z } from 'zod';
import { router, protectedProcedure, branchAdminProcedure, teacherProcedure, TRPCError } from '../trpc.js';
import { AttendanceService } from '../services/attendanceService.js';

// Validation schemas
const createAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  shift: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'FULL_DAY']),
  academicYearId: z.number().positive(),
  studentRecords: z.array(
    z.object({
      studentId: z.number().positive(),
      enrollmentId: z.number().positive(),
      status: z.enum(['PRESENT', 'ABSENT', 'LEAVE', 'HOLIDAY']),
      note: z.string().optional(),
    })
  ).min(1, 'At least one student record is required'),
});

const updateAttendanceRecordSchema = z.object({
  recordId: z.number().positive(),
  status: z.enum(['PRESENT', 'ABSENT', 'LEAVE', 'HOLIDAY']),
  note: z.string().optional(),
});

const getAttendanceByDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  shift: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'FULL_DAY']),
  classId: z.number().positive().optional(),
  sectionId: z.number().positive().optional(),
  studentId: z.number().positive().optional(),
});

const getAttendanceSummarySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  shift: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'FULL_DAY']).optional(),
  classId: z.number().positive().optional(),
  sectionId: z.number().positive().optional(),
});

const getStudentsForAttendanceSchema = z.object({
  academicYearId: z.number().positive(),
  classId: z.number().positive().optional(),
  sectionId: z.number().positive().optional(),
});

const getAttendanceStatsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const attendanceRouter = router({
  // Mark attendance for students - Only Branch Admin or assigned Teacher can mark
  markAttendance: branchAdminProcedure
    .input(createAttendanceSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.branchId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Branch ID is required for attendance operations',
        });
      }

      if (!ctx.user?.organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization ID is required for attendance operations',
        });
      }

      const result = await AttendanceService.markAttendance(
        input,
        ctx.user.branchId,
        ctx.user.organizationId,
        ctx.user.id
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to mark attendance',
        });
      }

      return result.data;
    }),

  // Mark attendance for teachers (can only mark for their assigned sections)
  markAttendanceByTeacher: teacherProcedure
    .input(createAttendanceSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.branchId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Branch ID is required for attendance operations',
        });
      }

      if (!ctx.user?.organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization ID is required for attendance operations',
        });
      }

      // Note: In a full implementation, you would check if the teacher is assigned to the sections
      // For now, teachers can mark attendance for any section in their branch
      const result = await AttendanceService.markAttendance(
        input,
        ctx.user.branchId,
        ctx.user.organizationId,
        ctx.user.id
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to mark attendance',
        });
      }

      return result.data;
    }),

  // Get attendance by specific date and shift
  getByDate: protectedProcedure
    .input(getAttendanceByDateSchema)
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.branchId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Branch ID is required for attendance operations',
        });
      }

      if (!ctx.user?.organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization ID is required for attendance operations',
        });
      }

      const result = await AttendanceService.getAttendanceByDate(
        input.date,
        input.shift,
        ctx.user.branchId,
        ctx.user.organizationId,
        {
          classId: input.classId,
          sectionId: input.sectionId,
          studentId: input.studentId,
        }
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch attendance',
        });
      }

      return result.data;
    }),

  // Get attendance summary with filters
  getSummary: protectedProcedure
    .input(getAttendanceSummarySchema)
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.branchId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Branch ID is required for attendance operations',
        });
      }

      if (!ctx.user?.organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization ID is required for attendance operations',
        });
      }

      const result = await AttendanceService.getAttendanceSummary(
        ctx.user.branchId,
        ctx.user.organizationId,
        {
          startDate: input.startDate,
          endDate: input.endDate,
          shift: input.shift,
          classId: input.classId,
          sectionId: input.sectionId,
        }
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch attendance summary',
        });
      }

      return result.data;
    }),

  // Get students list for attendance marking
  getStudentsForAttendance: protectedProcedure
    .input(getStudentsForAttendanceSchema)
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.branchId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Branch ID is required for attendance operations',
        });
      }

      if (!ctx.user?.organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization ID is required for attendance operations',
        });
      }

      const result = await AttendanceService.getStudentsForAttendance(
        ctx.user.branchId,
        ctx.user.organizationId,
        input.academicYearId,
        input.classId,
        input.sectionId
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch students',
        });
      }

      return result.data;
    }),

  // Update individual student attendance record
  updateStudentAttendance: branchAdminProcedure
    .input(updateAttendanceRecordSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.branchId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Branch ID is required for attendance operations',
        });
      }

      const result = await AttendanceService.updateStudentAttendance(
        input.recordId,
        {
          status: input.status,
          note: input.note,
        },
        ctx.user.branchId,
        ctx.user.id
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update attendance record',
        });
      }

      return result.data;
    }),

  // Update by teacher (can only update records they marked or for their assigned sections)
  updateStudentAttendanceByTeacher: teacherProcedure
    .input(updateAttendanceRecordSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.branchId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Branch ID is required for attendance operations',
        });
      }

      // Note: In a full implementation, you would check if the teacher owns this record
      const result = await AttendanceService.updateStudentAttendance(
        input.recordId,
        {
          status: input.status,
          note: input.note,
        },
        ctx.user.branchId,
        ctx.user.id
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update attendance record',
        });
      }

      return result.data;
    }),

  // Get attendance statistics for dashboard
  getStats: protectedProcedure
    .input(getAttendanceStatsSchema)
    .query(async ({ input, ctx }) => {
      if (!ctx.user?.branchId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Branch ID is required for attendance operations',
        });
      }

      if (!ctx.user?.organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization ID is required for attendance operations',
        });
      }

      const dateRange = input.startDate && input.endDate ? {
        startDate: input.startDate,
        endDate: input.endDate,
      } : undefined;

      const result = await AttendanceService.getAttendanceStats(
        ctx.user.branchId,
        ctx.user.organizationId,
        dateRange
      );

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to fetch attendance statistics',
        });
      }

      return result.data;
    }),
});