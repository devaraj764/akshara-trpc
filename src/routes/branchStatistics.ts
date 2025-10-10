import { z } from 'zod';
import { router, protectedProcedure, TRPCError } from '../trpc.js';
import { BranchStatisticsService } from '../services/branchStatisticsService.js';

export const branchStatisticsRouter = router({
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

      const result = await BranchStatisticsService.generateBranchStats(input.branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to generate branch statistics',
        });
      }
      
      return result.data;
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

      const result = await BranchStatisticsService.generateBranchStats(input.branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to generate branch statistics',
        });
      }
      
      const markdown = BranchStatisticsService.generateMarkdownReport(result.data!);
      return { markdown };
    }),

  getUserBranchStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Get branch stats for the user's current branch
      if (!ctx.user.branchId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User is not assigned to any branch',
        });
      }

      const result = await BranchStatisticsService.generateBranchStats(ctx.user.branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to generate branch statistics',
        });
      }
      
      return result.data;
    }),

  getUserBranchStatsMarkdown: protectedProcedure
    .query(async ({ ctx }) => {
      // Get branch stats markdown for the user's current branch
      if (!ctx.user.branchId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User is not assigned to any branch',
        });
      }

      const result = await BranchStatisticsService.generateBranchStats(ctx.user.branchId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to generate branch statistics',
        });
      }
      
      const markdown = BranchStatisticsService.generateMarkdownReport(result.data!);
      return { markdown };
    }),
});