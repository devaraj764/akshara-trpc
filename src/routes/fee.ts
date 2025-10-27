import { z } from 'zod';
import { router, protectedProcedure, branchAdminProcedure, TRPCError } from '../trpc.js';
import { FeeService } from '../services/feeService.js';

const createInvoiceSchema = z.object({
  branchId: z.number(),
  studentId: z.number(),
  enrollmentId: z.number(),
  invoiceNumber: z.string(),
  totalAmountPaise: z.number(),
  discount: z.number().default(0),
  taxes: z.array(z.object({
    tax_title: z.string(),
    percent: z.number(),
  })).optional(),
  status: z.enum(['PENDING', 'PAID', 'PARTIAL']).optional(),
  createdBy: z.number().optional(),
});

const updateInvoiceSchema = z.object({
  id: z.number(),
  totalAmountPaise: z.number().optional(),
  discount: z.number().optional(),
  taxes: z.array(z.object({
    tax_title: z.string(),
    percent: z.number(),
  })).optional(),
  status: z.enum(['PENDING', 'PAID', 'PARTIAL']).optional(),
});

const recordPaymentSchema = z.object({
  feeInvoiceId: z.number(),
  paymentMode: z.string(),
  amountPaise: z.number(),
  transactionRef: z.string().optional(),
  paidBy: z.number().optional(),
});

export const feeRouter = router({
  // Debug endpoint to check all fee items in database
  debugFeeItems: protectedProcedure
    .query(async () => {
      const result = await FeeService.debugGetAllFeeItems();
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch debug fee items',
        });
      }
      
      return result.data;
    }),

  // Fee Items
  getFeeItems: protectedProcedure
    .input(z.object({
      academicYearId: z.number().min(1).optional(),
      classId: z.number().min(1).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { user } = ctx;
      
      if (!user.organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User organization ID not found',
        });
      }
      
      // Get branchId from user's roles
      const branchId = user.roles?.[0]?.branchId;
      
      const result = await FeeService.getFeeItems(
        user.organizationId, 
        branchId, 
        input.academicYearId, 
        input.classId
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch fee items',
        });
      }
      
      return result.data;
    }),

  // Invoice Management
  getInvoiceById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await FeeService.getInvoiceById(input.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Fee invoice not found',
        });
      }
      
      return result.data;
    }),

  getInvoicesByStudent: protectedProcedure
    .input(z.object({
      studentId: z.number(),
      status: z.enum(['PENDING', 'PAID', 'PARTIAL']).optional(),
    }))
    .query(async ({ input }) => {
      const result = await FeeService.getInvoicesByStudent(input.studentId, input.status);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch student invoices',
        });
      }
      
      return result.data;
    }),

  getAllInvoices: branchAdminProcedure
    .input(z.object({
      branchId: z.number(),
      status: z.enum(['PENDING', 'PAID', 'PARTIAL']).optional(),
    }))
    .query(async ({ input }) => {
      const result = await FeeService.getAllInvoices(input.branchId, input.status);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch invoices',
        });
      }
      
      return result.data;
    }),

  createInvoice: branchAdminProcedure
    .input(createInvoiceSchema)
    .mutation(async ({ input }) => {
      const result = await FeeService.createInvoice(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create invoice',
        });
      }
      
      return result.data;
    }),

  updateInvoice: branchAdminProcedure
    .input(updateInvoiceSchema)
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const result = await FeeService.updateInvoice(id, updateData);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update invoice',
        });
      }
      
      return result.data;
    }),

  recordPayment: branchAdminProcedure
    .input(recordPaymentSchema)
    .mutation(async ({ input }) => {
      const result = await FeeService.recordPayment(input);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to record payment',
        });
      }
      
      return result.data;
    }),

  getPaymentsByStudent: protectedProcedure
    .input(z.object({
      studentId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await FeeService.getPaymentsByStudent(input.studentId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch student payments',
        });
      }
      
      return result.data;
    }),

  getInvoiceWithPaymentHistory: protectedProcedure
    .input(z.object({
      invoiceId: z.number(),
    }))
    .query(async ({ input }) => {
      const result = await FeeService.getInvoiceWithPaymentHistory(input.invoiceId);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'Invoice not found',
        });
      }
      
      return result.data;
    }),

  getFeeReport: branchAdminProcedure
    .input(z.object({
      branchId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      const result = await FeeService.getFeeReport(input.branchId, input.startDate, input.endDate);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to generate fee report',
        });
      }
      
      return result.data;
    }),

  getStudentFeeBalances: protectedProcedure
    .input(z.object({
      branchId: z.number().optional(),
      academicYearId: z.number().optional(),
      status: z.enum(['paid', 'partial', 'overdue', 'all']).optional(),
      searchTerm: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { user } = ctx;
      
      if (!user.organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User organization ID not found',
        });
      }

      const result = await FeeService.getStudentFeeBalances({
        organizationId: user.organizationId,
        branchId: input.branchId,
        academicYearId: input.academicYearId,
        status: input.status,
        searchTerm: input.searchTerm,
      });
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch student fee balances',
        });
      }
      
      return result.data;
    }),

  getFeeBalanceSummary: protectedProcedure
    .input(z.object({
      branchId: z.number().optional(),
      academicYearId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { user } = ctx;
      
      if (!user.organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User organization ID not found',
        });
      }

      const result = await FeeService.getFeeBalanceSummary({
        organizationId: user.organizationId,
        branchId: input.branchId,
        academicYearId: input.academicYearId,
      });
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch fee balance summary',
        });
      }
      
      return result.data;
    }),
});