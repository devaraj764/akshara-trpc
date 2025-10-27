import { relations } from "drizzle-orm/relations";
import { branches, noticeBoard, organizations, addresses, classes, sections, staff, timetables, periods, subjects, tickets, users, enrollments, academicYears, students, personDetails, departments, userRoles, academicCalendarEvents, parents, studentMedicalRecords, studentBehavioralRecords, studentDocuments, studentExtracurricularActivities, assets, studentParents, subjectAssignments, staffAttendance, attendance, studentAttendanceRecords, exams, marks, feeTypes, feeInvoices, feeInvoiceItems, feeItems, feePayments, staffSalaries, monthlyPayslips, statistics, auditLogs, notifications, files, classTeachers, examSchedule } from "./schema";

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

export const branchesRelations = relations(branches, ({one, many}) => ({
	noticeBoards: many(noticeBoard),
	sections: many(sections),
	timetables: many(timetables),
	classes: many(classes),
	tickets: many(tickets),
	enrollments: many(enrollments),
	users: many(users),
	staff: many(staff),
	address: one(addresses, {
		fields: [branches.addressId],
		references: [addresses.id]
	}),
	organization: one(organizations, {
		fields: [branches.organizationId],
		references: [organizations.id]
	}),
	userRoles: many(userRoles),
	academicYears: many(academicYears),
	academicCalendarEvents: many(academicCalendarEvents),
	periods: many(periods),
	departments: many(departments),
	students: many(students),
	parents: many(parents),
	assets: many(assets),
	attendances: many(attendance),
	exams: many(exams),
	feeInvoices: many(feeInvoices),
	staffSalaries: many(staffSalaries),
	monthlyPayslips: many(monthlyPayslips),
	statistics: many(statistics),
	auditLogs: many(auditLogs),
	notifications: many(notifications),
	files: many(files),
	feeItems: many(feeItems),
}));

export const organizationsRelations = relations(organizations, ({one, many}) => ({
	noticeBoards: many(noticeBoard),
	address: one(addresses, {
		fields: [organizations.addressId],
		references: [addresses.id]
	}),
	sections: many(sections),
	classes: many(classes),
	tickets: many(tickets),
	users: many(users),
	staff: many(staff),
	branches: many(branches),
	userRoles: many(userRoles),
	academicYears: many(academicYears),
	subjects: many(subjects),
	departments: many(departments),
	students: many(students),
	parents: many(parents),
	assets: many(assets),
	feeTypes: many(feeTypes),
	staffSalaries: many(staffSalaries),
	monthlyPayslips: many(monthlyPayslips),
	statistics: many(statistics),
	auditLogs: many(auditLogs),
	feeItems: many(feeItems),
}));

export const addressesRelations = relations(addresses, ({many}) => ({
	organizations: many(organizations),
	staff: many(staff),
	branches: many(branches),
	students: many(students),
}));

export const sectionsRelations = relations(sections, ({one, many}) => ({
	class: one(classes, {
		fields: [sections.classId],
		references: [classes.id]
	}),
	organization: one(organizations, {
		fields: [sections.organizationId],
		references: [organizations.id]
	}),
	branch: one(branches, {
		fields: [sections.branchId],
		references: [branches.id]
	}),
	staff: one(staff, {
		fields: [sections.classTeacherId],
		references: [staff.id]
	}),
	timetables: many(timetables),
	enrollments: many(enrollments),
	subjectAssignments: many(subjectAssignments),
	classTeachers: many(classTeachers),
	examSchedules: many(examSchedule),
}));

export const classesRelations = relations(classes, ({one, many}) => ({
	sections: many(sections),
	timetables: many(timetables),
	organization: one(organizations, {
		fields: [classes.organizationId],
		references: [organizations.id]
	}),
	branch: one(branches, {
		fields: [classes.branchId],
		references: [branches.id]
	}),
	enrollments: many(enrollments),
	classTeachers: many(classTeachers),
	examSchedules: many(examSchedule),
}));

