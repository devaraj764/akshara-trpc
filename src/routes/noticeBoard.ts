import { z } from 'zod';
import { router, adminProcedure, branchAdminProcedure, TRPCError } from '../trpc.js';
import { NoticeBoardService } from '../services/noticeBoardService.js';

const createNoticeSchema = z.object({
  organizationId: z.number().optional(),
  branchId: z.number().optional(),
  title: z.string().min(1, 'Notice title is required'),
  content: z.string().min(1, 'Notice content is required'),
  noticeType: z.enum(['ACADEMIC', 'ADMINISTRATIVE', 'EVENT', 'HOLIDAY', 'EMERGENCY', 'EXAM', 'FEE', 'TRANSPORT', 'GENERAL', 'OTHER']),
  priorityLevel: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL'),
  targetAudience: z.array(z.enum(['STUDENTS', 'TEACHERS', 'PARENTS', 'STAFF', 'ALL'])).optional(),
  targetGrades: z.array(z.number()).optional(),
  targetSections: z.array(z.number()).optional(),
  isUrgent: z.boolean().optional().default(false),
  isPublished: z.boolean().optional().default(false),
  publishDate: z.string().optional(),
  expiryDate: z.string().optional(),
  attachments: z.any().optional(),
});

const updateNoticeSchema = z.object({
  id: z.number(),
  title: z.string().min(1, 'Notice title is required').optional(),
  content: z.string().min(1, 'Notice content is required').optional(),
  noticeType: z.enum(['ACADEMIC', 'ADMINISTRATIVE', 'EVENT', 'HOLIDAY', 'EMERGENCY', 'EXAM', 'FEE', 'TRANSPORT', 'GENERAL', 'OTHER']).optional(),
  priorityLevel: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  targetAudience: z.array(z.enum(['STUDENTS', 'TEACHERS', 'PARENTS', 'STAFF', 'ALL'])).optional(),
  targetGrades: z.array(z.number()).optional(),
  targetSections: z.array(z.number()).optional(),
  isUrgent: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  publishDate: z.string().optional(),
  expiryDate: z.string().optional(),
  attachments: z.any().optional(),
});

const getNoticesSchema = z.object({
  organizationId: z.number().optional(),
  branchId: z.number().optional(),
  noticeType: z.enum(['ACADEMIC', 'ADMINISTRATIVE', 'EVENT', 'HOLIDAY', 'EMERGENCY', 'EXAM', 'FEE', 'TRANSPORT', 'GENERAL', 'OTHER']).optional(),
  priorityLevel: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  isPublished: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
  targetAudience: z.enum(['STUDENTS', 'TEACHERS', 'PARENTS', 'STAFF', 'ALL']).optional(),
  includeExpired: z.boolean().optional().default(false),
});

