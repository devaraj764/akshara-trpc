import { Address } from 'cluster';
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
  addresses
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
    totalClasses: number;
    totalSubjects: number;
    totalUsers: number;
    activeBranches: number;
  };
  demographics: {
    studentsPerBranch: { branchName: string; count: number }[];
    staffPerBranch: { branchName: string; count: number }[];
    departmentsPerBranch: { branchName: string; count: number }[];
    classesPerBranch: { branchName: string; count: number }[];
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

export interface BranchStats {
  branch: {
    id: number;
    name: string;
    organizationName: string;
    establishedDate?: string;
    address?: any;
  };
  overview: {
    totalStudents: number;
    totalStaff: number;
    totalTeachers: number;
    totalDepartments: number;
    totalclasses: number;
    totalSubjects: number;
    totalUsers: number;
  };
  academic: {
    gradeDistribution: { gradeName: string; studentCount: number }[];
    departmentDistribution: { departmentName: string; staffCount: number }[];
    subjectTeacherMapping: { subjectName: string; teacherCount: number }[];
    averageEnrollment: number;
    teacherToStudentRatio: string;
  };
  attendance: {
    averageAttendanceRate: string;
    totalAttendanceRecords: number;
    monthlyAttendance: { month: string; rate: string }[];
    gradeAttendanceRates: { gradeName: string; rate: string }[];
  };
  financial: {
    totalFeesCollected: number;
    pendingFees: number;
    totalExpectedFees: number;
    collectionRate: string;
    feesByGrade: { gradeName: string; collected: number; pending: number }[];
  };
  staff: {
    employeeTypes: { type: string; count: number }[];
    departmentWiseStaff: { departmentName: string; staffCount: number; teacherCount: number }[];
    averageExperience: string;
    genderDistribution: { gender: string; count: number }[];
  };
  students: {
    gradeDistribution: { gradeLevel: string; count: number }[];
    genderDistribution: { gender: string; count: number }[];
    ageDistribution: { ageGroup: string; count: number }[];
  };
}

export class StatisticsService {
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
        totalClassesResult,
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

      const classesPerBranch = await db
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

      // Get department utilization
      const departmentUtilization = await db
        .select({
          departmentName: departments.name,
          staffCount: count(staff.id),
        })
        .from(departments)
        .leftJoin(staff, eq(staff.departmentId, departments.id))
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

      const financialStats = {
        totalFeesCollected: paidFees,
        pendingFees: pendingFees,
        totalExpectedFees: totalFees,
        collectionRate
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

      if (!org) {
        throw new Error('Organization not found');
      }

      const stats: OrganizationStats = {
        organization: {
          id: organizationId,
          name: org.name,
          establishedDate: org.establishedDate,
          totalBranches: totalBranches[0]?.count || 0
        },
        overview: {
          totalStudents: totalStudentCount,
          totalStaff: totalStaffResult[0]?.count || 0,
          totalTeachers: totalTeacherCount,
          totalDepartments: totalDepartmentsResult[0]?.count || 0,
          totalClasses: totalClassesResult[0]?.count || 0,
          totalSubjects: totalSubjectsResult[0]?.count || 0,
          totalUsers: totalUsersResult[0]?.count || 0,
          activeBranches: activeBranchesResult[0]?.count || 0
        },
        demographics: {
          studentsPerBranch: studentsPerBranch.map((s: any) => ({ branchName: s.branchName || 'Unknown', count: s.count })),
          staffPerBranch: staffPerBranch.map((s: any) => ({ branchName: s.branchName || 'Unknown', count: s.count })),
          departmentsPerBranch: departmentsPerBranch.map((d: any) => ({ branchName: d.branchName || 'Unknown', count: d.count })),
          classesPerBranch: classesPerBranch.map((g: any) => ({ branchName: g.branchName || 'Unknown', count: g.count }))
        },
        academic: {
          subjectsOffered: totalSubjectsResult[0]?.count || 0,
          averageEnrollment: totalStudentCount > 0 ? Math.round(totalStudentCount / (totalClassesResult[0]?.count || 1)) : 0,
          teacherToStudentRatio,
          departmentUtilization: departmentUtilization.map((d: any) => ({
            departmentName: d.departmentName,
            staffCount: d.staffCount,
            studentCount: 0 // Would need complex query to calculate students per department
          }))
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

  static async generateBranchStats(branchId: number): Promise<ServiceResponse<BranchStats>> {
    try {
      // Get branch details
      const branch = await db
        .select({
          id: branches.id,
          name: branches.name,
          organizationName: organizations.name,
          establishedDate: branches.createdAt,
          address: {
            id: addresses.id,
            addressLine1: addresses.addressLine1,
            addressLine2: addresses.addressLine2 || '',
            cityVillage: addresses.cityVillage || '',
            state: addresses.state || '',
            country: addresses.country || '',
            pincode: addresses.pincode || ''
          }
        })
        .from(branches)
        .leftJoin(organizations, eq(branches.organizationId, organizations.id))
        .leftJoin(addresses, eq(branches.addressId, addresses.id))
        .where(eq(branches.id, branchId))
        .limit(1);

      if (branch.length === 0) {
        return { success: false, error: 'Branch not found' };
      }

      const branchInfo = branch[0];

      if (!branchInfo) {
        return { success: false, error: 'Branch not found' };
      }

      // Get overview stats
      const [
        totalStudentsResult,
        totalStaffResult,
        totalTeachersResult,
        totalDepartmentsResult,
        totalClassesResult,
        totalSubjectsResult,
        totalUsersResult
      ] = await Promise.all([
        db.select({ count: count() }).from(students).where(eq(students.branchId, branchId)),
        db.select({ count: count() }).from(staff).where(and(eq(staff.branchId, branchId), eq(staff.employeeType, 'STAFF'))),
        db.select({ count: count() }).from(staff).where(and(eq(staff.branchId, branchId), eq(staff.employeeType, 'TEACHER'))),
        db.select({ count: count() }).from(departments).where(eq(departments.branchId, branchId)),
        db.select({ count: count() }).from(classes).where(eq(classes.branchId, branchId)),
        db.select({ count: count() }).from(subjects).innerJoin(branches, eq(branches.id, branchId)).where(eq(subjects.organizationId, branches.organizationId)),
        db.select({ count: count() }).from(users).where(eq(users.branchId, branchId))
      ]);

      // Get grade distribution
      const gradeDistribution = await db
        .select({
          gradeName: classes.name,
          studentCount: count(enrollments.id)
        })
        .from(classes)
        .leftJoin(enrollments, eq(enrollments.classId, classes.id))
        .where(and(eq(classes.branchId, branchId), eq(enrollments.isDeleted, false)))
        .groupBy(classes.id, classes.name);

      // Get department distribution
      const departmentDistribution = await db
        .select({
          departmentName: departments.name,
          staffCount: count(staff.id)
        })
        .from(departments)
        .leftJoin(staff, eq(staff.departmentId, departments.id))
        .where(eq(departments.branchId, branchId))
        .groupBy(departments.id, departments.name);

      // Calculate academic ratios
      const totalStudentCount = totalStudentsResult[0]?.count || 0;
      const totalTeacherCount = totalTeachersResult[0]?.count || 0;
      const teacherToStudentRatio = totalTeacherCount > 0
        ? `1:${Math.round(totalStudentCount / totalTeacherCount)}`
        : '0:0';

      const averageEnrollment = gradeDistribution.length > 0
        ? Math.round(gradeDistribution.reduce((sum: number, g: any) => sum + g.studentCount, 0) / gradeDistribution.length)
        : 0;

      // Get financial stats for this branch
      const feeStats = await db
        .select({
          totalFees: sum(feeInvoices.totalAmountPaise),
          paidFees: sum(sql`CASE WHEN ${feeInvoices.status} = 'PAID' THEN ${feeInvoices.totalAmountPaise} ELSE 0 END`),
          pendingFees: sum(sql`CASE WHEN ${feeInvoices.status} = 'PENDING' THEN ${feeInvoices.totalAmountPaise} ELSE 0 END`)
        })
        .from(feeInvoices)
        .where(eq(feeInvoices.branchId, branchId));

      const totalFees = Number(feeStats[0]?.totalFees || 0);
      const paidFees = Number(feeStats[0]?.paidFees || 0);
      const pendingFees = Number(feeStats[0]?.pendingFees || 0);
      const collectionRate = totalFees > 0 ? `${Math.round((paidFees / totalFees) * 100)}%` : '0%';



      const stats: BranchStats = {
        branch: {
          id: branchInfo.id,
          name: branchInfo.name,
          organizationName: branchInfo.organizationName || 'Unknown',
          establishedDate: branchInfo.establishedDate,
          address: branchInfo?.address,
        },
        overview: {
          totalStudents: totalStudentCount,
          totalStaff: totalStaffResult[0]?.count || 0,
          totalTeachers: totalTeacherCount,
          totalDepartments: totalDepartmentsResult[0]?.count || 0,
          totalclasses: totalClassesResult[0]?.count || 0,
          totalSubjects: totalSubjectsResult[0]?.count || 0,
          totalUsers: totalUsersResult[0]?.count || 0
        },
        academic: {
          gradeDistribution: gradeDistribution.map((g: any) => ({
            gradeName: g.gradeName,
            studentCount: g.studentCount
          })),
          departmentDistribution: departmentDistribution.map((d: any) => ({
            departmentName: d.departmentName,
            staffCount: d.staffCount
          })),
          subjectTeacherMapping: [], // Would need subject-teacher relationships
          averageEnrollment,
          teacherToStudentRatio
        },
        attendance: {
          averageAttendanceRate: '0%',
          totalAttendanceRecords: 0,
          monthlyAttendance: [],
          gradeAttendanceRates: []
        },
        financial: {
          totalFeesCollected: paidFees,
          pendingFees: pendingFees,
          totalExpectedFees: totalFees,
          collectionRate,
          feesByGrade: []
        },
        staff: {
          employeeTypes: [
            { type: 'Staff', count: totalStaffResult[0]?.count || 0 },
            { type: 'Teacher', count: totalTeacherCount }
          ],
          departmentWiseStaff: departmentDistribution.map((d: any) => ({
            departmentName: d.departmentName,
            staffCount: d.staffCount,
            teacherCount: 0 // Would need to calculate separately
          })),
          averageExperience: '0 years',
          genderDistribution: []
        },
        students: {
          gradeDistribution: [],
          genderDistribution: [],
          ageDistribution: []
        }
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error generating branch stats:', error);
      return { success: false, error: 'Failed to generate branch statistics' };
    }
  }

  static generateMarkdownReport(stats: OrganizationStats | BranchStats, type: 'organization' | 'branch'): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (type === 'organization') {
      const orgStats = stats as OrganizationStats;
      return `# Organization Statistics Report

**${orgStats.organization.name}**
*Generated on: ${currentDate}*

---

## 📊 Overview

| Metric | Count |
|--------|-------|
| **Total Students** | ${orgStats.overview.totalStudents.toLocaleString()} |
| **Total Staff** | ${orgStats.overview.totalStaff.toLocaleString()} |
| **Total Teachers** | ${orgStats.overview.totalTeachers.toLocaleString()} |
| **Total Departments** | ${orgStats.overview.totalDepartments.toLocaleString()} |
| **Total Classes** | ${orgStats.overview.totalClasses.toLocaleString()} |
| **Total Subjects** | ${orgStats.overview.totalSubjects.toLocaleString()} |
| **Active Branches** | ${orgStats.overview.activeBranches.toLocaleString()} |
| **Total Users** | ${orgStats.overview.totalUsers.toLocaleString()} |

---

## 🏢 Branch Demographics

### Students Distribution
${orgStats.demographics.studentsPerBranch.map(b => `- **${b.branchName}**: ${b.count.toLocaleString()} students`).join('\n')}

### Staff Distribution
${orgStats.demographics.staffPerBranch.map(b => `- **${b.branchName}**: ${b.count.toLocaleString()} staff members`).join('\n')}

### Department Distribution
${orgStats.demographics.departmentsPerBranch.map(b => `- **${b.branchName}**: ${b.count.toLocaleString()} departments`).join('\n')}

---

## 🎓 Academic Statistics

- **Subjects Offered**: ${orgStats.academic.subjectsOffered.toLocaleString()}
- **Average Enrollment**: ${orgStats.academic.averageEnrollment} students per grade
- **Teacher to Student Ratio**: ${orgStats.academic.teacherToStudentRatio}

### Department Utilization
${orgStats.academic.departmentUtilization.map(d =>
        `- **${d.departmentName}**: ${d.staffCount} staff, ${d.studentCount} students`
      ).join('\n')}

---

## 💰 Financial Overview

- **Total Fees Collected**: ₹${(orgStats.financial.totalFeesCollected / 100).toLocaleString()}
- **Pending Fees**: ₹${(orgStats.financial.pendingFees / 100).toLocaleString()}
- **Total Expected Fees**: ₹${(orgStats.financial.totalExpectedFees / 100).toLocaleString()}
- **Collection Rate**: ${orgStats.financial.collectionRate}

---

## 📅 Attendance Overview

- **Average Attendance Rate**: ${orgStats.attendance.averageAttendanceRate}
- **Total Attendance Records**: ${orgStats.attendance.totalAttendanceRecords.toLocaleString()}

---

## 📈 Growth Metrics

- **Student Growth This Year**: ${orgStats.growth.studentsGrowthThisYear > 0 ? '+' : ''}${orgStats.growth.studentsGrowthThisYear}
- **Staff Growth This Year**: ${orgStats.growth.staffGrowthThisYear > 0 ? '+' : ''}${orgStats.growth.staffGrowthThisYear}
- **New Branches This Year**: ${orgStats.growth.newBranchesThisYear}

---

*Report generated by Akshara Management System*`;
    } else {
      const branchStats = stats as BranchStats;
      return `# Branch Statistics Report

**${branchStats.branch.name}**
*Organization: ${branchStats.branch.organizationName}*
*Generated on: ${currentDate}*

---

## 📊 Overview

| Metric | Count |
|--------|-------|
| **Total Students** | ${branchStats.overview.totalStudents.toLocaleString()} |
| **Total Staff** | ${branchStats.overview.totalStaff.toLocaleString()} |
| **Total Teachers** | ${branchStats.overview.totalTeachers.toLocaleString()} |
| **Total Departments** | ${branchStats.overview.totalDepartments.toLocaleString()} |
| **Total classes** | ${branchStats.overview.totalclasses.toLocaleString()} |
| **Total Subjects** | ${branchStats.overview.totalSubjects.toLocaleString()} |
| **Total Users** | ${branchStats.overview.totalUsers.toLocaleString()} |

---

## 🎓 Academic Distribution

### Grade Distribution
${branchStats.academic.gradeDistribution.map(g =>
        `- **${g.gradeName}**: ${g.studentCount} students`
      ).join('\n')}

### Department Distribution
${branchStats.academic.departmentDistribution.map(d =>
        `- **${d.departmentName}**: ${d.staffCount} staff members`
      ).join('\n')}

### Academic Metrics
- **Average Enrollment**: ${branchStats.academic.averageEnrollment} students per grade
- **Teacher to Student Ratio**: ${branchStats.academic.teacherToStudentRatio}

---

## 👥 Staff Statistics

### Employee Types
${branchStats.staff.employeeTypes.map(e => `- **${e.type}**: ${e.count} members`).join('\n')}

### Department-wise Staff
${branchStats.staff.departmentWiseStaff.map(d =>
        `- **${d.departmentName}**: ${d.staffCount} staff, ${d.teacherCount} teachers`
      ).join('\n')}

---

## 👨‍🎓 Student Demographics

${branchStats.students.gradeDistribution.length > 0 ? `### Grade Distribution
${branchStats.students.gradeDistribution.map(g => `- **${g.gradeLevel}**: ${g.count} students`).join('\n')}` : ''}

${branchStats.students.genderDistribution.length > 0 ? `### Gender Distribution
${branchStats.students.genderDistribution.map(g => `- **${g.gender}**: ${g.count} students`).join('\n')}` : ''}

---

## 💰 Financial Summary

- **Total Fees Collected**: ₹${(branchStats.financial.totalFeesCollected / 100).toLocaleString()}
- **Pending Fees**: ₹${(branchStats.financial.pendingFees / 100).toLocaleString()}
- **Collection Rate**: ${branchStats.financial.collectionRate}

---

## 📅 Attendance Summary

- **Average Attendance Rate**: ${branchStats.attendance.averageAttendanceRate}
- **Total Attendance Records**: ${branchStats.attendance.totalAttendanceRecords.toLocaleString()}

---

*Report generated by Akshara Management System*`;
    }
  }
}