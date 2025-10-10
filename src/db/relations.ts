import { relations } from "drizzle-orm/relations";
import { addresses, organizations, branches, users, userRoles, academicYears, academicCalendarEvents, grades, sections, staff, personDetails, departments, subjects, periods, timetables, students, parents, studentMedicalRecords, studentBehavioralRecords, studentDocuments, studentExtracurricularActivities, assets, noticeBoard, enrollments, studentParents, classTeachers, subjectAssignments, staffAttendance, attendance, studentAttendanceRecords, exams, examSchedule, marks, feeTypes, feeItems, feeInvoices, feeInvoiceItems, feePayments, staffSalaries, monthlyPayslips, statistics, auditLogs, notifications, files } from "./schema";

export const organizationsRelations = relations(organizations, ({one, many}) => ({
	address: one(addresses, {
		fields: [organizations.addressId],
		references: [addresses.id]
	}),
	branches: many(branches),
	users: many(users),
	userRoles: many(userRoles),
	academicYears: many(academicYears),
	grades: many(grades),
	sections: many(sections),
	staff: many(staff),
	subjects: many(subjects),
	departments: many(departments),
	students: many(students),
	parents: many(parents),
	assets: many(assets),
	noticeBoards: many(noticeBoard),
	feeTypes: many(feeTypes),
	feeItems: many(feeItems),
	staffSalaries: many(staffSalaries),
	monthlyPayslips: many(monthlyPayslips),
	statistics: many(statistics),
	auditLogs: many(auditLogs),
}));

export const addressesRelations = relations(addresses, ({many}) => ({
	organizations: many(organizations),
	branches: many(branches),
	staff: many(staff),
	students: many(students),
}));

