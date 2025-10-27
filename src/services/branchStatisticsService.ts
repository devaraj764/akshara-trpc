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
  sections,
  subjectAssignments,
  addresses
} from '../db/schema.js';
import { eq, and, count, sql, sum } from 'drizzle-orm';

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BranchStats {
  branch: {
    id: number;
    name: string;
    organizationName: string;
    establishedDate?: string | undefined;
    address?: {
      id: number;
      addressLine1: string;
      addressLine2: string | undefined;
      cityVillage: string | undefined;
      state: string | undefined;
      country: string | undefined;
      pincode: string | undefined;
    } | undefined;
  };
  overview: {
    totalStudents: number;
    totalStaff: number;
    totalTeachers: number;
    totalDepartments: number;
    totalClasses: number;
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

export class BranchStatisticsService {
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

      const branchInfo = branch[0]!;

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
        db.select({ count: count(sql`DISTINCT ${subjects.id}`) }).from(subjects)
          .innerJoin(subjectAssignments, eq(subjectAssignments.subjectId, subjects.id))
          .innerJoin(sections, eq(sections.id, subjectAssignments.sectionId))
          .where(eq(sections.branchId, branchId)),
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

      // Get subject-teacher mapping
      const subjectTeacherMapping = await db
        .select({
          subjectName: subjects.name,
          teacherCount: count(sql`DISTINCT ${subjectAssignments.staffId}`)
        })
        .from(subjects)
        .innerJoin(subjectAssignments, eq(subjectAssignments.subjectId, subjects.id))
        .innerJoin(sections, eq(sections.id, subjectAssignments.sectionId))
        .where(eq(sections.branchId, branchId))
        .groupBy(subjects.id, subjects.name);

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

      // Get fee collection by grade
      const feesByGrade = await db
        .select({
          gradeName: classes.name,
          collected: sum(sql`CASE WHEN ${feeInvoices.status} = 'PAID' THEN ${feeInvoices.totalAmountPaise} ELSE 0 END`),
          pending: sum(sql`CASE WHEN ${feeInvoices.status} = 'PENDING' THEN ${feeInvoices.totalAmountPaise} ELSE 0 END`)
        })
        .from(feeInvoices)
        .innerJoin(enrollments, eq(feeInvoices.enrollmentId, enrollments.id))
        .innerJoin(classes, eq(enrollments.classId, classes.id))
        .where(eq(feeInvoices.branchId, branchId))
        .groupBy(classes.id, classes.name);

      // Get staff demographics
      const employeeTypes = [
        { type: 'Staff', count: totalStaffResult[0]?.count || 0 },
        { type: 'Teacher', count: totalTeacherCount }
      ];

      const departmentWiseStaff = await db
        .select({
          departmentName: departments.name,
          staffCount: count(sql`CASE WHEN ${staff.employeeType} = 'STAFF' THEN 1 END`),
          teacherCount: count(sql`CASE WHEN ${staff.employeeType} = 'TEACHER' THEN 1 END`)
        })
        .from(departments)
        .leftJoin(staff, eq(staff.departmentId, departments.id))
        .where(eq(departments.branchId, branchId))
        .groupBy(departments.id, departments.name);

      const stats: BranchStats = {
        branch: {
          id: branchInfo.id,
          name: branchInfo.name,
          address: branchInfo.address,
          organizationName: branchInfo.organizationName || 'Unknown',
          ...(branchInfo.establishedDate && { establishedDate: branchInfo.establishedDate })
        },
        overview: {
          totalStudents: totalStudentCount,
          totalStaff: totalStaffResult[0]?.count || 0,
          totalTeachers: totalTeacherCount,
          totalDepartments: totalDepartmentsResult[0]?.count || 0,
          totalClasses: totalClassesResult[0]?.count || 0,
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
          subjectTeacherMapping: subjectTeacherMapping.map((s: any) => ({
            subjectName: s.subjectName,
            teacherCount: s.teacherCount
          })),
          averageEnrollment,
          teacherToStudentRatio
        },
        attendance: {
          averageAttendanceRate: '0%', // Placeholder - implement when attendance system is ready
          totalAttendanceRecords: 0,
          monthlyAttendance: [],
          gradeAttendanceRates: []
        },
        financial: {
          totalFeesCollected: paidFees,
          pendingFees: pendingFees,
          totalExpectedFees: totalFees,
          collectionRate,
          feesByGrade: feesByGrade.map((f: any) => ({
            gradeName: f.gradeName,
            collected: Number(f.collected || 0),
            pending: Number(f.pending || 0)
          }))
        },
        staff: {
          employeeTypes,
          departmentWiseStaff: departmentWiseStaff.map((d: any) => ({
            departmentName: d.departmentName,
            staffCount: d.staffCount,
            teacherCount: d.teacherCount
          })),
          averageExperience: '0 years', // Placeholder - implement when experience data is available
          genderDistribution: [] // Placeholder - implement when gender data is available
        },
        students: {
          gradeDistribution: [], // Placeholder - can be derived from gradeDistribution above
          genderDistribution: [], // Placeholder - implement when gender data is available
          ageDistribution: [] // Placeholder - implement when age data is available
        }
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error generating branch stats:', error);
      return { success: false, error: 'Failed to generate branch statistics' };
    }
  }

  static generateMarkdownReport(stats: BranchStats): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `# Branch Statistics Report

**${stats.branch.name}**
*Organization: ${stats.branch.organizationName}*
*Generated on: ${currentDate}*

---

## 📊 Overview

| Metric | Count |
|--------|-------|
| **Total Students** | ${stats.overview.totalStudents.toLocaleString()} |
| **Total Staff** | ${stats.overview.totalStaff.toLocaleString()} |
| **Total Teachers** | ${stats.overview.totalTeachers.toLocaleString()} |
| **Total Departments** | ${stats.overview.totalDepartments.toLocaleString()} |
| **Total classes** | ${stats.overview.totalClasses.toLocaleString()} |
| **Total Subjects** | ${stats.overview.totalSubjects.toLocaleString()} |
| **Total Users** | ${stats.overview.totalUsers.toLocaleString()} |

---

## 🎓 Academic Distribution

### Grade Distribution
${stats.academic.gradeDistribution.map(g => 
  `- **${g.gradeName}**: ${g.studentCount} students`
).join('\n')}

### Department Distribution
${stats.academic.departmentDistribution.map(d => 
  `- **${d.departmentName}**: ${d.staffCount} staff members`
).join('\n')}

### Academic Metrics
- **Average Enrollment**: ${stats.academic.averageEnrollment} students per grade
- **Teacher to Student Ratio**: ${stats.academic.teacherToStudentRatio}

---

## 👥 Staff Statistics

### Employee Types
${stats.staff.employeeTypes.map(e => `- **${e.type}**: ${e.count} members`).join('\n')}

### Department-wise Staff
${stats.staff.departmentWiseStaff.map(d => 
  `- **${d.departmentName}**: ${d.staffCount} staff, ${d.teacherCount} teachers`
).join('\n')}

---

## 💰 Financial Summary

- **Total Fees Collected**: ₹${(stats.financial.totalFeesCollected / 100).toLocaleString()}
- **Pending Fees**: ₹${(stats.financial.pendingFees / 100).toLocaleString()}
- **Collection Rate**: ${stats.financial.collectionRate}

### Fee Collection by Grade
${stats.financial.feesByGrade.map(f => 
  `- **${f.gradeName}**: Collected ₹${(f.collected / 100).toLocaleString()}, Pending ₹${(f.pending / 100).toLocaleString()}`
).join('\n')}

---

## 📅 Attendance Summary

- **Average Attendance Rate**: ${stats.attendance.averageAttendanceRate}
- **Total Attendance Records**: ${stats.attendance.totalAttendanceRecords.toLocaleString()}

---

*Report generated by Akshara Management System*`;
  }
}