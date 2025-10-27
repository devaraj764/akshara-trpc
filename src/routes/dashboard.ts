import { z } from 'zod';
import { router, adminProcedure, branchAdminProcedure, TRPCError } from '../trpc.js';
import { DashboardService } from '../services/dashboardService.js';

export const dashboardRouter = router({
  // Admin Dashboard - Get comprehensive dashboard data for organization admins
  getAdminDashboard: adminProcedure
    .input(z.object({
      organizationId: z.number().int().positive().optional()
    }))
    .query(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        
        if (!organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization ID is required'
          });
        }

        const result = await DashboardService.getAdminDashboardData(organizationId);

        if (!result.success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: result.error || 'Failed to fetch admin dashboard data'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch admin dashboard data'
        });
      }
    }),

  // Branch Admin Dashboard - Get dashboard data specific to a branch
  getBranchDashboard: branchAdminProcedure
    .input(z.object({
      branchId: z.number().int().positive().optional()
    }))
    .query(async ({ input, ctx }) => {
      try {
        const branchId = input.branchId || ctx.user.branchId;
        const organizationId = ctx.user.organizationId;
        
        if (!branchId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Branch ID is required'
          });
        }

        if (!organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization ID is required'
          });
        }

        const result = await DashboardService.getBranchDashboardData(branchId, organizationId);

        if (!result.success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: result.error || 'Failed to fetch branch dashboard data'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch branch dashboard data'
        });
      }
    }),

  // Quick Stats for both admin and branch admin - lightweight endpoint for frequent updates
  getQuickStats: branchAdminProcedure
    .input(z.object({
      organizationId: z.number().int().positive().optional(),
      branchId: z.number().int().positive().optional()
    }))
    .query(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const branchId = input.branchId || ctx.user.branchId;
        
        if (!organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization ID is required'
          });
        }

        // If branchId is provided, get branch-specific stats, otherwise get organization stats
        let result;
        if (branchId && ctx.user.role === 'BRANCH_ADMIN') {
          result = await DashboardService.getBranchDashboardData(branchId, organizationId);
          return {
            type: 'branch',
            stats: result.data?.overviewStats || {},
            todaySummary: result.data?.todaySummary || {}
          };
        } else {
          result = await DashboardService.getAdminDashboardData(organizationId);
          return {
            type: 'admin',
            stats: result.data?.overviewStats || {},
            recentCount: {
              students: result.data?.recentActivities?.recentStudents?.length || 0,
              staff: result.data?.recentActivities?.recentStaff?.length || 0,
              payments: result.data?.recentActivities?.recentPayments?.length || 0
            }
          };
        }
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch quick stats'
        });
      }
    }),

  // Get Recent Activities - for real-time updates on dashboard
  getRecentActivities: adminProcedure
    .input(z.object({
      organizationId: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(50).optional().default(10),
      type: z.enum(['students', 'staff', 'payments', 'all']).optional().default('all')
    }))
    .query(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        
        if (!organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization ID is required'
          });
        }

        const result = await DashboardService.getAdminDashboardData(organizationId);

        if (!result.success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: result.error || 'Failed to fetch recent activities'
          });
        }

        const activities = result.data.recentActivities;
        
        // Filter based on type and limit
        switch (input.type) {
          case 'students':
            return { students: activities.recentStudents.slice(0, input.limit) };
          case 'staff':
            return { staff: activities.recentStaff.slice(0, input.limit) };
          case 'payments':
            return { payments: activities.recentPayments.slice(0, input.limit) };
          default:
            return {
              students: activities.recentStudents.slice(0, input.limit),
              staff: activities.recentStaff.slice(0, input.limit),
              payments: activities.recentPayments.slice(0, input.limit)
            };
        }
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch recent activities'
        });
      }
    }),

  // Get Financial Summary - dedicated endpoint for financial data
  getFinancialSummary: branchAdminProcedure
    .input(z.object({
      organizationId: z.number().int().positive().optional(),
      branchId: z.number().int().positive().optional(),
      period: z.enum(['today', 'week', 'month', 'year']).optional().default('month')
    }))
    .query(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const branchId = input.branchId || ctx.user.branchId;
        
        if (!organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization ID is required'
          });
        }

        // Get appropriate financial data based on user role and request
        let result;
        if (branchId && ctx.user.role === 'BRANCH_ADMIN') {
          result = await DashboardService.getBranchDashboardData(branchId, organizationId);
          return {
            type: 'branch',
            financial: result.data?.financialData || {},
            overview: result.data?.overviewStats || {}
          };
        } else {
          result = await DashboardService.getAdminDashboardData(organizationId);
          return {
            type: 'admin',
            financial: result.data?.financialSummary || {},
            branchPerformance: result.data?.branchPerformance || {}
          };
        }
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch financial summary'
        });
      }
    }),

  // Get Attendance Summary - for attendance analytics
  getAttendanceSummary: branchAdminProcedure
    .input(z.object({
      organizationId: z.number().int().positive().optional(),
      branchId: z.number().int().positive().optional(),
      period: z.enum(['today', 'week', 'month']).optional().default('week')
    }))
    .query(async ({ input, ctx }) => {
      try {
        const organizationId = input.organizationId || ctx.user.organizationId;
        const branchId = input.branchId || ctx.user.branchId;
        
        if (!organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization ID is required'
          });
        }

        if (branchId && ctx.user.role === 'BRANCH_ADMIN') {
          const result = await DashboardService.getBranchDashboardData(branchId, organizationId);
          return {
            type: 'branch',
            todayAttendance: result.data?.overviewStats?.todayAttendance || 0,
            todaySummary: result.data?.todaySummary || {},
            trends: result.data?.studentDistribution?.attendanceTrends || []
          };
        } else {
          const result = await DashboardService.getAdminDashboardData(organizationId);
          return {
            type: 'admin',
            overallRate: result.data?.overviewStats?.overallAttendanceRate || 0,
            branchAttendance: result.data?.branchPerformance?.attendanceByBranch || []
          };
        }
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch attendance summary'
        });
      }
    }),
});