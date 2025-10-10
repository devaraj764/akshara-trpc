import { eq, and, sql, sum } from 'drizzle-orm';
import db from '../db/index.js';
import { feeItems, feeInvoices, feePayments, feeInvoiceItems, students, enrollments, branches, grades, sections } from '../db/schema.js';
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
  discount?: number;
  taxes?: Array<{
    tax_title: string;
    percent: number;
  }> | null;
  status: 'PENDING' | 'PAID' | 'PARTIAL';
  createdBy?: number | null;
  createdAt: string;
}

export class FeeService {

  // Debug method to get ALL fee items without any filtering
  static async debugGetAllFeeItems(): Promise<ServiceResponse<any[]>> {
    try {
      console.log('=== DEBUG: Getting ALL fee items from database ===');
      const allItems = await db.select().from(feeItems);
      console.log(`Total fee items in database: ${allItems.length}`);
      
      allItems.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, {
          id: item.id,
          name: item.name,
          organizationId: item.organizationId,
          branchId: item.branchId,
          academicYearId: item.academicYearId,
          enabledGrades: item.enabledGrades,
          isMandatory: item.isMandatory,
          isDeleted: item.isDeleted,
          amountPaise: item.amountPaise
        });
      });
      
      console.log('=== END DEBUG ===');
      return { success: true, data: allItems };
    } catch (error) {
      console.error('Error in debugGetAllFeeItems:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch debug fee items' };
    }
  }

  // Fee Items
  static async getFeeItems(organizationId: number, branchId?: number, academicYearId?: number, gradeId?: number): Promise<ServiceResponse<FeeItem[]>> {
    try {
      // Validate required parameters
      if (!organizationId || organizationId <= 0) {
        return { success: false, error: 'Valid organization ID is required' };
      }
      
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

      let items = await db.select().from(feeItems).where(and(...conditions));
      
      // Filter by grade if specified (check if gradeId is in enabledGrades array or if enabledGrades is null/empty)
      if (gradeId) {
        items = items.filter(item => {
          return !item.enabledGrades || 
                 item.enabledGrades.length === 0 || 
                 item.enabledGrades.includes(gradeId);
        });
      }
      
      return { success: true, data: items as FeeItem[] };
    } catch (error) {
      console.error('Error in getFeeItems:', error);
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
  static async getInvoicesByStudent(studentId: number, status?: string): Promise<ServiceResponse<any[]>> {
    try {
      const conditions = [eq(feeInvoices.studentId, studentId)];
      
      if (status) {
        conditions.push(eq(feeInvoices.status, status as any));
      }

      // Get invoices with calculated paid amounts
      const invoicesWithPayments = await db
        .select({
          id: feeInvoices.id,
          branchId: feeInvoices.branchId,
          studentId: feeInvoices.studentId,
          enrollmentId: feeInvoices.enrollmentId,
          invoiceNumber: feeInvoices.invoiceNumber,
          totalAmountPaise: feeInvoices.totalAmountPaise,
          status: feeInvoices.status,
          createdBy: feeInvoices.createdBy,
          createdAt: feeInvoices.createdAt,
          discount: feeInvoices.discount,
          tax: feeInvoices.tax,
          paidAmountPaise: sql<number>`COALESCE(SUM(${feePayments.amountPaise}), 0)`.as('paidAmountPaise'),
        })
        .from(feeInvoices)
        .leftJoin(feePayments, eq(feeInvoices.id, feePayments.feeInvoiceId))
        .where(and(...conditions))
        .groupBy(
          feeInvoices.id,
          feeInvoices.branchId,
          feeInvoices.studentId,
          feeInvoices.enrollmentId,
          feeInvoices.invoiceNumber,
          feeInvoices.totalAmountPaise,
          feeInvoices.status,
          feeInvoices.createdBy,
          feeInvoices.createdAt,
          feeInvoices.discount,
          feeInvoices.tax
        );

      return { success: true, data: invoicesWithPayments };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch student invoices' };
    }
  }

  static async getInvoiceById(id: number): Promise<ServiceResponse<any>> {
    try {
      // Get the invoice with paid amount
      const [invoiceWithPayment] = await db
        .select({
          id: feeInvoices.id,
          branchId: feeInvoices.branchId,
          studentId: feeInvoices.studentId,
          enrollmentId: feeInvoices.enrollmentId,
          invoiceNumber: feeInvoices.invoiceNumber,
          totalAmountPaise: feeInvoices.totalAmountPaise,
          status: feeInvoices.status,
          createdBy: feeInvoices.createdBy,
          createdAt: feeInvoices.createdAt,
          discount: feeInvoices.discount,
          tax: feeInvoices.tax,
          paidAmountPaise: sql<number>`COALESCE(SUM(${feePayments.amountPaise}), 0)`.as('paidAmountPaise'),
        })
        .from(feeInvoices)
        .leftJoin(feePayments, eq(feeInvoices.id, feePayments.feeInvoiceId))
        .where(eq(feeInvoices.id, id))
        .groupBy(
          feeInvoices.id,
          feeInvoices.branchId,
          feeInvoices.studentId,
          feeInvoices.enrollmentId,
          feeInvoices.invoiceNumber,
          feeInvoices.totalAmountPaise,
          feeInvoices.status,
          feeInvoices.createdBy,
          feeInvoices.createdAt,
          feeInvoices.discount,
          feeInvoices.tax
        );
        
      if (!invoiceWithPayment) {
        return { success: false, error: 'Invoice not found' };
      }

      // Get the invoice items with fee item details
      const invoiceItems = await db
        .select({
          id: feeInvoiceItems.id,
          description: feeInvoiceItems.description,
          amountPaise: feeInvoiceItems.amountPaise,
          feeItemId: feeInvoiceItems.feeItemId,
          feeItemName: feeItems.name,
          feeItemIsMandatory: feeItems.isMandatory,
        })
        .from(feeInvoiceItems)
        .leftJoin(feeItems, eq(feeInvoiceItems.feeItemId, feeItems.id))
        .where(eq(feeInvoiceItems.feeInvoiceId, id));

      // Combine invoice with its items
      const invoiceWithItems = {
        ...invoiceWithPayment,
        feeInvoiceItems: invoiceItems
      };

      return { success: true, data: invoiceWithItems };
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
    discount?: number;
    taxes?: Array<{
      tax_title: string;
      percent: number;
    }>;
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
    discount?: number;
    taxes?: Array<{
      tax_title: string;
      percent: number;
    }>;
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
      // Insert the payment record with explicit paidAt timestamp
      const paymentData = {
        ...data,
        paidAt: sql`CURRENT_TIMESTAMP`,
        createdAt: sql`CURRENT_TIMESTAMP`
      };
      const [payment] = await db.insert(feePayments).values(paymentData).returning();
      
      // Get the invoice to check total amount and current status
      const [invoice] = await db.select().from(feeInvoices).where(eq(feeInvoices.id, data.feeInvoiceId));
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Calculate total paid amount and payment count for this invoice
      const [paymentSummary] = await db
        .select({
          totalPaid: sql<number>`COALESCE(SUM(${feePayments.amountPaise}), 0)`.as('totalPaid'),
          paymentCount: sql<number>`COUNT(*)`.as('paymentCount'),
          latestPaymentDate: sql<string>`MAX(${feePayments.paidAt})`.as('latestPaymentDate')
        })
        .from(feePayments)
        .where(eq(feePayments.feeInvoiceId, data.feeInvoiceId));

      const totalPaid = paymentSummary.totalPaid;
      const remainingAmount = invoice.totalAmountPaise - totalPaid;

      // Determine new invoice status based on payment
      let newStatus = invoice.status;
      if (totalPaid >= invoice.totalAmountPaise) {
        newStatus = 'PAID';
      } else if (totalPaid > 0) {
        newStatus = 'PARTIAL';
      } else {
        newStatus = 'PENDING';
      }

      // Prepare invoice update data
      const invoiceUpdateData: any = {
        status: newStatus
      };

      // Add additional tracking information in the tax field (as JSON metadata)
      const existingTax = invoice.tax || {};
      const updatedTax = {
        ...existingTax,
        paymentHistory: {
          totalPaidPaise: totalPaid,
          remainingPaise: remainingAmount,
          paymentCount: paymentSummary.paymentCount,
          lastPaymentDate: paymentSummary.latestPaymentDate,
          lastPaymentAmount: data.amountPaise,
          lastPaymentMode: data.paymentMode,
          lastPaymentBy: data.paidBy,
          lastPaymentRef: data.transactionRef,
          updatedAt: new Date().toISOString()
        }
      };
      invoiceUpdateData.tax = updatedTax;

      // Update the invoice with new status and payment tracking info
      await db
        .update(feeInvoices)
        .set(invoiceUpdateData)
        .where(eq(feeInvoices.id, data.feeInvoiceId));

      // Log the invoice changes for tracking
      const invoiceChanges = {
        invoiceId: data.feeInvoiceId,
        invoiceNumber: invoice.invoiceNumber,
        previousStatus: invoice.status,
        newStatus,
        paymentAmount: data.amountPaise,
        paymentMode: data.paymentMode,
        totalPaidPaise: totalPaid,
        remainingPaise: remainingAmount,
        paymentCount: paymentSummary.paymentCount,
        isFullyPaid: newStatus === 'PAID',
        paidBy: data.paidBy,
        transactionRef: data.transactionRef,
        timestamp: new Date().toISOString()
      };

      console.log('🧾 INVOICE UPDATED:', JSON.stringify(invoiceChanges, null, 2));

      // Return detailed payment result with invoice changes
      return { 
        success: true, 
        data: {
          payment,
          invoiceChanges
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to record payment' };
    }
  }

  // Helper method to get invoice with comprehensive payment tracking
  static async getInvoiceWithPaymentHistory(invoiceId: number): Promise<ServiceResponse<any>> {
    try {
      // Get invoice with payment summary
      const [invoiceWithPayments] = await db
        .select({
          id: feeInvoices.id,
          branchId: feeInvoices.branchId,
          studentId: feeInvoices.studentId,
          enrollmentId: feeInvoices.enrollmentId,
          invoiceNumber: feeInvoices.invoiceNumber,
          totalAmountPaise: feeInvoices.totalAmountPaise,
          status: feeInvoices.status,
          createdBy: feeInvoices.createdBy,
          createdAt: feeInvoices.createdAt,
          discount: feeInvoices.discount,
          tax: feeInvoices.tax,
          totalPaidPaise: sql<number>`COALESCE(SUM(${feePayments.amountPaise}), 0)`.as('totalPaidPaise'),
          paymentCount: sql<number>`COUNT(${feePayments.id})`.as('paymentCount'),
          lastPaymentDate: sql<string>`MAX(${feePayments.paidAt})`.as('lastPaymentDate')
        })
        .from(feeInvoices)
        .leftJoin(feePayments, eq(feeInvoices.id, feePayments.feeInvoiceId))
        .where(eq(feeInvoices.id, invoiceId))
        .groupBy(
          feeInvoices.id,
          feeInvoices.branchId,
          feeInvoices.studentId,
          feeInvoices.enrollmentId,
          feeInvoices.invoiceNumber,
          feeInvoices.totalAmountPaise,
          feeInvoices.status,
          feeInvoices.createdBy,
          feeInvoices.createdAt,
          feeInvoices.discount,
          feeInvoices.tax
        );

      if (!invoiceWithPayments) {
        return { success: false, error: 'Invoice not found' };
      }

      // Calculate derived fields
      const remainingPaise = invoiceWithPayments.totalAmountPaise - invoiceWithPayments.totalPaidPaise;
      const isFullyPaid = invoiceWithPayments.totalPaidPaise >= invoiceWithPayments.totalAmountPaise;
      const paymentProgress = (invoiceWithPayments.totalPaidPaise / invoiceWithPayments.totalAmountPaise) * 100;

      return {
        success: true,
        data: {
          ...invoiceWithPayments,
          remainingPaise,
          isFullyPaid,
          paymentProgress: Math.min(100, Math.max(0, paymentProgress)),
          paymentHistory: invoiceWithPayments.tax?.paymentHistory || null
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch invoice with payment history' };
    }
  }

  // Method to get detailed invoice modification history
  static async getInvoiceModificationHistory(invoiceId: number): Promise<ServiceResponse<any>> {
    try {
      // Get basic invoice info
      const [invoice] = await db.select().from(feeInvoices).where(eq(feeInvoices.id, invoiceId));
      if (!invoice) {
        return { success: false, error: 'Invoice not found' };
      }

      // Get all payments for this invoice
      const payments = await db
        .select()
        .from(feePayments)
        .where(eq(feePayments.feeInvoiceId, invoiceId))
        .orderBy(sql`${feePayments.paidAt} ASC`);

      // Extract payment history from invoice tax field
      const paymentHistory = invoice.tax?.paymentHistory || null;

      // Calculate payment timeline
      const paymentTimeline = payments.map((payment, index) => ({
        sequence: index + 1,
        paymentId: payment.id,
        amount: payment.amountPaise,
        mode: payment.paymentMode,
        paidAt: payment.paidAt,
        paidBy: payment.paidBy,
        transactionRef: payment.transactionRef,
        runningTotal: payments.slice(0, index + 1).reduce((sum, p) => sum + p.amountPaise, 0)
      }));

      return {
        success: true,
        data: {
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmountPaise: invoice.totalAmountPaise,
            status: invoice.status,
            createdAt: invoice.createdAt
          },
          paymentHistory,
          paymentTimeline,
          summary: {
            totalPayments: payments.length,
            totalPaid: payments.reduce((sum, p) => sum + p.amountPaise, 0),
            remainingAmount: invoice.totalAmountPaise - payments.reduce((sum, p) => sum + p.amountPaise, 0),
            firstPaymentDate: payments[0]?.paidAt || null,
            lastPaymentDate: payments[payments.length - 1]?.paidAt || null
          }
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch invoice modification history' };
    }
  }

  static async getPaymentsByStudent(studentId: number): Promise<ServiceResponse<any[]>> {
    try {
      const payments = await db
        .select({
          id: feePayments.id,
          feeInvoiceId: feePayments.feeInvoiceId,
          amountPaise: feePayments.amountPaise,
          paymentMode: feePayments.paymentMode,
          transactionRef: feePayments.transactionRef,
          paidBy: feePayments.paidBy,
          createdAt: feePayments.createdAt,
          invoiceNumber: feeInvoices.invoiceNumber,
          totalAmountPaise: feeInvoices.totalAmountPaise,
        })
        .from(feePayments)
        .innerJoin(feeInvoices, eq(feePayments.feeInvoiceId, feeInvoices.id))
        .where(eq(feeInvoices.studentId, studentId))
        .orderBy(sql`${feePayments.createdAt} DESC`);

      return { success: true, data: payments };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch student payments' };
    }
  }

  static async getFeeReport(branchId: number, _startDate: string, _endDate: string): Promise<ServiceResponse<any>> {
    try {
      const invoices = await db.select().from(feeInvoices).where(eq(feeInvoices.branchId, branchId));
      return { success: true, data: invoices };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to generate fee report' };
    }
  }

  // Get student fee balance summary for admin dashboard
  static async getStudentFeeBalances(params: {
    organizationId: number;
    branchId?: number;
    academicYearId?: number;
    status?: 'paid' | 'partial' | 'overdue' | 'all';
    searchTerm?: string;
  }): Promise<ServiceResponse<any[]>> {
    try {
      const { organizationId, branchId, academicYearId, status, searchTerm } = params;

      // Build conditions array
      const conditions = [
        eq(students.organizationId, organizationId),
        eq(students.isDeleted, false)
      ];

      if (branchId) {
        conditions.push(eq(students.branchId, branchId));
      }

      if (academicYearId) {
        conditions.push(eq(enrollments.academicYearId, academicYearId));
      }

      // Base query to get students with their fee invoices and payments
      const results = await db
        .select({
          studentId: students.id,
          studentName: sql<string>`CONCAT(${students.firstName}, ' ', COALESCE(${students.lastName}, ''))`.as('studentName'),
          admissionNumber: students.admissionNumber,
          branchId: students.branchId,
          branchName: branches.name,
          gradeName: grades.name,
          sectionName: sections.name,
          totalFees: sql<number>`COALESCE(SUM(${feeInvoices.totalAmountPaise}), 0)`.as('totalFees'),
          paidAmount: sql<number>`COALESCE(SUM(${feePayments.amountPaise}), 0)`.as('paidAmount'),
          lastPaymentDate: sql<string>`MAX(${feePayments.paidAt})`.as('lastPaymentDate'),
        })
        .from(students)
        .leftJoin(enrollments, eq(students.id, enrollments.studentId))
        .leftJoin(branches, eq(students.branchId, branches.id))
        .leftJoin(grades, eq(enrollments.gradeId, grades.id))
        .leftJoin(sections, eq(enrollments.sectionId, sections.id))
        .leftJoin(feeInvoices, eq(students.id, feeInvoices.studentId))
        .leftJoin(feePayments, eq(feeInvoices.id, feePayments.feeInvoiceId))
        .where(and(...conditions))
        .groupBy(
          students.id,
          students.firstName,
          students.lastName,
          students.admissionNumber,
          students.branchId,
          branches.name,
          grades.name,
          sections.name
        );

      // Process results to calculate balance and status
      const processedResults = results.map((row) => {
        const totalFees = row.totalFees || 0;
        const paidAmount = row.paidAmount || 0;
        const balanceAmount = totalFees - paidAmount;
        
        let feeStatus: 'paid' | 'partial' | 'overdue' = 'paid';
        if (balanceAmount > 0) {
          // Check if payment is overdue (simplified logic - could be enhanced)
          const lastPayment = row.lastPaymentDate ? new Date(row.lastPaymentDate) : null;
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          if (!lastPayment || lastPayment < thirtyDaysAgo) {
            feeStatus = 'overdue';
          } else {
            feeStatus = 'partial';
          }
        }

        return {
          id: row.studentId.toString(),
          name: row.studentName,
          admissionNumber: row.admissionNumber || '',
          branchId: row.branchId,
          branchName: row.branchName || '',
          class: row.gradeName && row.sectionName ? `${row.gradeName}-${row.sectionName}` : '',
          totalFees: Math.round(totalFees / 100), // Convert paise to rupees
          paidAmount: Math.round(paidAmount / 100), // Convert paise to rupees
          balanceAmount: Math.round(balanceAmount / 100), // Convert paise to rupees
          lastPaymentDate: row.lastPaymentDate || '',
          status: feeStatus,
        };
      });

      // Apply search filter if specified
      let filteredResults = processedResults;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredResults = processedResults.filter(
          (student) =>
            student.name.toLowerCase().includes(searchLower) ||
            student.admissionNumber.toLowerCase().includes(searchLower) ||
            student.class.toLowerCase().includes(searchLower)
        );
      }

      // Apply status filter if specified
      if (status && status !== 'all') {
        filteredResults = filteredResults.filter((student) => student.status === status);
      }

      return { success: true, data: filteredResults };
    } catch (error) {
      console.error('Error in getStudentFeeBalances:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch student fee balances' 
      };
    }
  }

  // Get fee balance summary statistics
  static async getFeeBalanceSummary(params: {
    organizationId: number;
    branchId?: number;
    academicYearId?: number;
  }): Promise<ServiceResponse<{
    totalOutstanding: number;
    totalCollected: number;
    overdueStudents: number;
    totalStudents: number;
    collectionRate: number;
  }>> {
    try {
      const { organizationId, branchId, academicYearId } = params;

      // Build conditions array
      const conditions = [
        eq(students.organizationId, organizationId),
        eq(students.isDeleted, false)
      ];

      if (branchId) {
        conditions.push(eq(students.branchId, branchId));
      }

      if (academicYearId) {
        conditions.push(eq(enrollments.academicYearId, academicYearId));
      }

      // Get summary statistics
      const [summary] = await db
        .select({
          totalFees: sql<number>`COALESCE(SUM(${feeInvoices.totalAmountPaise}), 0)`.as('totalFees'),
          totalPaid: sql<number>`COALESCE(SUM(${feePayments.amountPaise}), 0)`.as('totalPaid'),
          studentCount: sql<number>`COUNT(DISTINCT ${students.id})`.as('studentCount'),
          overdueCount: sql<number>`COUNT(DISTINCT CASE 
            WHEN ${feeInvoices.totalAmountPaise} > COALESCE(subquery.paid_amount, 0) 
            AND (subquery.last_payment IS NULL OR subquery.last_payment < NOW() - INTERVAL '30 days')
            THEN ${students.id} 
            ELSE NULL 
          END)`.as('overdueCount'),
        })
        .from(students)
        .leftJoin(enrollments, eq(students.id, enrollments.studentId))
        .leftJoin(feeInvoices, eq(students.id, feeInvoices.studentId))
        .leftJoin(feePayments, eq(feeInvoices.id, feePayments.feeInvoiceId))
        .leftJoin(
          sql`(
            SELECT 
              fi.student_id,
              SUM(fp.amount_paise) as paid_amount,
              MAX(fp.paid_at) as last_payment
            FROM fee_invoices fi
            LEFT JOIN fee_payments fp ON fi.id = fp.fee_invoice_id
            GROUP BY fi.student_id
          ) subquery`,
          sql`${students.id} = subquery.student_id`
        )
        .where(and(...conditions));

      const totalFees = summary?.totalFees || 0;
      const totalPaid = summary?.totalPaid || 0;
      const totalOutstanding = totalFees - totalPaid;
      const collectionRate = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;

      return {
        success: true,
        data: {
          totalOutstanding: Math.round(totalOutstanding / 100), // Convert paise to rupees
          totalCollected: Math.round(totalPaid / 100), // Convert paise to rupees
          overdueStudents: summary?.overdueCount || 0,
          totalStudents: summary?.studentCount || 0,
          collectionRate: Math.round(collectionRate * 100) / 100, // Round to 2 decimal places
        }
      };
    } catch (error) {
      console.error('Error in getFeeBalanceSummary:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch fee balance summary' 
      };
    }
  }
}