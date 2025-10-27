import db from '../db/index.js';
import { 
  students, 
  staff, 
  departments, 
  subjects, 
  branches, 
  organizations, 
  users, 
  feeInvoices,
  classes,
  enrollments,
  attendance,
  sections
} from '../db/schema.js';
import { eq, and, count, sql, sum } from 'drizzle-orm';

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface OrganizationStats {
  organization: {
    id: number;
    name: string;
    establishedDate?: string;
    totalBranches: number;
  };
  overview: {
    totalStudents: number;
    totalStaff: number;
    totalTeachers: number;
    totalDepartments: number;
    totalGrades: number;
    totalSubjects: number;
    totalUsers: number;
    activeBranches: number;
  };
  demographics: {
    studentsPerBranch: { branchName: string; count: number }[];
    staffPerBranch: { branchName: string; count: number }[];
    departmentsPerBranch: { branchName: string; count: number }[];
    gradesPerBranch: { branchName: string; count: number }[];
  };
  academic: {
    subjectsOffered: number;
    averageEnrollment: number;
    teacherToStudentRatio: string;
    departmentUtilization: { departmentName: string; staffCount: number; studentCount: number }[];
  };
  financial: {
    totalFeesCollected: number;
    pendingFees: number;
    totalExpectedFees: number;
    collectionRate: string;
    branchFinancials: { branchName: string; collected: number; pending: number; rate: string }[];
  };
  attendance: {
    averageAttendanceRate: string;
    totalAttendanceRecords: number;
    branchAttendanceRates: { branchName: string; rate: string }[];
  };
  growth: {
    studentsGrowthThisYear: number;
    staffGrowthThisYear: number;
    newBranchesThisYear: number;
  };
}