export const staffRelations = relations(staff, ({one, many}) => ({
	sections: many(sections),
	timetables: many(timetables),
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
	subjectAssignments: many(subjectAssignments),
	staffAttendances: many(staffAttendance),
	classTeachers: many(classTeachers),
}));

export const timetablesRelations = relations(timetables, ({one}) => ({
	class: one(classes, {
		fields: [timetables.classId],
		references: [classes.id]
	}),
	branch: one(branches, {
		fields: [timetables.branchId],
		references: [branches.id]
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

export const periodsRelations = relations(periods, ({one, many}) => ({
	timetables: many(timetables),
	branch: one(branches, {
		fields: [periods.branchId],
		references: [branches.id]
	}),
}));

export const subjectsRelations = relations(subjects, ({one, many}) => ({
	timetables: many(timetables),
	organization: one(organizations, {
		fields: [subjects.organizationId],
		references: [organizations.id]
	}),
	subjectAssignments: many(subjectAssignments),
	marks: many(marks),
	examSchedules: many(examSchedule),
}));

export const ticketsRelations = relations(tickets, ({one}) => ({
	organization: one(organizations, {
		fields: [tickets.organizationId],
		references: [organizations.id]
	}),
	branch: one(branches, {
		fields: [tickets.branchId],
		references: [branches.id]
	}),
	user_fromUserId: one(users, {
		fields: [tickets.fromUserId],
		references: [users.id],
		relationName: "tickets_fromUserId_users_id"
	}),
	user_assignedTo: one(users, {
		fields: [tickets.assignedTo],
		references: [users.id],
		relationName: "tickets_assignedTo_users_id"
	}),
	user_resolvedBy: one(users, {
		fields: [tickets.resolvedBy],
		references: [users.id],
		relationName: "tickets_resolvedBy_users_id"
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	tickets_fromUserId: many(tickets, {
		relationName: "tickets_fromUserId_users_id"
	}),
	tickets_assignedTo: many(tickets, {
		relationName: "tickets_assignedTo_users_id"
	}),
	tickets_resolvedBy: many(tickets, {
		relationName: "tickets_resolvedBy_users_id"
	}),
	branch: one(branches, {
		fields: [users.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [users.organizationId],
		references: [organizations.id]
	}),
	staff: many(staff),
	userRoles: many(userRoles),
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

export const enrollmentsRelations = relations(enrollments, ({one, many}) => ({
	class: one(classes, {
		fields: [enrollments.classId],
		references: [classes.id]
	}),
	academicYear: one(academicYears, {
		fields: [enrollments.academicYearId],
		references: [academicYears.id]
	}),
	branch: one(branches, {
		fields: [enrollments.branchId],
		references: [branches.id]
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

export const academicYearsRelations = relations(academicYears, ({one, many}) => ({
	enrollments: many(enrollments),
	branch: one(branches, {
		fields: [academicYears.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [academicYears.organizationId],
		references: [organizations.id]
	}),
	academicCalendarEvents: many(academicCalendarEvents),
	attendances: many(attendance),
	exams: many(exams),
}));

export const studentsRelations = relations(students, ({one, many}) => ({
	enrollments: many(enrollments),
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
	studentParents: many(studentParents),
	studentAttendanceRecords: many(studentAttendanceRecords),
	marks: many(marks),
	feeInvoices: many(feeInvoices),
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
	marks: many(marks),
	examSchedules: many(examSchedule),
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

export const classTeachersRelations = relations(classTeachers, ({one}) => ({
	class: one(classes, {
		fields: [classTeachers.classId],
		references: [classes.id]
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

export const examScheduleRelations = relations(examSchedule, ({one}) => ({
	class: one(classes, {
		fields: [examSchedule.classId],
		references: [classes.id]
	}),
	exam: one(exams, {
		fields: [examSchedule.examId],
		references: [exams.id]
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