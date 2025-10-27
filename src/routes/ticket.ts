import { z } from 'zod';
import { router, protectedProcedure, branchAdminProcedure, TRPCError } from '../trpc.js';
import { TicketService } from '../services/ticketService.js';

// Validation schemas
const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required').max(128),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  branchId: z.number().positive().optional(),
  assignedTo: z.number().positive().optional(),
  attachments: z.any().optional(),
  tags: z.array(z.string()).default([]),
});

const updateTicketSchema = z.object({
  id: z.number().positive(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.string().min(1).max(128).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.number().positive().optional(),
  resolvedBy: z.number().positive().optional(),
  resolutionNotes: z.string().optional(),
  attachments: z.any().optional(),
  tags: z.array(z.string()).optional(),
});

const getTicketsSchema = z.object({
  branchId: z.number().positive().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.string().optional(),
  assignedTo: z.number().positive().optional(),
  fromUserId: z.number().positive().optional(),
  search: z.string().optional(),
  limit: z.number().positive().max(100).default(50),
  offset: z.number().min(0).default(0),
});

const assignTicketSchema = z.object({
  ticketId: z.number().positive(),
  assignedToUserId: z.number().positive(),
});

const resolveTicketSchema = z.object({
  ticketId: z.number().positive(),
  resolutionNotes: z.string().optional(),
});

const deleteTicketSchema = z.object({
  ticketId: z.number().positive(),
});

export const ticketRouter = router({
  // Create a new ticket - Available to all authenticated users
  create: protectedProcedure
    .input(createTicketSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        // Use user's organization and branch
        const organizationId = ctx.user.organizationId;
        const branchId = input.branchId || ctx.user.branchId;

        if (!organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization ID is required'
          });
        }

        const result = await TicketService.create({
          ...input,
          organizationId,
          branchId,
          fromUserId: ctx.user.id
        });

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to create ticket'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create ticket'
        });
      }
    }),

  // Get all tickets with filters - Available to all authenticated users
  getAll: protectedProcedure
    .input(getTicketsSchema)
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        // Filter by user's organization and optionally branch
        const queryOptions = {
          ...input,
          organizationId: ctx.user.organizationId,
          branchId: input.branchId || ctx.user.branchId
        };

        const result = await TicketService.getAll(queryOptions);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch tickets'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch tickets'
        });
      }
    }),

  // Get ticket by ID - Available to all authenticated users
  getById: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        const result = await TicketService.getById(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: result.error || 'Ticket not found'
          });
        }

        // Check if user has access to this ticket (same organization)
        if (result.data.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch ticket'
        });
      }
    }),

  // Update ticket - Available to all authenticated users (with restrictions)
  update: protectedProcedure
    .input(updateTicketSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        // Check if ticket exists and user has access
        const existingTicket = await TicketService.getById(input.id);
        if (!existingTicket.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Ticket not found'
          });
        }

        if (existingTicket.data.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied'
          });
        }

        // Regular users can only update their own tickets (limited fields)
        // Admins can update any ticket
        const isAdmin = ctx.user.role === 'ADMIN' || ctx.user.role === 'SUPER_ADMIN' || ctx.user.role === 'BRANCH_ADMIN';
        const isTicketOwner = existingTicket.data.fromUserId === ctx.user.id;
        const isAssignedUser = existingTicket.data.assignedTo === ctx.user.id;

        if (!isAdmin && !isTicketOwner && !isAssignedUser) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update your own tickets or tickets assigned to you'
          });
        }

        // Restrict fields for non-admin users
        const updateData = { ...input };
        if (!isAdmin) {
          // Non-admin users cannot change status, assignedTo, resolvedBy
          delete updateData.status;
          delete updateData.assignedTo;
          delete updateData.resolvedBy;
        }

        const { id, ...updateFields } = updateData;
        const result = await TicketService.update(id, updateFields);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to update ticket'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update ticket'
        });
      }
    }),

  // Delete ticket - Branch Admin and above only
  delete: branchAdminProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if ticket exists and user has access
        const existingTicket = await TicketService.getById(input.id);
        if (!existingTicket.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Ticket not found'
          });
        }

        if (existingTicket.data.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied'
          });
        }

        const result = await TicketService.delete(input.id);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to delete ticket'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete ticket'
        });
      }
    }),

  // Get tickets assigned to current user
  getMyAssignedTickets: protectedProcedure
    .input(z.object({
      status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED']).optional(),
      limit: z.number().positive().max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        const result = await TicketService.getAssignedToUser(ctx.user.id, {
          organizationId: ctx.user.organizationId,
          status: input.status,
          limit: input.limit,
          offset: input.offset
        });

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch assigned tickets'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch assigned tickets'
        });
      }
    }),

  // Get tickets created by current user
  getMyCreatedTickets: protectedProcedure
    .input(z.object({
      status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED']).optional(),
      limit: z.number().positive().max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        const result = await TicketService.getCreatedByUser(ctx.user.id, {
          organizationId: ctx.user.organizationId,
          status: input.status,
          limit: input.limit,
          offset: input.offset
        });

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch created tickets'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch created tickets'
        });
      }
    }),

  // Assign ticket to user - Branch Admin and above only
  assignTicket: branchAdminProcedure
    .input(assignTicketSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if ticket exists and user has access
        const existingTicket = await TicketService.getById(input.ticketId);
        if (!existingTicket.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Ticket not found'
          });
        }

        if (existingTicket.data.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied'
          });
        }

        const result = await TicketService.assignTicket(input.ticketId, input.assignedToUserId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to assign ticket'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to assign ticket'
        });
      }
    }),

  // Resolve ticket - Available to assigned user and admins
  resolveTicket: protectedProcedure
    .input(resolveTicketSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        // Check if ticket exists and user has access
        const existingTicket = await TicketService.getById(input.ticketId);
        if (!existingTicket.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Ticket not found'
          });
        }

        if (existingTicket.data.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied'
          });
        }

        // Check if user can resolve this ticket
        const isAdmin = ctx.user.role === 'ADMIN' || ctx.user.role === 'SUPER_ADMIN' || ctx.user.role === 'BRANCH_ADMIN';
        const isAssignedUser = existingTicket.data.assignedTo === ctx.user.id;

        if (!isAdmin && !isAssignedUser) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only resolve tickets assigned to you'
          });
        }

        const result = await TicketService.resolveTicket(
          input.ticketId,
          ctx.user.id,
          input.resolutionNotes
        );

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to resolve ticket'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to resolve ticket'
        });
      }
    }),

  // Close ticket - Branch Admin and above only
  closeTicket: branchAdminProcedure
    .input(z.object({ ticketId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if ticket exists and user has access
        const existingTicket = await TicketService.getById(input.ticketId);
        if (!existingTicket.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Ticket not found'
          });
        }

        if (existingTicket.data.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied'
          });
        }

        const result = await TicketService.closeTicket(input.ticketId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to close ticket'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to close ticket'
        });
      }
    }),

  // Reopen ticket - Available to ticket creator and admins
  reopenTicket: protectedProcedure
    .input(z.object({ ticketId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        // Check if ticket exists and user has access
        const existingTicket = await TicketService.getById(input.ticketId);
        if (!existingTicket.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Ticket not found'
          });
        }

        if (existingTicket.data.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied'
          });
        }

        // Check if user can reopen this ticket
        const isAdmin = ctx.user.role === 'ADMIN' || ctx.user.role === 'SUPER_ADMIN' || ctx.user.role === 'BRANCH_ADMIN';
        const isTicketCreator = existingTicket.data.fromUserId === ctx.user.id;

        if (!isAdmin && !isTicketCreator) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only reopen tickets you created'
          });
        }

        const result = await TicketService.reopenTicket(input.ticketId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to reopen ticket'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to reopen ticket'
        });
      }
    }),

  // Get ticket statistics
  getStatistics: protectedProcedure
    .input(z.object({
      branchId: z.number().positive().optional()
    }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        const branchId = input.branchId || ctx.user.branchId;
        const result = await TicketService.getStatistics(ctx.user.organizationId, branchId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch ticket statistics'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch ticket statistics'
        });
      }
    }),

  // Get available categories
  getCategories: protectedProcedure
    .input(z.object({
      branchId: z.number().positive().optional()
    }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          });
        }

        const branchId = input.branchId || ctx.user.branchId;
        const result = await TicketService.getCategories(ctx.user.organizationId, branchId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to fetch ticket categories'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch ticket categories'
        });
      }
    }),

  // Delete ticket - Branch Admin and above only
  delete: branchAdminProcedure
    .input(deleteTicketSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if ticket exists and user has access
        const existingTicket = await TicketService.getById(input.ticketId);
        if (!existingTicket.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Ticket not found'
          });
        }

        if (existingTicket.data.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied'
          });
        }

        const result = await TicketService.delete(input.ticketId);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to delete ticket'
          });
        }

        return result.data;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete ticket'
        });
      }
    }),
});