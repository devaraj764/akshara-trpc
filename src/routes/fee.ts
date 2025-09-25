import { z } from 'zod';
import { router, protectedProcedure, teacherProcedure, TRPCError } from '../trpc.js';
import { FeeService } from '../services/feeService.js';

const createInvoiceSchema = z.object({
  branchId: z.number(),
  studentId: z.number(),
  enrollmentId: z.number(),
  invoiceNumber: z.string(),
  totalAmountPaise: z.number(),
  status: z.enum(['PENDING', 'PAID', 'PARTIAL']).optional(),
  createdBy: z.number().optional(),
});

const updateInvoiceSchema = z.object({
  id: z.number(),
  totalAmountPaise: z.number().optional(),
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

  getAllInvoices: teacherProcedure
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

  createInvoice: teacherProcedure
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

  updateInvoice: teacherProcedure
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

  recordPayment: teacherProcedure
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

  getFeeReport: teacherProcedure
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
});