export const noticeBoardRouter = router({
  // Admin procedures - can manage all notices
  create: adminProcedure
    .input(createNoticeSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await NoticeBoardService.create({
          ...input,
          authorId: ctx.user.id,
          organizationId: ctx.user.organizationId,
          branchId: input.branchId || undefined
        });

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to create notice'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create notice'
        });
      }
    }),

  update: adminProcedure
    .input(updateNoticeSchema)
    .mutation(async ({ input }) => {
      try {
        const { id, ...updateData } = input;
        const result = await NoticeBoardService.update(id, updateData);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to update notice'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update notice'
        });
      }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const result = await NoticeBoardService.delete(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to delete notice'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete notice'
        });
      }
    }),

  publish: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await NoticeBoardService.publish(input.id, ctx.user.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to publish notice'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to publish notice'
        });
      }
    }),

  getOrganizationNotices: adminProcedure
    .input(getNoticesSchema)
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user?.organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User must be associated with an organization'
          });
        }

        const result = await NoticeBoardService.getAll({
          organizationId: ctx.user.organizationId,
          branchId: input.branchId,
          noticeType: input.noticeType,
          priorityLevel: input.priorityLevel,
          isPublished: input.isPublished,
          isUrgent: input.isUrgent,
          targetAudience: input.targetAudience,
          includeExpired: input.includeExpired
        });

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch notices'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Database query failed: ${error.message || 'Failed to fetch notices'}`
        });
      }
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const result = await NoticeBoardService.getById(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: result.error || 'Notice not found'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch notice'
        });
      }
    }),

  getUrgentNotices: adminProcedure
    .input(z.object({ branchId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user?.organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User must be associated with an organization'
          });
        }

        const result = await NoticeBoardService.getUrgentNotices(
          ctx.user.organizationId,
          input.branchId
        );

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch urgent notices'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch urgent notices'
        });
      }
    }),

  getPendingApproval: adminProcedure
    .input(z.object({ branchId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user?.organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User must be associated with an organization'
          });
        }

        const result = await NoticeBoardService.getPendingApproval(
          ctx.user.organizationId,
          input.branchId
        );

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch pending notices'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch pending notices'
        });
      }
    }),

  // Branch Admin procedures - can manage branch-level notices
  branchCreate: branchAdminProcedure
    .input(createNoticeSchema.omit({ organizationId: true }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await NoticeBoardService.create({
          ...input,
          organizationId: ctx.user.organizationId,
          branchId: ctx.user.branchId || undefined,
          authorId: ctx.user.id
        });

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to create notice'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create notice'
        });
      }
    }),

  branchUpdate: branchAdminProcedure
    .input(updateNoticeSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify the notice belongs to this branch
        const notice = await NoticeBoardService.getById(input.id);
        if (!notice.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Notice not found'
          });
        }

        if (notice.data.branchId !== ctx.user.branchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to update this notice'
          });
        }

        const { id, ...updateData } = input;
        const result = await NoticeBoardService.update(id, updateData);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to update notice'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update notice'
        });
      }
    }),

  branchDelete: branchAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify the notice belongs to this branch
        const notice = await NoticeBoardService.getById(input.id);
        if (!notice.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Notice not found'
          });
        }

        if (notice.data.branchId !== ctx.user.branchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to delete this notice'
          });
        }

        const result = await NoticeBoardService.delete(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to delete notice'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete notice'
        });
      }
    }),

  getBranchNotices: branchAdminProcedure
    .input(z.object({ 
      includeOrgNotices: z.boolean().optional().default(true),
      isPublished: z.boolean().optional()
    }))
    .query(async ({ input, ctx }) => {
      try {
        const notices = [];

        // Get branch-specific notices
        const branchResult = await NoticeBoardService.getBranchNotices(
          ctx.user.branchId!,
          input.isPublished
        );

        if (branchResult.success && branchResult.data) {
          notices.push(...branchResult.data);
        }

        // Get organization-wide notices if requested
        if (input.includeOrgNotices) {
          const orgResult = await NoticeBoardService.getOrganizationNotices(
            ctx.user.organizationId!,
            input.isPublished
          );

          if (orgResult.success && orgResult.data) {
            // Filter out notices that have branchId (branch-specific) - only get org-wide
            const orgWideNotices = orgResult.data.filter(notice => !notice.branchId);
            notices.push(...orgWideNotices);
          }
        }

        // Sort by urgency and date
        notices.sort((a, b) => {
          if (a.isUrgent && !b.isUrgent) return -1;
          if (!a.isUrgent && b.isUrgent) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return notices;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch branch notices'
        });
      }
    }),

  branchPublish: branchAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify the notice belongs to this branch
        const notice = await NoticeBoardService.getById(input.id);
        if (!notice.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Notice not found'
          });
        }

        if (notice.data.branchId !== ctx.user.branchId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Not authorized to publish this notice'
          });
        }

        const result = await NoticeBoardService.publish(input.id, ctx.user.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to publish notice'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to publish notice'
        });
      }
    }),

  // Shared procedures
  incrementReadCount: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const result = await NoticeBoardService.incrementReadCount(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to increment read count'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to increment read count'
        });
      }
    }),

  branchIncrementReadCount: branchAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const result = await NoticeBoardService.incrementReadCount(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to increment read count'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to increment read count'
        });
      }
    }),

  getExpiringNotices: adminProcedure
    .input(z.object({ 
      daysAhead: z.number().optional().default(7),
      branchId: z.number().optional()
    }))
    .query(async ({ input, ctx }) => {
      try {
        const result = await NoticeBoardService.getExpiringNotices(
          input.daysAhead,
          ctx.user.organizationId,
          input.branchId
        );

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch expiring notices'
          });
        }

        return result.data;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch expiring notices'
        });
      }
    }),
});