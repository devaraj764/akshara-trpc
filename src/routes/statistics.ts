import { z } from 'zod';
import { router, protectedProcedure, adminProcedure, TRPCError } from '../trpc.js';
import { StatisticsService } from '../services/statisticsService.js';

export const statisticsRouter = router({
  getOrganizationStats: adminProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await StatisticsService.generateOrganizationStats(input.organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to generate organization statistics',
        });
      }
      
      return result.data;
    }),

  getBranchStats: protectedProcedure
    .input(z.object({
      branchId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      // Check if user has access to this branch
      const hasAccess = 
        ctx.user.role === 'SUPER_ADMIN' || 
        ctx.user.role === 'ADMIN' || 
        (ctx.user.branchId === input.branchId && 
         (ctx.user.role === 'BRANCH_ADMIN' || ctx.user.role === 'TEACHER' || ctx.user.role === 'STAFF' || ctx.user.role === 'ACCOUNTANT'));
      
      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Access denied to branch statistics. User role: ${ctx.user.role}, User branch: ${ctx.user.branchId}, Requested branch: ${input.branchId}`,
        });
      }

      const result = await StatisticsService.generateBranchStats(input.branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to generate branch statistics',
        });
      }
      
      return result.data;
    }),

  getOrganizationStatsMarkdown: adminProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await StatisticsService.generateOrganizationStats(input.organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to generate organization statistics',
        });
      }
      
      const markdown = StatisticsService.generateMarkdownReport(result.data!, 'organization');
      return { markdown };
    }),

  getBranchStatsMarkdown: protectedProcedure
    .input(z.object({
      branchId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      // Check if user has access to this branch
      const hasAccess = 
        ctx.user.role === 'SUPER_ADMIN' || 
        ctx.user.role === 'ADMIN' || 
        (ctx.user.branchId === input.branchId && 
         (ctx.user.role === 'BRANCH_ADMIN' || ctx.user.role === 'TEACHER' || ctx.user.role === 'STAFF' || ctx.user.role === 'ACCOUNTANT'));
      
      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Access denied to branch statistics. User role: ${ctx.user.role}, User branch: ${ctx.user.branchId}, Requested branch: ${input.branchId}`,
        });
      }

      const result = await StatisticsService.generateBranchStats(input.branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to generate branch statistics',
        });
      }
      
      const markdown = StatisticsService.generateMarkdownReport(result.data!, 'branch');
      return { markdown };
    }),

  getUserStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Return stats based on user's role and access level
      
      // Organization-level admins get organization stats
      if ((ctx.user.role === 'SUPER_ADMIN' || ctx.user.role === 'ADMIN') && ctx.user.organizationId) {
        const result = await StatisticsService.generateOrganizationStats(ctx.user.organizationId);
        if (result.success) {
          return { type: 'organization', data: result.data };
        }
      }
      
      // Branch admins and other branch-level users get branch stats
      if (ctx.user.branchId && (ctx.user.role === 'BRANCH_ADMIN' || ctx.user.role === 'TEACHER' || ctx.user.role === 'STAFF' || ctx.user.role === 'ACCOUNTANT')) {
        const result = await StatisticsService.generateBranchStats(ctx.user.branchId);
        if (result.success) {
          return { type: 'branch', data: result.data };
        }
      }
      
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No statistics available for user role: ${ctx.user.role}. Organization ID: ${ctx.user.organizationId}, Branch ID: ${ctx.user.branchId}`,
      });
    }),

  getUserStatsMarkdown: protectedProcedure
    .query(async ({ ctx }) => {
      // Return markdown stats based on user's role and access level
      
      // Organization-level admins get organization stats
      if ((ctx.user.role === 'SUPER_ADMIN' || ctx.user.role === 'ADMIN') && ctx.user.organizationId) {
        const result = await StatisticsService.generateOrganizationStats(ctx.user.organizationId);
        if (result.success) {
          const markdown = StatisticsService.generateMarkdownReport(result.data!, 'organization');
          return { type: 'organization', markdown };
        }
      }
      
      // Branch admins and other branch-level users get branch stats
      if (ctx.user.branchId && (ctx.user.role === 'BRANCH_ADMIN' || ctx.user.role === 'TEACHER' || ctx.user.role === 'STAFF' || ctx.user.role === 'ACCOUNTANT')) {
        const result = await StatisticsService.generateBranchStats(ctx.user.branchId);
        if (result.success) {
          const markdown = StatisticsService.generateMarkdownReport(result.data!, 'branch');
          return { type: 'branch', markdown };
        }
      }
      
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `No statistics available for user role: ${ctx.user.role}. Organization ID: ${ctx.user.organizationId}, Branch ID: ${ctx.user.branchId}`,
      });
    }),
});