export const branchesRelations = relations(branches, ({one, many}) => ({
	address: one(addresses, {
		fields: [branches.addressId],
		references: [addresses.id]
	}),
	organization: one(organizations, {
		fields: [branches.organizationId],
		references: [organizations.id]
	}),
	users: many(users),
	userRoles: many(userRoles),
	academicYears: many(academicYears),
	academicCalendarEvents: many(academicCalendarEvents),
	grades: many(grades),
	sections: many(sections),
	staff: many(staff),
	periods: many(periods),
	timetables: many(timetables),
	departments: many(departments),
	students: many(students),
	parents: many(parents),
	assets: many(assets),
	noticeBoards: many(noticeBoard),
	enrollments: many(enrollments),
	attendances: many(attendance),
	exams: many(exams),
	feeItems: many(feeItems),
	feeInvoices: many(feeInvoices),
	staffSalaries: many(staffSalaries),
	monthlyPayslips: many(monthlyPayslips),
	statistics: many(statistics),
	auditLogs: many(auditLogs),
	notifications: many(notifications),
	files: many(files),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	branch: one(branches, {
		fields: [users.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [users.organizationId],
		references: [organizations.id]
	}),
	userRoles: many(userRoles),
	staff: many(staff),
	students: many(students),
	parents: many(parents),
	studentParents: many(studentParents),
	studentAttendanceRecords: many(studentAttendanceRecords),
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

export const academicYearsRelations = relations(academicYears, ({one, many}) => ({
	branch: one(branches, {
		fields: [academicYears.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [academicYears.organizationId],
		references: [organizations.id]
	}),
	academicCalendarEvents: many(academicCalendarEvents),
	enrollments: many(enrollments),
	attendances: many(attendance),
	exams: many(exams),
	feeItems: many(feeItems),
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

export const gradesRelations = relations(grades, ({one, many}) => ({
	organization: one(organizations, {
		fields: [grades.organizationId],
		references: [organizations.id]
	}),
	branch: one(branches, {
		fields: [grades.branchId],
		references: [branches.id]
	}),
	sections: many(sections),
	timetables: many(timetables),
	enrollments: many(enrollments),
	classTeachers: many(classTeachers),
	examSchedules: many(examSchedule),
}));

export const sectionsRelations = relations(sections, ({one, many}) => ({
	organization: one(organizations, {
		fields: [sections.organizationId],
		references: [organizations.id]
	}),
	branch: one(branches, {
		fields: [sections.branchId],
		references: [branches.id]
	}),
	grade: one(grades, {
		fields: [sections.gradeId],
		references: [grades.id]
	}),
	staff: one(staff, {
		fields: [sections.classTeacherId],
		references: [staff.id]
	}),
	timetables: many(timetables),
	enrollments: many(enrollments),
	classTeachers: many(classTeachers),
	subjectAssignments: many(subjectAssignments),
	examSchedules: many(examSchedule),
}));

export const staffRelations = relations(staff, ({one, many}) => ({
	sections: many(sections),
	address: one(addresses, {
		fields: [staff.addressId],
		references: [addresses.id]
	}),
	personDetail: one(personDetails, {
		fields: [staff.personDetailId],
		references: [personDetails.id]
	}),
	branch: one(branches, {
		fields: [staff.branchId],
		references: [branches.id]
	}),
	department: one(departments, {
		fields: [staff.departmentId],
		references: [departments.id]
	}),
	organization: one(organizations, {
		fields: [staff.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [staff.userId],
		references: [users.id]
	}),
	timetables: many(timetables),
	classTeachers: many(classTeachers),
	subjectAssignments: many(subjectAssignments),
	staffAttendances: many(staffAttendance),
}));

export const personDetailsRelations = relations(personDetails, ({many}) => ({
	staff: many(staff),
	students: many(students),
	parents: many(parents),
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
	timetables: many(timetables),
	subjectAssignments: many(subjectAssignments),
	examSchedules: many(examSchedule),
	marks: many(marks),
}));

export const periodsRelations = relations(periods, ({one, many}) => ({
	branch: one(branches, {
		fields: [periods.branchId],
		references: [branches.id]
	}),
	timetables: many(timetables),
}));

export const timetablesRelations = relations(timetables, ({one}) => ({
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
	staff: one(staff, {
		fields: [timetables.staffId],
		references: [staff.id]
	}),
}));

export const studentsRelations = relations(students, ({one, many}) => ({
	address: one(addresses, {
		fields: [students.addressId],
		references: [addresses.id]
	}),
	personDetail: one(personDetails, {
		fields: [students.personDetailId],
		references: [personDetails.id]
	}),
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
	studentMedicalRecords: many(studentMedicalRecords),
	studentBehavioralRecords: many(studentBehavioralRecords),
	studentDocuments: many(studentDocuments),
	studentExtracurricularActivities: many(studentExtracurricularActivities),
	enrollments: many(enrollments),
	studentParents: many(studentParents),
	studentAttendanceRecords: many(studentAttendanceRecords),
	marks: many(marks),
	feeInvoices: many(feeInvoices),
}));

export const parentsRelations = relations(parents, ({one, many}) => ({
	personDetail: one(personDetails, {
		fields: [parents.personDetailId],
		references: [personDetails.id]
	}),
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

export const classTeachersRelations = relations(classTeachers, ({one}) => ({
	grade: one(grades, {
		fields: [classTeachers.gradeId],
		references: [grades.id]
	}),
	section: one(sections, {
		fields: [classTeachers.sectionId],
		references: [sections.id]
	}),
	staff: one(staff, {
		fields: [classTeachers.staffId],
		references: [staff.id]
	}),
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

export const attendanceRelations = relations(attendance, ({one, many}) => ({
	academicYear: one(academicYears, {
		fields: [attendance.academicYearId],
		references: [academicYears.id]
	}),
	branch: one(branches, {
		fields: [attendance.branchId],
		references: [branches.id]
	}),
	studentAttendanceRecords: many(studentAttendanceRecords),
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

export const feeTypesRelations = relations(feeTypes, ({one, many}) => ({
	organization: one(organizations, {
		fields: [feeTypes.organizationId],
		references: [organizations.id]
	}),
	feeItems: many(feeItems),
}));

export const feeItemsRelations = relations(feeItems, ({one, many}) => ({
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
	feeInvoiceItems: many(feeInvoiceItems),
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