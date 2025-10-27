import { eq, and, sql, desc, count, sum } from 'drizzle-orm';
import db from '../db/index.js';
import { 
  students, 
  staff, 
  branches, 
  organizations,
  users,
  feeItems,
  feeInvoices,
  feePayments,
  attendance,
  enrollments,
  classes,
  sections,
  personDetails,
  academicYears
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface AdminDashboardData {
  overviewStats: {
    totalBranches: number;
    totalStudents: number;
    totalStaff: number;
    totalUsers: number;
    feeCollectionRate: number;
    overallAttendanceRate: number;
  };
  recentActivities: {
    recentStudents: any[];
    recentStaff: any[];
    recentPayments: any[];
  };
  financialSummary: {
    totalOutstanding: number;
    totalCollected: number;
    monthlyCollection: number;
    overdueStudents: number;
  };
  branchPerformance: {
    topBranches: any[];
    attendanceByBranch: any[];
  };
  quickStats: {
    studentsPerBranch: any[];
    staffPerDepartment: any[];
    enrollmentTrends: any[];
  };
}

export interface BranchDashboardData {
  overviewStats: {
    totalStudents: number;
    totalStaff: number;
    todayAttendance: number;
    feeCollectionRate: number;
    pendingFees: number;
  };
  todaySummary: {
    studentsPresent: number;
    studentsAbsent: number;
    staffPresent: number;
    staffAbsent: number;
    feesCollectedToday: number;
  };
  studentDistribution: {
    classwiseCount: any[];
    recentEnrollments: any[];
    attendanceTrends: any[];
  };
  financialData: {
    outstandingFees: number;
    monthlyTarget: number;
    dailyCollection: number;
    overdueAccounts: any[];
  };
}

export class DashboardService {
  
  // Admin Dashboard Data
  static async getAdminDashboardData(organizationId: number): Promise<ServiceResponse<AdminDashboardData>> {
    try {
      // Get overview statistics
      const overviewStats = await this.getAdminOverviewStats(organizationId);
      
      // Get recent activities
      const recentActivities = await this.getRecentActivities(organizationId);
      
      // Get financial summary
      const financialSummary = await this.getFinancialSummary(organizationId);
      
      // Get branch performance
      const branchPerformance = await this.getBranchPerformance(organizationId);
      
      // Get quick stats
      const quickStats = await this.getQuickStats(organizationId);

      const dashboardData: AdminDashboardData = {
        overviewStats: overviewStats.data || {
          totalBranches: 0,
          totalStudents: 0,
          totalStaff: 0,
          totalUsers: 0,
          feeCollectionRate: 0,
          overallAttendanceRate: 0
        },
        recentActivities: recentActivities.data || {
          recentStudents: [],
          recentStaff: [],
          recentPayments: []
        },
        financialSummary: financialSummary.data || {
          totalOutstanding: 0,
          totalCollected: 0,
          monthlyCollection: 0,
          overdueStudents: 0
        },
        branchPerformance: branchPerformance.data || {
          topBranches: [],
          attendanceByBranch: []
        },
        quickStats: quickStats.data || {
          studentsPerBranch: [],
          staffPerDepartment: [],
          enrollmentTrends: []
        }
      };

      return { success: true, data: dashboardData };
    } catch (error) {
      console.error('Error in getAdminDashboardData:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch admin dashboard data' };
    }
  }

  // Branch Admin Dashboard Data
  static async getBranchDashboardData(branchId: number, organizationId: number): Promise<ServiceResponse<BranchDashboardData>> {
    try {
      // Get overview statistics for branch
      const overviewStats = await this.getBranchOverviewStats(branchId, organizationId);
      
      // Get today's summary
      const todaySummary = await this.getTodaySummary(branchId);
      
      // Get student distribution
      const studentDistribution = await this.getStudentDistribution(branchId);
      
      // Get financial data for branch
      const financialData = await this.getBranchFinancialData(branchId);

      const dashboardData: BranchDashboardData = {
        overviewStats: overviewStats.data || {
          totalStudents: 0,
          totalStaff: 0,
          todayAttendance: 0,
          feeCollectionRate: 0,
          pendingFees: 0
        },
        todaySummary: todaySummary.data || {
          studentsPresent: 0,
          studentsAbsent: 0,
          staffPresent: 0,
          staffAbsent: 0,
          feesCollectedToday: 0
        },
        studentDistribution: studentDistribution.data || {
          classwiseCount: [],
          recentEnrollments: [],
          attendanceTrends: []
        },
        financialData: financialData.data || {
          outstandingFees: 0,
          monthlyTarget: 0,
          dailyCollection: 0,
          overdueAccounts: []
        }
      };

      return { success: true, data: dashboardData };
    } catch (error) {
      console.error('Error in getBranchDashboardData:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch branch dashboard data' };
    }
  }

  // Helper methods for Admin Dashboard
  private static async getAdminOverviewStats(organizationId: number): Promise<ServiceResponse<any>> {
    try {
      // Total branches
      const [branchCount] = await db
        .select({ count: count() })
        .from(branches)
        .where(and(eq(branches.organizationId, organizationId), eq(branches.isDeleted, false)));

      // Total students
      const [studentCount] = await db
        .select({ count: count() })
        .from(students)
        .where(and(eq(students.organizationId, organizationId), eq(students.isDeleted, false)));

      // Total staff
      const [staffCount] = await db
        .select({ count: count() })
        .from(staff)
        .where(and(eq(staff.organizationId, organizationId), eq(staff.isDeleted, false)));

      // Total users
      const [userCount] = await db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.organizationId, organizationId), eq(users.isDeleted, false)));

      // Fee collection rate
      const [feeStats] = await db
        .select({
          totalFees: sql<number>`COALESCE(SUM(${feeInvoices.totalAmountPaise}), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(${feePayments.amountPaise}), 0)`
        })
        .from(feeInvoices)
        .leftJoin(feePayments, eq(feeInvoices.id, feePayments.feeInvoiceId))
        .leftJoin(students, eq(feeInvoices.studentId, students.id))
        .where(eq(students.organizationId, organizationId));

      const feeCollectionRate = feeStats.totalFees > 0 ? (feeStats.totalPaid / feeStats.totalFees) * 100 : 0;

      // Overall attendance rate (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [attendanceStats] = await db
        .select({
          totalRecords: count(),
          presentRecords: sql<number>`SUM(CASE WHEN ${attendance.status} = 'PRESENT' THEN 1 ELSE 0 END)`
        })
        .from(attendance)
        .leftJoin(students, eq(attendance.studentId, students.id))
        .where(and(
          eq(students.organizationId, organizationId),
          sql`${attendance.date} >= ${thirtyDaysAgo.toISOString().split('T')[0]}`
        ));

      const overallAttendanceRate = attendanceStats.totalRecords > 0 
        ? (Number(attendanceStats.presentRecords) / attendanceStats.totalRecords) * 100 
        : 0;

      return {
        success: true,
        data: {
          totalBranches: branchCount.count,
          totalStudents: studentCount.count,
          totalStaff: staffCount.count,
          totalUsers: userCount.count,
          feeCollectionRate: Math.round(feeCollectionRate * 100) / 100,
          overallAttendanceRate: Math.round(overallAttendanceRate * 100) / 100
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch overview stats' };
    }
  }

  private static async getRecentActivities(organizationId: number): Promise<ServiceResponse<any>> {
    try {
      // Recent students (last 10)
      const recentStudents = await db
        .select({
          id: students.id,
          name: sql<string>`CONCAT(${personDetails.firstName}, ' ', COALESCE(${personDetails.lastName}, ''))`,
          admissionNumber: students.admissionNumber,
          branchName: branches.name,
          createdAt: students.createdAt
        })
        .from(students)
        .leftJoin(personDetails, eq(students.personDetailId, personDetails.id))
        .leftJoin(branches, eq(students.branchId, branches.id))
        .where(and(eq(students.organizationId, organizationId), eq(students.isDeleted, false)))
        .orderBy(desc(students.createdAt))
        .limit(10);

      // Recent staff (last 10)
      const recentStaff = await db
        .select({
          id: staff.id,
          name: sql<string>`CONCAT(${personDetails.firstName}, ' ', COALESCE(${personDetails.lastName}, ''))`,
          employeeId: staff.employeeId,
          department: staff.department,
          branchName: branches.name,
          createdAt: staff.createdAt
        })
        .from(staff)
        .leftJoin(personDetails, eq(staff.personDetailId, personDetails.id))
        .leftJoin(branches, eq(staff.branchId, branches.id))
        .where(and(eq(staff.organizationId, organizationId), eq(staff.isDeleted, false)))
        .orderBy(desc(staff.createdAt))
        .limit(10);

      // Recent payments (last 10)
      const recentPayments = await db
        .select({
          id: feePayments.id,
          amount: feePayments.amountPaise,
          paymentMode: feePayments.paymentMode,
          studentName: sql<string>`CONCAT(${personDetails.firstName}, ' ', COALESCE(${personDetails.lastName}, ''))`,
          branchName: branches.name,
          createdAt: feePayments.createdAt
        })
        .from(feePayments)
        .leftJoin(feeInvoices, eq(feePayments.feeInvoiceId, feeInvoices.id))
        .leftJoin(students, eq(feeInvoices.studentId, students.id))
        .leftJoin(personDetails, eq(students.personDetailId, personDetails.id))
        .leftJoin(branches, eq(students.branchId, branches.id))
        .where(eq(students.organizationId, organizationId))
        .orderBy(desc(feePayments.createdAt))
        .limit(10);

      return {
        success: true,
        data: {
          recentStudents,
          recentStaff,
          recentPayments
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch recent activities' };
    }
  }

  private static async getFinancialSummary(organizationId: number): Promise<ServiceResponse<any>> {
    try {
      // Get financial summary using existing fee service logic
      const [summary] = await db
        .select({
          totalFees: sql<number>`COALESCE(SUM(${feeInvoices.totalAmountPaise}), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(${feePayments.amountPaise}), 0)`
        })
        .from(feeInvoices)
        .leftJoin(feePayments, eq(feeInvoices.id, feePayments.feeInvoiceId))
        .leftJoin(students, eq(feeInvoices.studentId, students.id))
        .where(eq(students.organizationId, organizationId));

      const totalOutstanding = summary.totalFees - summary.totalPaid;

      // Monthly collection (current month)
      const currentMonth = new Date();
      currentMonth.setDate(1);
      
      const [monthlyStats] = await db
        .select({
          monthlyCollection: sql<number>`COALESCE(SUM(${feePayments.amountPaise}), 0)`
        })
        .from(feePayments)
        .leftJoin(feeInvoices, eq(feePayments.feeInvoiceId, feeInvoices.id))
        .leftJoin(students, eq(feeInvoices.studentId, students.id))
        .where(and(
          eq(students.organizationId, organizationId),
          sql`${feePayments.createdAt} >= ${currentMonth.toISOString()}`
        ));

      // Count overdue students (simplified - students with outstanding balances)
      const overdueStudents = await db
        .select({ count: count() })
        .from(students)
        .leftJoin(feeInvoices, eq(students.id, feeInvoices.studentId))
        .leftJoin(feePayments, eq(feeInvoices.id, feePayments.feeInvoiceId))
        .where(and(
          eq(students.organizationId, organizationId),
          sql`${feeInvoices.totalAmountPaise} > COALESCE((
            SELECT SUM(fp.amount_paise) 
            FROM fee_payments fp 
            WHERE fp.fee_invoice_id = ${feeInvoices.id}
          ), 0)`
        ))
        .groupBy(students.id);

      return {
        success: true,
        data: {
          totalOutstanding: Math.round(totalOutstanding / 100), // Convert paise to rupees
          totalCollected: Math.round(summary.totalPaid / 100),
          monthlyCollection: Math.round(monthlyStats.monthlyCollection / 100),
          overdueStudents: overdueStudents.length
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch financial summary' };
    }
  }

  private static async getBranchPerformance(organizationId: number): Promise<ServiceResponse<any>> {
    try {
      // Top performing branches by fee collection
      const topBranches = await db
        .select({
          branchId: branches.id,
          branchName: branches.name,
          totalCollected: sql<number>`COALESCE(SUM(${feePayments.amountPaise}), 0)`,
          studentCount: sql<number>`COUNT(DISTINCT ${students.id})`
        })
        .from(branches)
        .leftJoin(students, eq(branches.id, students.branchId))
        .leftJoin(feeInvoices, eq(students.id, feeInvoices.studentId))
        .leftJoin(feePayments, eq(feeInvoices.id, feePayments.feeInvoiceId))
        .where(and(eq(branches.organizationId, organizationId), eq(branches.isDeleted, false)))
        .groupBy(branches.id, branches.name)
        .orderBy(desc(sql`COALESCE(SUM(${feePayments.amountPaise}), 0)`))
        .limit(5);

      // Attendance by branch (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const attendanceByBranch = await db
        .select({
          branchId: branches.id,
          branchName: branches.name,
          totalRecords: count(),
          presentRecords: sql<number>`SUM(CASE WHEN ${attendance.status} = 'PRESENT' THEN 1 ELSE 0 END)`,
          attendanceRate: sql<number>`ROUND((SUM(CASE WHEN ${attendance.status} = 'PRESENT' THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2)`
        })
        .from(branches)
        .leftJoin(students, eq(branches.id, students.branchId))
        .leftJoin(attendance, eq(students.id, attendance.studentId))
        .where(and(
          eq(branches.organizationId, organizationId),
          eq(branches.isDeleted, false),
          sql`${attendance.date} >= ${thirtyDaysAgo.toISOString().split('T')[0]}`
        ))
        .groupBy(branches.id, branches.name)
        .orderBy(desc(sql`ROUND((SUM(CASE WHEN ${attendance.status} = 'PRESENT' THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2)`));

      return {
        success: true,
        data: {
          topBranches: topBranches.map(branch => ({
            ...branch,
            totalCollected: Math.round(branch.totalCollected / 100)
          })),
          attendanceByBranch
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch branch performance' };
    }
  }

  private static async getQuickStats(organizationId: number): Promise<ServiceResponse<any>> {
    try {
      // Students per branch
      const studentsPerBranch = await db
        .select({
          branchId: branches.id,
          branchName: branches.name,
          studentCount: count()
        })
        .from(branches)
        .leftJoin(students, eq(branches.id, students.branchId))
        .where(and(
          eq(branches.organizationId, organizationId),
          eq(branches.isDeleted, false),
          eq(students.isDeleted, false)
        ))
        .groupBy(branches.id, branches.name)
        .orderBy(desc(count()));

      // Staff per department
      const staffPerDepartment = await db
        .select({
          department: staff.department,
          staffCount: count()
        })
        .from(staff)
        .where(and(eq(staff.organizationId, organizationId), eq(staff.isDeleted, false)))
        .groupBy(staff.department)
        .orderBy(desc(count()));

      // Enrollment trends (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const enrollmentTrends = await db
        .select({
          month: sql<string>`TO_CHAR(${students.createdAt}::date, 'YYYY-MM')`,
          enrollments: count()
        })
        .from(students)
        .where(and(
          eq(students.organizationId, organizationId),
          eq(students.isDeleted, false),
          sql`${students.createdAt} >= ${sixMonthsAgo.toISOString()}`
        ))
        .groupBy(sql`TO_CHAR(${students.createdAt}::date, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${students.createdAt}::date, 'YYYY-MM')`);

      return {
        success: true,
        data: {
          studentsPerBranch,
          staffPerDepartment,
          enrollmentTrends
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch quick stats' };
    }
  }

  // Helper methods for Branch Dashboard
  private static async getBranchOverviewStats(branchId: number, organizationId: number): Promise<ServiceResponse<any>> {
    try {
      // Total students in branch
      const [studentCount] = await db
        .select({ count: count() })
        .from(students)
        .where(and(eq(students.branchId, branchId), eq(students.isDeleted, false)));

      // Total staff in branch
      const [staffCount] = await db
        .select({ count: count() })
        .from(staff)
        .where(and(eq(staff.branchId, branchId), eq(staff.isDeleted, false)));

      // Today's attendance
      const today = new Date().toISOString().split('T')[0];
      const [todayAttendance] = await db
        .select({
          totalRecords: count(),
          presentRecords: sql<number>`SUM(CASE WHEN ${attendance.status} = 'PRESENT' THEN 1 ELSE 0 END)`
        })
        .from(attendance)
        .leftJoin(students, eq(attendance.studentId, students.id))
        .where(and(
          eq(students.branchId, branchId),
          eq(attendance.date, today)
        ));

      const todayAttendanceRate = todayAttendance.totalRecords > 0 
        ? (Number(todayAttendance.presentRecords) / todayAttendance.totalRecords) * 100 
        : 0;

      // Branch fee collection rate
      const [feeStats] = await db
        .select({
          totalFees: sql<number>`COALESCE(SUM(${feeInvoices.totalAmountPaise}), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(${feePayments.amountPaise}), 0)`
        })
        .from(feeInvoices)
        .leftJoin(feePayments, eq(feeInvoices.id, feePayments.feeInvoiceId))
        .leftJoin(students, eq(feeInvoices.studentId, students.id))
        .where(eq(students.branchId, branchId));

      const feeCollectionRate = feeStats.totalFees > 0 ? (feeStats.totalPaid / feeStats.totalFees) * 100 : 0;
      const pendingFees = Math.round((feeStats.totalFees - feeStats.totalPaid) / 100);

      return {
        success: true,
        data: {
          totalStudents: studentCount.count,
          totalStaff: staffCount.count,
          todayAttendance: Math.round(todayAttendanceRate * 100) / 100,
          feeCollectionRate: Math.round(feeCollectionRate * 100) / 100,
          pendingFees
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch branch overview stats' };
    }
  }

  private static async getTodaySummary(branchId: number): Promise<ServiceResponse<any>> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Student attendance today
      const [studentAttendance] = await db
        .select({
          present: sql<number>`SUM(CASE WHEN ${attendance.status} = 'PRESENT' THEN 1 ELSE 0 END)`,
          absent: sql<number>`SUM(CASE WHEN ${attendance.status} = 'ABSENT' THEN 1 ELSE 0 END)`
        })
        .from(attendance)
        .leftJoin(students, eq(attendance.studentId, students.id))
        .where(and(
          eq(students.branchId, branchId),
          eq(attendance.date, today)
        ));

      // Staff attendance today (if you have staff attendance tracking)
      // For now, we'll simulate this
      const [totalStaff] = await db
        .select({ count: count() })
        .from(staff)
        .where(and(eq(staff.branchId, branchId), eq(staff.isDeleted, false)));

      // Fees collected today
      const [todayFees] = await db
        .select({
          amount: sql<number>`COALESCE(SUM(${feePayments.amountPaise}), 0)`
        })
        .from(feePayments)
        .leftJoin(feeInvoices, eq(feePayments.feeInvoiceId, feeInvoices.id))
        .leftJoin(students, eq(feeInvoices.studentId, students.id))
        .where(and(
          eq(students.branchId, branchId),
          sql`DATE(${feePayments.createdAt}) = ${today}`
        ));

      return {
        success: true,
        data: {
          studentsPresent: Number(studentAttendance.present) || 0,
          studentsAbsent: Number(studentAttendance.absent) || 0,
          staffPresent: Math.floor(totalStaff.count * 0.85), // Simulated 85% attendance
          staffAbsent: Math.ceil(totalStaff.count * 0.15),
          feesCollectedToday: Math.round(todayFees.amount / 100)
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch today summary' };
    }
  }

  private static async getStudentDistribution(branchId: number): Promise<ServiceResponse<any>> {
    try {
      // Class-wise student count
      const classwiseCount = await db
        .select({
          classId: classes.id,
          className: classes.name,
          studentCount: count()
        })
        .from(classes)
        .leftJoin(enrollments, eq(classes.id, enrollments.classId))
        .leftJoin(students, eq(enrollments.studentId, students.id))
        .where(and(
          eq(students.branchId, branchId),
          eq(students.isDeleted, false)
        ))
        .groupBy(classes.id, classes.name)
        .orderBy(classes.name);

      // Recent enrollments (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentEnrollments = await db
        .select({
          id: students.id,
          name: sql<string>`CONCAT(${personDetails.firstName}, ' ', COALESCE(${personDetails.lastName}, ''))`,
          admissionNumber: students.admissionNumber,
          className: classes.name,
          createdAt: students.createdAt
        })
        .from(students)
        .leftJoin(personDetails, eq(students.personDetailId, personDetails.id))
        .leftJoin(enrollments, eq(students.id, enrollments.studentId))
        .leftJoin(classes, eq(enrollments.classId, classes.id))
        .where(and(
          eq(students.branchId, branchId),
          eq(students.isDeleted, false),
          sql`${students.createdAt} >= ${thirtyDaysAgo.toISOString()}`
        ))
        .orderBy(desc(students.createdAt))
        .limit(10);

      // Attendance trends by class (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const attendanceTrends = await db
        .select({
          className: classes.name,
          attendanceRate: sql<number>`ROUND((SUM(CASE WHEN ${attendance.status} = 'PRESENT' THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2)`
        })
        .from(classes)
        .leftJoin(enrollments, eq(classes.id, enrollments.classId))
        .leftJoin(students, eq(enrollments.studentId, students.id))
        .leftJoin(attendance, eq(students.id, attendance.studentId))
        .where(and(
          eq(students.branchId, branchId),
          sql`${attendance.date} >= ${sevenDaysAgo.toISOString().split('T')[0]}`
        ))
        .groupBy(classes.id, classes.name)
        .orderBy(classes.name);

      return {
        success: true,
        data: {
          classwiseCount,
          recentEnrollments,
          attendanceTrends
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch student distribution' };
    }
  }

  private static async getBranchFinancialData(branchId: number): Promise<ServiceResponse<any>> {
    try {
      // Outstanding fees
      const [outstandingFees] = await db
        .select({
          totalFees: sql<number>`COALESCE(SUM(${feeInvoices.totalAmountPaise}), 0)`,
          totalPaid: sql<number>`COALESCE(SUM(${feePayments.amountPaise}), 0)`
        })
        .from(feeInvoices)
        .leftJoin(feePayments, eq(feeInvoices.id, feePayments.feeInvoiceId))
        .leftJoin(students, eq(feeInvoices.studentId, students.id))
        .where(eq(students.branchId, branchId));

      const outstanding = Math.round((outstandingFees.totalFees - outstandingFees.totalPaid) / 100);

      // Daily collection (today)
      const today = new Date().toISOString().split('T')[0];
      const [dailyCollection] = await db
        .select({
          amount: sql<number>`COALESCE(SUM(${feePayments.amountPaise}), 0)`
        })
        .from(feePayments)
        .leftJoin(feeInvoices, eq(feePayments.feeInvoiceId, feeInvoices.id))
        .leftJoin(students, eq(feeInvoices.studentId, students.id))
        .where(and(
          eq(students.branchId, branchId),
          sql`DATE(${feePayments.createdAt}) = ${today}`
        ));

      // Overdue accounts (simplified - top 10 students with highest outstanding)
      const overdueAccounts = await db
        .select({
          studentId: students.id,
          studentName: sql<string>`CONCAT(${personDetails.firstName}, ' ', COALESCE(${personDetails.lastName}, ''))`,
          admissionNumber: students.admissionNumber,
          totalDue: sql<number>`${feeInvoices.totalAmountPaise} - COALESCE((
            SELECT SUM(fp.amount_paise) 
            FROM fee_payments fp 
            WHERE fp.fee_invoice_id = ${feeInvoices.id}
          ), 0)`,
          className: classes.name
        })
        .from(students)
        .leftJoin(personDetails, eq(students.personDetailId, personDetails.id))
        .leftJoin(feeInvoices, eq(students.id, feeInvoices.studentId))
        .leftJoin(enrollments, eq(students.id, enrollments.studentId))
        .leftJoin(classes, eq(enrollments.classId, classes.id))
        .where(and(
          eq(students.branchId, branchId),
          sql`${feeInvoices.totalAmountPaise} > COALESCE((
            SELECT SUM(fp.amount_paise) 
            FROM fee_payments fp 
            WHERE fp.fee_invoice_id = ${feeInvoices.id}
          ), 0)`
        ))
        .orderBy(desc(sql`${feeInvoices.totalAmountPaise} - COALESCE((
          SELECT SUM(fp.amount_paise) 
          FROM fee_payments fp 
          WHERE fp.fee_invoice_id = ${feeInvoices.id}
        ), 0)`))
        .limit(10);

      return {
        success: true,
        data: {
          outstandingFees: outstanding,
          monthlyTarget: 100000, // This could be configurable
          dailyCollection: Math.round(dailyCollection.amount / 100),
          overdueAccounts: overdueAccounts.map(account => ({
            ...account,
            totalDue: Math.round(account.totalDue / 100)
          }))
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch branch financial data' };
    }
  }
}