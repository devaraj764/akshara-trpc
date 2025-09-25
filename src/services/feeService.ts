import { eq, and } from 'drizzle-orm';
import db from '../db/index.js';
import { feeItems, feeInvoices, feePayments } from '../db/schema.js';
import { ServiceResponse } from '../types.db.js';

export interface FeeItem {
  id: number;
  name: string;
  amountPaise: number;
  isMandatory: boolean;
  academicYearId: number;
  branchId?: number | null;
  organizationId: number;
  feeTypeId: number;
  enabledGrades: number[] | null;
  isDeleted: boolean;
  createdAt: string;
}

export interface FeeInvoice {
  id: number;
  branchId: number;
  studentId: number;
  enrollmentId: number;
  invoiceNumber: string;
  totalAmountPaise: number;
  status: 'PENDING' | 'PAID' | 'PARTIAL';
  createdBy?: number | null;
  createdAt: string;
}

export class FeeService {

  // Fee Items
  static async getFeeItems(organizationId: number, branchId?: number, academicYearId?: number): Promise<ServiceResponse<FeeItem[]>> {
    try {
      const conditions = [
        eq(feeItems.organizationId, organizationId),
        eq(feeItems.isDeleted, false)
      ];
      
      if (branchId) {
        conditions.push(eq(feeItems.branchId, branchId));
      }
      
      if (academicYearId) {
        conditions.push(eq(feeItems.academicYearId, academicYearId));
      }

      const items = await db.select().from(feeItems).where(and(...conditions));
      return { success: true, data: items as FeeItem[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch fee items' };
    }
  }

  static async createFeeItem(data: { 
    name: string; 
    amountPaise: number; 
    organizationId: number; 
    academicYearId: number; 
    feeTypeId: number;
    isMandatory?: boolean;
    branchId?: number;
    enabledGrades?: number[];
  }): Promise<ServiceResponse<FeeItem>> {
    try {
      const [feeItem] = await db.insert(feeItems).values(data).returning();
      return { success: true, data: feeItem as FeeItem };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create fee item' };
    }
  }

  static async updateFeeItem(id: number, data: { 
    name?: string; 
    amountPaise?: number; 
    isMandatory?: boolean;
    enabledGrades?: number[];
  }): Promise<ServiceResponse<FeeItem>> {
    try {
      const [feeItem] = await db.update(feeItems).set(data).where(eq(feeItems.id, id)).returning();
      return { success: true, data: feeItem as FeeItem };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update fee item' };
    }
  }

  static async deleteFeeItem(id: number): Promise<ServiceResponse<void>> {
    try {
      await db.update(feeItems).set({ isDeleted: true }).where(eq(feeItems.id, id));
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete fee item' };
    }
  }

  // Fee Invoices
  static async getInvoicesByStudent(studentId: number, status?: string): Promise<ServiceResponse<FeeInvoice[]>> {
    try {
      const conditions = [eq(feeInvoices.studentId, studentId)];
      
      if (status) {
        conditions.push(eq(feeInvoices.status, status as any));
      }

      const invoices = await db.select().from(feeInvoices).where(and(...conditions));
      return { success: true, data: invoices as FeeInvoice[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch student invoices' };
    }
  }

  static async getInvoiceById(id: number): Promise<ServiceResponse<FeeInvoice>> {
    try {
      const [invoice] = await db.select().from(feeInvoices).where(eq(feeInvoices.id, id));
      if (!invoice) {
        return { success: false, error: 'Invoice not found' };
      }
      return { success: true, data: invoice as FeeInvoice };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch invoice' };
    }
  }

  static async getAllInvoices(branchId: number, status?: string): Promise<ServiceResponse<FeeInvoice[]>> {
    try {
      const conditions = [eq(feeInvoices.branchId, branchId)];
      
      if (status) {
        conditions.push(eq(feeInvoices.status, status as any));
      }

      const invoices = await db.select().from(feeInvoices).where(and(...conditions));
      return { success: true, data: invoices as FeeInvoice[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch invoices' };
    }
  }

  static async createInvoice(data: {
    branchId: number;
    studentId: number;
    enrollmentId: number;
    invoiceNumber: string;
    totalAmountPaise: number;
    status?: 'PENDING' | 'PAID' | 'PARTIAL';
    createdBy?: number;
  }): Promise<ServiceResponse<FeeInvoice>> {
    try {
      const [invoice] = await db.insert(feeInvoices).values(data).returning();
      return { success: true, data: invoice as FeeInvoice };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create invoice' };
    }
  }

  static async updateInvoice(id: number, data: {
    totalAmountPaise?: number;
    status?: 'PENDING' | 'PAID' | 'PARTIAL';
  }): Promise<ServiceResponse<FeeInvoice>> {
    try {
      const [invoice] = await db.update(feeInvoices).set(data).where(eq(feeInvoices.id, id)).returning();
      return { success: true, data: invoice as FeeInvoice };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update invoice' };
    }
  }

  static async recordPayment(data: {
    feeInvoiceId: number;
    paymentMode: string;
    amountPaise: number;
    transactionRef?: string;
    paidBy?: number;
  }): Promise<ServiceResponse<any>> {
    try {
      const [payment] = await db.insert(feePayments).values(data).returning();
      return { success: true, data: payment };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to record payment' };
    }
  }

  static async getFeeReport(branchId: number, startDate: string, endDate: string): Promise<ServiceResponse<any>> {
    try {
      const invoices = await db.select().from(feeInvoices).where(eq(feeInvoices.branchId, branchId));
      return { success: true, data: invoices };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to generate fee report' };
    }
  }
}