export class OrganizationStatisticsService {
  static async generateOrganizationStats(organizationId: number): Promise<ServiceResponse<OrganizationStats>> {
    try {
      // Get organization details
      const organization = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          establishedDate: organizations.createdAt,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (organization.length === 0) {
        return { success: false, error: 'Organization not found' };
      }

      const org = organization[0];

      if(!org?.establishedDate) {
        return { success: false, error: 'Organization established date not found' };
      }

      // Get branches count
      const totalBranches = await db
        .select({ count: count() })
        .from(branches)
        .where(eq(branches.organizationId, organizationId));

      // Get overview stats
      const [
        totalStudentsResult,
        totalStaffResult,
        totalTeachersResult,
        totalDepartmentsResult,
        totalGradesResult,
        totalSubjectsResult,
        totalUsersResult,
        activeBranchesResult
      ] = await Promise.all([
        db.select({ count: count() }).from(students).where(eq(students.organizationId, organizationId)),
        db.select({ count: count() }).from(staff).where(and(eq(staff.organizationId, organizationId), eq(staff.employeeType, 'STAFF'))),
        db.select({ count: count() }).from(staff).where(and(eq(staff.organizationId, organizationId), eq(staff.employeeType, 'TEACHER'))),
        db.select({ count: count() }).from(departments).where(eq(departments.organizationId, organizationId)),
        db.select({ count: count() }).from(classes).innerJoin(branches, eq(classes.branchId, branches.id)).where(eq(branches.organizationId, organizationId)),
        db.select({ count: count() }).from(subjects).where(eq(subjects.organizationId, organizationId)),
        db.select({ count: count() }).from(users).where(eq(users.organizationId, organizationId)),
        db.select({ count: count() }).from(branches).where(and(eq(branches.organizationId, organizationId), eq(branches.status, 'ACTIVE')))
      ]);

      // Get demographics per branch
      const studentsPerBranch = await db
        .select({
          branchName: branches.name,
          count: count(students.id)
        })
        .from(students)
        .leftJoin(branches, eq(students.branchId, branches.id))
        .where(eq(students.organizationId, organizationId))
        .groupBy(branches.id, branches.name);

      const staffPerBranch = await db
        .select({
          branchName: branches.name,
          count: count(staff.id)
        })
        .from(staff)
        .leftJoin(branches, eq(staff.branchId, branches.id))
        .where(eq(staff.organizationId, organizationId))
        .groupBy(branches.id, branches.name);

      const departmentsPerBranch = await db
        .select({
          branchName: branches.name,
          count: count(departments.id)
        })
        .from(departments)
        .leftJoin(branches, eq(departments.branchId, branches.id))
        .where(eq(departments.organizationId, organizationId))
        .groupBy(branches.id, branches.name);

      const gradesPerBranch = await db
        .select({
          branchName: branches.name,
          count: count(classes.id)
        })
        .from(classes)
        .leftJoin(branches, eq(classes.branchId, branches.id))
        .where(eq(branches.organizationId, organizationId))
        .groupBy(branches.id, branches.name);

      // Calculate academic stats
      const totalStudentCount = totalStudentsResult[0]?.count || 0;
      const totalTeacherCount = totalTeachersResult[0]?.count || 0;
      const teacherToStudentRatio = totalTeacherCount > 0 
        ? `1:${Math.round(totalStudentCount / totalTeacherCount)}`
        : '0:0';

      // Get department utilization across organization
      const departmentUtilization = await db
        .select({
          departmentName: departments.name,
          staffCount: count(staff.id),
        })
        .from(departments)
        .leftJoin(staff, eq(staff.departmentId, departments.id))
        .where(eq(departments.organizationId, organizationId))
        .groupBy(departments.id, departments.name);

      // Get student count per department (through staff assignments)
      const departmentStudentCounts = await db
        .select({
          departmentName: departments.name,
          studentCount: count(sql`DISTINCT ${students.id}`)
        })
        .from(departments)
        .leftJoin(staff, eq(staff.departmentId, departments.id))
        .leftJoin(sections, eq(sections.classTeacherId, staff.id))
        .leftJoin(enrollments, eq(enrollments.sectionId, sections.id))
        .leftJoin(students, eq(students.id, enrollments.studentId))
        .where(eq(departments.organizationId, organizationId))
        .groupBy(departments.id, departments.name);

      // Calculate financial stats
      const feeStats = await db
        .select({
          totalFees: sum(feeInvoices.totalAmountPaise),
          paidFees: sum(sql`CASE WHEN ${feeInvoices.status} = 'PAID' THEN ${feeInvoices.totalAmountPaise} ELSE 0 END`),
          pendingFees: sum(sql`CASE WHEN ${feeInvoices.status} = 'PENDING' THEN ${feeInvoices.totalAmountPaise} ELSE 0 END`)
        })
        .from(feeInvoices)
        .innerJoin(branches, eq(feeInvoices.branchId, branches.id))
        .where(eq(branches.organizationId, organizationId));

      const totalFees = Number(feeStats[0]?.totalFees || 0);
      const paidFees = Number(feeStats[0]?.paidFees || 0);
      const pendingFees = Number(feeStats[0]?.pendingFees || 0);
      const collectionRate = totalFees > 0 ? `${Math.round((paidFees / totalFees) * 100)}%` : '0%';

      // Get financial stats per branch
      const branchFinancials = await db
        .select({
          branchName: branches.name,
          collected: sum(sql`CASE WHEN ${feeInvoices.status} = 'PAID' THEN ${feeInvoices.totalAmountPaise} ELSE 0 END`),
          pending: sum(sql`CASE WHEN ${feeInvoices.status} = 'PENDING' THEN ${feeInvoices.totalAmountPaise} ELSE 0 END`),
          total: sum(feeInvoices.totalAmountPaise)
        })
        .from(feeInvoices)
        .innerJoin(branches, eq(feeInvoices.branchId, branches.id))
        .where(eq(branches.organizationId, organizationId))
        .groupBy(branches.id, branches.name);

      const financialStats = {
        totalFeesCollected: paidFees,
        pendingFees: pendingFees,
        totalExpectedFees: totalFees,
        collectionRate,
        branchFinancials: branchFinancials.map((f: any) => ({
          branchName: f.branchName,
          collected: Number(f.collected || 0),
          pending: Number(f.pending || 0),
          rate: Number(f.total || 0) > 0 ? `${Math.round((Number(f.collected || 0) / Number(f.total || 0)) * 100)}%` : '0%'
        }))
      };

      // Calculate attendance stats (placeholder - would need actual attendance records)
      const attendanceStats = {
        averageAttendanceRate: '0%',
        totalAttendanceRecords: 0,
        branchAttendanceRates: [] as { branchName: string; rate: string }[]
      };

      // Calculate growth stats (placeholder - would need historical data)
      const growthStats = {
        studentsGrowthThisYear: 0,
        staffGrowthThisYear: 0,
        newBranchesThisYear: 0
      };

      const stats: OrganizationStats = {
        organization: {
          id: org.id,
          name: org.name,
          establishedDate: org.establishedDate,
          totalBranches: totalBranches[0]?.count || 0
        },
        overview: {
          totalStudents: totalStudentCount,
          totalStaff: totalStaffResult[0]?.count || 0,
          totalTeachers: totalTeacherCount,
          totalDepartments: totalDepartmentsResult[0]?.count || 0,
          totalGrades: totalGradesResult[0]?.count || 0,
          totalSubjects: totalSubjectsResult[0]?.count || 0,
          totalUsers: totalUsersResult[0]?.count || 0,
          activeBranches: activeBranchesResult[0]?.count || 0
        },
        demographics: {
          studentsPerBranch: studentsPerBranch.map((s: any) => ({ branchName: s.branchName || 'Unknown', count: s.count })),
          staffPerBranch: staffPerBranch.map((s: any) => ({ branchName: s.branchName || 'Unknown', count: s.count })),
          departmentsPerBranch: departmentsPerBranch.map((d: any) => ({ branchName: d.branchName || 'Unknown', count: d.count })),
          gradesPerBranch: gradesPerBranch.map((g: any) => ({ branchName: g.branchName || 'Unknown', count: g.count }))
        },
        academic: {
          subjectsOffered: totalSubjectsResult[0]?.count || 0,
          averageEnrollment: totalStudentCount > 0 ? Math.round(totalStudentCount / (totalGradesResult[0]?.count || 1)) : 0,
          teacherToStudentRatio,
          departmentUtilization: departmentUtilization.map((d: any) => {
            const studentData = departmentStudentCounts.find((s: any) => s.departmentName === d.departmentName);
            return {
              departmentName: d.departmentName,
              staffCount: d.staffCount,
              studentCount: studentData?.studentCount || 0
            };
          })
        },
        financial: financialStats,
        attendance: attendanceStats,
        growth: growthStats
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error generating organization stats:', error);
      return { success: false, error: 'Failed to generate organization statistics' };
    }
  }

  static generateMarkdownReport(stats: OrganizationStats): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `# Organization Statistics Report

**${stats.organization.name}**
*Generated on: ${currentDate}*

---

## 📊 Overview

| Metric | Count |
|--------|-------|
| **Total Students** | ${stats.overview.totalStudents.toLocaleString()} |
| **Total Staff** | ${stats.overview.totalStaff.toLocaleString()} |
| **Total Teachers** | ${stats.overview.totalTeachers.toLocaleString()} |
| **Total Departments** | ${stats.overview.totalDepartments.toLocaleString()} |
| **Total Grades** | ${stats.overview.totalGrades.toLocaleString()} |
| **Total Subjects** | ${stats.overview.totalSubjects.toLocaleString()} |
| **Active Branches** | ${stats.overview.activeBranches.toLocaleString()} |
| **Total Users** | ${stats.overview.totalUsers.toLocaleString()} |

---

## 🏢 Branch Demographics

### Students Distribution
${stats.demographics.studentsPerBranch.map(b => `- **${b.branchName}**: ${b.count.toLocaleString()} students`).join('\n')}

### Staff Distribution
${stats.demographics.staffPerBranch.map(b => `- **${b.branchName}**: ${b.count.toLocaleString()} staff members`).join('\n')}

### Department Distribution
${stats.demographics.departmentsPerBranch.map(b => `- **${b.branchName}**: ${b.count.toLocaleString()} departments`).join('\n')}

---

## 🎓 Academic Statistics

- **Subjects Offered**: ${stats.academic.subjectsOffered.toLocaleString()}
- **Average Enrollment**: ${stats.academic.averageEnrollment} students per grade
- **Teacher to Student Ratio**: ${stats.academic.teacherToStudentRatio}

### Department Utilization
${stats.academic.departmentUtilization.map(d => 
  `- **${d.departmentName}**: ${d.staffCount} staff, ${d.studentCount} students`
).join('\n')}

---

## 💰 Financial Overview

- **Total Fees Collected**: ₹${(stats.financial.totalFeesCollected / 100).toLocaleString()}
- **Pending Fees**: ₹${(stats.financial.pendingFees / 100).toLocaleString()}
- **Total Expected Fees**: ₹${(stats.financial.totalExpectedFees / 100).toLocaleString()}
- **Collection Rate**: ${stats.financial.collectionRate}

### Branch-wise Financial Performance
${stats.financial.branchFinancials.map(b => 
  `- **${b.branchName}**: Collected ₹${(b.collected / 100).toLocaleString()}, Pending ₹${(b.pending / 100).toLocaleString()} (${b.rate})`
).join('\n')}

---

## 📅 Attendance Overview

- **Average Attendance Rate**: ${stats.attendance.averageAttendanceRate}
- **Total Attendance Records**: ${stats.attendance.totalAttendanceRecords.toLocaleString()}

---

## 📈 Growth Metrics

- **Student Growth This Year**: ${stats.growth.studentsGrowthThisYear > 0 ? '+' : ''}${stats.growth.studentsGrowthThisYear}
- **Staff Growth This Year**: ${stats.growth.staffGrowthThisYear > 0 ? '+' : ''}${stats.growth.staffGrowthThisYear}
- **New Branches This Year**: ${stats.growth.newBranchesThisYear}

---

*Report generated by Akshara Management System*`;
  }
}