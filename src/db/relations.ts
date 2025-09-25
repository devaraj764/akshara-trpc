import { relations } from "drizzle-orm/relations";
import { branches, academicYears, organizations, enrollments, grades, sections, students, exams, parents, users, departments, staff, subjects, subjectAssignments, staffAttendance, attendance, studentAttendanceRecords, statistics, studentMedicalRecords, studentBehavioralRecords, studentDocuments, studentExtracurricularActivities, staffProfessionalHistory, staffBenefits, staffPerformanceEvaluations, staffCredentials, assets, noticeBoard, userRoles, periods, studentParents, examSchedule, marks, feeInvoices, feeInvoiceItems, feeItems, feePayments, staffSalaries, monthlyPayslips, auditLogs, notifications, files, academicCalendarEvents, classTeachers, timetables, feeTypes } from "./schema";

export const academicYearsRelations = relations(academicYears, ({one, many}) => ({
	branch: one(branches, {
		fields: [academicYears.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [academicYears.organizationId],
		references: [organizations.id]
	}),
	enrollments: many(enrollments),
	exams: many(exams),
	attendances: many(attendance),
	academicCalendarEvents: many(academicCalendarEvents),
	feeItems: many(feeItems),
}));

export const branchesRelations = relations(branches, ({one, many}) => ({
	academicYears: many(academicYears),
	enrollments: many(enrollments),
	exams: many(exams),
	parents: many(parents),
	staff: many(staff),
	grades: many(grades),
	sections: many(sections),
	departments: many(departments),
	statistics: many(statistics),
	assets: many(assets),
	noticeBoards: many(noticeBoard),
	users: many(users),
	userRoles: many(userRoles),
	periods: many(periods),
	students: many(students),
	attendances: many(attendance),
	feeInvoices: many(feeInvoices),
	staffSalaries: many(staffSalaries),
	monthlyPayslips: many(monthlyPayslips),
	auditLogs: many(auditLogs),
	notifications: many(notifications),
	files: many(files),
	organization: one(organizations, {
		fields: [branches.organizationId],
		references: [organizations.id]
	}),
	academicCalendarEvents: many(academicCalendarEvents),
	timetables: many(timetables),
	feeItems: many(feeItems),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	academicYears: many(academicYears),
	parents: many(parents),
	staff: many(staff),
	subjects: many(subjects),
	grades: many(grades),
	departments: many(departments),
	statistics: many(statistics),
	assets: many(assets),
	noticeBoards: many(noticeBoard),
	users: many(users),
	userRoles: many(userRoles),
	students: many(students),
	staffSalaries: many(staffSalaries),
	monthlyPayslips: many(monthlyPayslips),
	auditLogs: many(auditLogs),
	branches: many(branches),
	feeItems: many(feeItems),
	feeTypes: many(feeTypes),
}));

export const enrollmentsRelations = relations(enrollments, ({one, many}) => ({
	academicYear: one(academicYears, {
		fields: [enrollments.academicYearId],
		references: [academicYears.id]
	}),
	branch: one(branches, {
		fields: [enrollments.branchId],
		references: [branches.id]
	}),
	grade: one(grades, {
		fields: [enrollments.gradeId],
		references: [grades.id]
	}),
	section: one(sections, {
		fields: [enrollments.sectionId],
		references: [sections.id]
	}),
	student: one(students, {
		fields: [enrollments.studentId],
		references: [students.id]
	}),
	studentAttendanceRecords: many(studentAttendanceRecords),
	marks: many(marks),
	feeInvoices: many(feeInvoices),
}));

export const gradesRelations = relations(grades, ({one, many}) => ({
	enrollments: many(enrollments),
	organization: one(organizations, {
		fields: [grades.organizationId],
		references: [organizations.id]
	}),
	branch: one(branches, {
		fields: [grades.branchId],
		references: [branches.id]
	}),
	sections: many(sections),
	examSchedules: many(examSchedule),
	classTeachers: many(classTeachers),
	timetables: many(timetables),
}));

export const sectionsRelations = relations(sections, ({one, many}) => ({
	enrollments: many(enrollments),
	branch: one(branches, {
		fields: [sections.branchId],
		references: [branches.id]
	}),
	grade: one(grades, {
		fields: [sections.gradeId],
		references: [grades.id]
	}),
	subjectAssignments: many(subjectAssignments),
	examSchedules: many(examSchedule),
	classTeachers: many(classTeachers),
	timetables: many(timetables),
}));

export const studentsRelations = relations(students, ({one, many}) => ({
	enrollments: many(enrollments),
	studentAttendanceRecords: many(studentAttendanceRecords),
	studentMedicalRecords: many(studentMedicalRecords),
	studentBehavioralRecords: many(studentBehavioralRecords),
	studentDocuments: many(studentDocuments),
	studentExtracurricularActivities: many(studentExtracurricularActivities),
	branch: one(branches, {
		fields: [students.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [students.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [students.userId],
		references: [users.id]
	}),
	studentParents: many(studentParents),
	marks: many(marks),
	feeInvoices: many(feeInvoices),
}));

export const examsRelations = relations(exams, ({one, many}) => ({
	academicYear: one(academicYears, {
		fields: [exams.academicYearId],
		references: [academicYears.id]
	}),
	branch: one(branches, {
		fields: [exams.branchId],
		references: [branches.id]
	}),
	examSchedules: many(examSchedule),
	marks: many(marks),
}));

export const parentsRelations = relations(parents, ({one, many}) => ({
	branch: one(branches, {
		fields: [parents.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [parents.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [parents.userId],
		references: [users.id]
	}),
	studentParents: many(studentParents),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	parents: many(parents),
	staff: many(staff),
	studentAttendanceRecords: many(studentAttendanceRecords),
	branch: one(branches, {
		fields: [users.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [users.organizationId],
		references: [organizations.id]
	}),
	userRoles: many(userRoles),
	students: many(students),
	studentParents: many(studentParents),
	marks: many(marks),
	feeInvoices: many(feeInvoices),
	feePayments: many(feePayments),
	monthlyPayslips_approvedBy: many(monthlyPayslips, {
		relationName: "monthlyPayslips_approvedBy_users_id"
	}),
	monthlyPayslips_generatedBy: many(monthlyPayslips, {
		relationName: "monthlyPayslips_generatedBy_users_id"
	}),
	monthlyPayslips_paidBy: many(monthlyPayslips, {
		relationName: "monthlyPayslips_paidBy_users_id"
	}),
	auditLogs: many(auditLogs),
	files: many(files),
}));

export const staffRelations = relations(staff, ({one, many}) => ({
	department: one(departments, {
		fields: [staff.departmentId],
		references: [departments.id]
	}),
	branch: one(branches, {
		fields: [staff.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [staff.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [staff.userId],
		references: [users.id]
	}),
	subjectAssignments: many(subjectAssignments),
	staffAttendances: many(staffAttendance),
	staffProfessionalHistories: many(staffProfessionalHistory),
	staffBenefits: many(staffBenefits),
	staffPerformanceEvaluations: many(staffPerformanceEvaluations),
	staffCredentials: many(staffCredentials),
	classTeachers: many(classTeachers),
	timetables: many(timetables),
}));

export const departmentsRelations = relations(departments, ({one, many}) => ({
	staff: many(staff),
	organization: one(organizations, {
		fields: [departments.organizationId],
		references: [organizations.id]
	}),
	branch: one(branches, {
		fields: [departments.branchId],
		references: [branches.id]
	}),
}));

export const subjectsRelations = relations(subjects, ({one, many}) => ({
	organization: one(organizations, {
		fields: [subjects.organizationId],
		references: [organizations.id]
	}),
	subjectAssignments: many(subjectAssignments),
	examSchedules: many(examSchedule),
	marks: many(marks),
	timetables: many(timetables),
}));

export const subjectAssignmentsRelations = relations(subjectAssignments, ({one}) => ({
	staff: one(staff, {
		fields: [subjectAssignments.staffId],
		references: [staff.id]
	}),
	subject: one(subjects, {
		fields: [subjectAssignments.subjectId],
		references: [subjects.id]
	}),
	section: one(sections, {
		fields: [subjectAssignments.sectionId],
		references: [sections.id]
	}),
}));

export const staffAttendanceRelations = relations(staffAttendance, ({one}) => ({
	staff: one(staff, {
		fields: [staffAttendance.staffId],
		references: [staff.id]
	}),
}));

export const studentAttendanceRecordsRelations = relations(studentAttendanceRecords, ({one}) => ({
	attendance: one(attendance, {
		fields: [studentAttendanceRecords.attendanceId],
		references: [attendance.id]
	}),
	enrollment: one(enrollments, {
		fields: [studentAttendanceRecords.enrollmentId],
		references: [enrollments.id]
	}),
	user: one(users, {
		fields: [studentAttendanceRecords.markedBy],
		references: [users.id]
	}),
	student: one(students, {
		fields: [studentAttendanceRecords.studentId],
		references: [students.id]
	}),
}));

export const attendanceRelations = relations(attendance, ({one, many}) => ({
	studentAttendanceRecords: many(studentAttendanceRecords),
	academicYear: one(academicYears, {
		fields: [attendance.academicYearId],
		references: [academicYears.id]
	}),
	branch: one(branches, {
		fields: [attendance.branchId],
		references: [branches.id]
	}),
}));

export const statisticsRelations = relations(statistics, ({one}) => ({
	branch: one(branches, {
		fields: [statistics.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [statistics.organizationId],
		references: [organizations.id]
	}),
}));

export const studentMedicalRecordsRelations = relations(studentMedicalRecords, ({one}) => ({
	student: one(students, {
		fields: [studentMedicalRecords.studentId],
		references: [students.id]
	}),
}));

export const studentBehavioralRecordsRelations = relations(studentBehavioralRecords, ({one}) => ({
	student: one(students, {
		fields: [studentBehavioralRecords.studentId],
		references: [students.id]
	}),
}));

export const studentDocumentsRelations = relations(studentDocuments, ({one}) => ({
	student: one(students, {
		fields: [studentDocuments.studentId],
		references: [students.id]
	}),
}));

export const studentExtracurricularActivitiesRelations = relations(studentExtracurricularActivities, ({one}) => ({
	student: one(students, {
		fields: [studentExtracurricularActivities.studentId],
		references: [students.id]
	}),
}));

export const staffProfessionalHistoryRelations = relations(staffProfessionalHistory, ({one}) => ({
	staff: one(staff, {
		fields: [staffProfessionalHistory.staffId],
		references: [staff.id]
	}),
}));

export const staffBenefitsRelations = relations(staffBenefits, ({one}) => ({
	staff: one(staff, {
		fields: [staffBenefits.staffId],
		references: [staff.id]
	}),
}));

export const staffPerformanceEvaluationsRelations = relations(staffPerformanceEvaluations, ({one}) => ({
	staff: one(staff, {
		fields: [staffPerformanceEvaluations.staffId],
		references: [staff.id]
	}),
}));

export const staffCredentialsRelations = relations(staffCredentials, ({one}) => ({
	staff: one(staff, {
		fields: [staffCredentials.staffId],
		references: [staff.id]
	}),
}));

export const assetsRelations = relations(assets, ({one}) => ({
	branch: one(branches, {
		fields: [assets.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [assets.organizationId],
		references: [organizations.id]
	}),
}));

export const noticeBoardRelations = relations(noticeBoard, ({one}) => ({
	branch: one(branches, {
		fields: [noticeBoard.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [noticeBoard.organizationId],
		references: [organizations.id]
	}),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	branch: one(branches, {
		fields: [userRoles.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [userRoles.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	}),
}));

export const periodsRelations = relations(periods, ({one, many}) => ({
	branch: one(branches, {
		fields: [periods.branchId],
		references: [branches.id]
	}),
	timetables: many(timetables),
}));

export const studentParentsRelations = relations(studentParents, ({one}) => ({
	user: one(users, {
		fields: [studentParents.createdBy],
		references: [users.id]
	}),
	parent: one(parents, {
		fields: [studentParents.parentId],
		references: [parents.id]
	}),
	student: one(students, {
		fields: [studentParents.studentId],
		references: [students.id]
	}),
}));

export const examScheduleRelations = relations(examSchedule, ({one}) => ({
	exam: one(exams, {
		fields: [examSchedule.examId],
		references: [exams.id]
	}),
	grade: one(grades, {
		fields: [examSchedule.gradeId],
		references: [grades.id]
	}),
	section: one(sections, {
		fields: [examSchedule.sectionId],
		references: [sections.id]
	}),
	subject: one(subjects, {
		fields: [examSchedule.subjectId],
		references: [subjects.id]
	}),
}));

export const marksRelations = relations(marks, ({one}) => ({
	enrollment: one(enrollments, {
		fields: [marks.enrollmentId],
		references: [enrollments.id]
	}),
	user: one(users, {
		fields: [marks.enteredBy],
		references: [users.id]
	}),
	exam: one(exams, {
		fields: [marks.examId],
		references: [exams.id]
	}),
	student: one(students, {
		fields: [marks.studentId],
		references: [students.id]
	}),
	subject: one(subjects, {
		fields: [marks.subjectId],
		references: [subjects.id]
	}),
}));

export const feeInvoicesRelations = relations(feeInvoices, ({one, many}) => ({
	branch: one(branches, {
		fields: [feeInvoices.branchId],
		references: [branches.id]
	}),
	user: one(users, {
		fields: [feeInvoices.createdBy],
		references: [users.id]
	}),
	enrollment: one(enrollments, {
		fields: [feeInvoices.enrollmentId],
		references: [enrollments.id]
	}),
	student: one(students, {
		fields: [feeInvoices.studentId],
		references: [students.id]
	}),
	feeInvoiceItems: many(feeInvoiceItems),
	feePayments: many(feePayments),
}));

export const feeInvoiceItemsRelations = relations(feeInvoiceItems, ({one}) => ({
	feeInvoice: one(feeInvoices, {
		fields: [feeInvoiceItems.feeInvoiceId],
		references: [feeInvoices.id]
	}),
	feeItem: one(feeItems, {
		fields: [feeInvoiceItems.feeItemId],
		references: [feeItems.id]
	}),
}));

export const feeItemsRelations = relations(feeItems, ({one, many}) => ({
	feeInvoiceItems: many(feeInvoiceItems),
	academicYear: one(academicYears, {
		fields: [feeItems.academicYearId],
		references: [academicYears.id]
	}),
	branch: one(branches, {
		fields: [feeItems.branchId],
		references: [branches.id]
	}),
	feeType: one(feeTypes, {
		fields: [feeItems.feeTypeId],
		references: [feeTypes.id]
	}),
	organization: one(organizations, {
		fields: [feeItems.organizationId],
		references: [organizations.id]
	}),
}));

export const feePaymentsRelations = relations(feePayments, ({one}) => ({
	feeInvoice: one(feeInvoices, {
		fields: [feePayments.feeInvoiceId],
		references: [feeInvoices.id]
	}),
	user: one(users, {
		fields: [feePayments.paidBy],
		references: [users.id]
	}),
}));

export const staffSalariesRelations = relations(staffSalaries, ({one, many}) => ({
	branch: one(branches, {
		fields: [staffSalaries.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [staffSalaries.organizationId],
		references: [organizations.id]
	}),
	monthlyPayslips: many(monthlyPayslips),
}));

export const monthlyPayslipsRelations = relations(monthlyPayslips, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [monthlyPayslips.approvedBy],
		references: [users.id],
		relationName: "monthlyPayslips_approvedBy_users_id"
	}),
	branch: one(branches, {
		fields: [monthlyPayslips.branchId],
		references: [branches.id]
	}),
	user_generatedBy: one(users, {
		fields: [monthlyPayslips.generatedBy],
		references: [users.id],
		relationName: "monthlyPayslips_generatedBy_users_id"
	}),
	organization: one(organizations, {
		fields: [monthlyPayslips.organizationId],
		references: [organizations.id]
	}),
	user_paidBy: one(users, {
		fields: [monthlyPayslips.paidBy],
		references: [users.id],
		relationName: "monthlyPayslips_paidBy_users_id"
	}),
	staffSalary: one(staffSalaries, {
		fields: [monthlyPayslips.staffSalaryId],
		references: [staffSalaries.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	branch: one(branches, {
		fields: [auditLogs.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [auditLogs.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	branch: one(branches, {
		fields: [notifications.branchId],
		references: [branches.id]
	}),
}));

export const filesRelations = relations(files, ({one}) => ({
	branch: one(branches, {
		fields: [files.branchId],
		references: [branches.id]
	}),
	user: one(users, {
		fields: [files.uploadedBy],
		references: [users.id]
	}),
}));

export const academicCalendarEventsRelations = relations(academicCalendarEvents, ({one}) => ({
	academicYear: one(academicYears, {
		fields: [academicCalendarEvents.academicYearId],
		references: [academicYears.id]
	}),
	branch: one(branches, {
		fields: [academicCalendarEvents.branchId],
		references: [branches.id]
	}),
}));

export const classTeachersRelations = relations(classTeachers, ({one}) => ({
	staff: one(staff, {
		fields: [classTeachers.staffId],
		references: [staff.id]
	}),
	grade: one(grades, {
		fields: [classTeachers.gradeId],
		references: [grades.id]
	}),
	section: one(sections, {
		fields: [classTeachers.sectionId],
		references: [sections.id]
	}),
}));

export const timetablesRelations = relations(timetables, ({one}) => ({
	staff: one(staff, {
		fields: [timetables.staffId],
		references: [staff.id]
	}),
	branch: one(branches, {
		fields: [timetables.branchId],
		references: [branches.id]
	}),
	grade: one(grades, {
		fields: [timetables.gradeId],
		references: [grades.id]
	}),
	period: one(periods, {
		fields: [timetables.periodId],
		references: [periods.id]
	}),
	section: one(sections, {
		fields: [timetables.sectionId],
		references: [sections.id]
	}),
	subject: one(subjects, {
		fields: [timetables.subjectId],
		references: [subjects.id]
	}),
}));

export const feeTypesRelations = relations(feeTypes, ({one, many}) => ({
	feeItems: many(feeItems),
	organization: one(organizations, {
		fields: [feeTypes.organizationId],
		references: [organizations.id]
	}),
}));