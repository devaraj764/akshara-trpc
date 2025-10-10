import { z } from 'zod';
import { router, protectedProcedure, adminProcedure, TRPCError } from '../trpc.js';
import { OrganizationStatisticsService } from '../services/organizationStatisticsService.js';

export const organizationStatisticsRouter = router({
  getOrganizationStats: adminProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await OrganizationStatisticsService.generateOrganizationStats(input.organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to generate organization statistics',
        });
      }
      
      return result.data;
    }),

  getOrganizationStatsMarkdown: adminProcedure
    .input(z.object({
      organizationId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await OrganizationStatisticsService.generateOrganizationStats(input.organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to generate organization statistics',
        });
      }
      
      const markdown = OrganizationStatisticsService.generateMarkdownReport(result.data!);
      return { markdown };
    }),

  getUserOrganizationStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Only admins can access organization stats
      if (ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to organization statistics',
        });
      }

      if (!ctx.user.organizationId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User is not assigned to any organization',
        });
      }

      const result = await OrganizationStatisticsService.generateOrganizationStats(ctx.user.organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to generate organization statistics',
        });
      }
      
      return result.data;
    }),

  getUserOrganizationStatsMarkdown: protectedProcedure
    .query(async ({ ctx }) => {
      // Only admins can access organization stats
      if (ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied to organization statistics',
        });
      }

      if (!ctx.user.organizationId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User is not assigned to any organization',
        });
      }

      const result = await OrganizationStatisticsService.generateOrganizationStats(ctx.user.organizationId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to generate organization statistics',
        });
      }
      
      const markdown = OrganizationStatisticsService.generateMarkdownReport(result.data!);
      return { markdown };
    }),
});