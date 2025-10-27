import { pgTable, varchar, timestamp, text, integer, index, foreignKey, serial, boolean, json, uniqueIndex, jsonb, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const attendanceStatus = pgEnum("AttendanceStatus", ['PRESENT', 'ABSENT', 'LEAVE', 'HOLIDAY'])
export const feeStatus = pgEnum("FeeStatus", ['PENDING', 'PAID', 'PARTIAL'])
export const roleEnum = pgEnum("RoleEnum", ['SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'FRONT_DESK', 'TEACHER', 'PARENT', 'STUDENT', 'ACCOUNTANT', 'STAFF'])
export const shiftEnum = pgEnum("ShiftEnum", ['MORNING', 'AFTERNOON', 'EVENING', 'FULL_DAY'])
export const ticketPriority = pgEnum("TicketPriority", ['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
export const ticketStatus = pgEnum("TicketStatus", ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'])


export const prismaMigrations = pgTable("_prisma_migrations", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	checksum: varchar({ length: 64 }).notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text(),
	rolledBackAt: timestamp("rolled_back_at", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
});

export const noticeBoard = pgTable("notice_board", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id"),
	branchId: integer("branch_id"),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	noticeType: varchar("notice_type", { length: 64 }).notNull(),
	priorityLevel: varchar("priority_level", { length: 32 }).default('NORMAL').notNull(),
	targetAudience: text("target_audience").array().default([]),
	targetSections: integer("target_sections").array().default([]),
	isUrgent: boolean("is_urgent").default(false).notNull(),
	isPublished: boolean("is_published").default(false).notNull(),
	publishDate: timestamp("publish_date", { precision: 6, mode: 'string' }),
	expiryDate: timestamp("expiry_date", { precision: 6, mode: 'string' }),
	attachments: json(),
	authorId: integer("author_id"),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { precision: 6, mode: 'string' }),
	readCount: integer("read_count").default(0).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	targetClasses: integer("target_classes").array().default([]),
}, (table) => [
	index("idx_notice_board_branch").using("btree", table.branchId.asc().nullsLast().op("int4_ops")),
	index("idx_notice_board_priority").using("btree", table.priorityLevel.asc().nullsLast().op("text_ops")),
	index("idx_notice_board_publish_date").using("btree", table.publishDate.asc().nullsLast().op("timestamp_ops")),
	index("idx_notice_board_published").using("btree", table.isPublished.asc().nullsLast().op("bool_ops")),
	index("idx_notice_board_type").using("btree", table.noticeType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "notice_board_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "notice_board_organization_id_organizations_id_fk"
		}),
]);

export const organizations = pgTable("organizations", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	registrationNumber: varchar("registration_number", { length: 128 }),
	addressId: integer("address_id"),
	contactEmail: varchar("contact_email", { length: 255 }),
	contactPhone: varchar("contact_phone", { length: 32 }),
	status: varchar({ length: 32 }).default('ACTIVE').notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	meta: json(),
	enabledDepartments: integer("enabled_departments").array().default([]),
	enabledSubjects: integer("enabled_subjects").array().default([]),
	enabledFeetypes: integer("enabled_feetypes").array().default([]),
	enabledClasses: integer("enabled_classes").array().default([]),
}, (table) => [
	foreignKey({
			columns: [table.addressId],
			foreignColumns: [addresses.id],
			name: "organizations_address_id_addresses_id_fk"
		}),
]);

export const sections = pgTable("sections", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id").notNull(),
	branchId: integer("branch_id").notNull(),
	classTeacherId: integer("class_teacher_id"),
	name: varchar({ length: 32 }).notNull(),
	capacity: integer(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	classId: integer("class_id").notNull(),
}, (table) => [
	index("idx_sections_branch").using("btree", table.branchId.asc().nullsLast().op("int4_ops")),
	index("idx_sections_deleted").using("btree", table.isDeleted.asc().nullsLast().op("bool_ops")),
	uniqueIndex("uq_section_branch_class_name").using("btree", table.branchId.asc().nullsLast().op("text_ops"), table.classId.asc().nullsLast().op("int4_ops"), table.name.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "sections_class_id_classes_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "sections_organization_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "sections_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.classTeacherId],
			foreignColumns: [staff.id],
			name: "sections_class_teacher_id_staff_id_fk"
		}),
]);

export const timetables = pgTable("timetables", {
	id: serial().primaryKey().notNull(),
	branchId: integer("branch_id").notNull(),
	sectionId: integer("section_id").notNull(),
	dayOfWeek: integer("day_of_week").notNull(),
	periodId: integer("period_id").notNull(),
	subjectId: integer("subject_id").notNull(),
	staffId: integer("staff_id"),
	classId: integer("class_id").notNull(),
}, (table) => [
	uniqueIndex("uq_timetable_section_slot").using("btree", table.sectionId.asc().nullsLast().op("int4_ops"), table.dayOfWeek.asc().nullsLast().op("int4_ops"), table.periodId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_timetable_staff_slot").using("btree", table.staffId.asc().nullsLast().op("int4_ops"), table.dayOfWeek.asc().nullsLast().op("int4_ops"), table.periodId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "timetables_class_id_classes_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "timetables_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.periodId],
			foreignColumns: [periods.id],
			name: "timetables_period_id_periods_id_fk"
		}),
	foreignKey({
			columns: [table.sectionId],
			foreignColumns: [sections.id],
			name: "timetables_section_id_sections_id_fk"
		}),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [subjects.id],
			name: "timetables_subject_id_subjects_id_fk"
		}),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [staff.id],
			name: "timetables_staff_id_staff_id_fk"
		}),
]);

export const classes = pgTable("classes", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id"),
	branchId: integer("branch_id"),
	name: varchar({ length: 64 }).notNull(),
	displayName: varchar("display_name", { length: 128 }),
	order: integer(),
	isPrivate: boolean("is_private").default(false).notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_classes_deleted").using("btree", table.isDeleted.asc().nullsLast().op("bool_ops")),
	index("idx_classes_private").using("btree", table.isPrivate.asc().nullsLast().op("bool_ops")),
	uniqueIndex("uq_class_name_branch").using("btree", table.branchId.asc().nullsLast().op("int4_ops"), table.name.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "classes_organization_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "classes_branch_id_branches_id_fk"
		}),
]);

export const tickets = pgTable("tickets", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id").notNull(),
	branchId: integer("branch_id"),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	category: varchar({ length: 128 }).notNull(),
	status: ticketStatus().default('OPEN').notNull(),
	priority: ticketPriority().default('MEDIUM').notNull(),
	fromUserId: integer("from_user_id").notNull(),
	assignedTo: integer("assigned_to"),
	resolvedBy: integer("resolved_by"),
	resolutionNotes: text("resolution_notes"),
	attachments: json(),
	tags: text().array().default([]),
	resolvedAt: timestamp("resolved_at", { precision: 6, mode: 'string' }),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_tickets_assigned").using("btree", table.assignedTo.asc().nullsLast().op("int4_ops")),
	index("idx_tickets_branch").using("btree", table.branchId.asc().nullsLast().op("int4_ops")),
	index("idx_tickets_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_tickets_created").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_tickets_from_user").using("btree", table.fromUserId.asc().nullsLast().op("int4_ops")),
	index("idx_tickets_organization").using("btree", table.organizationId.asc().nullsLast().op("int4_ops")),
	index("idx_tickets_priority").using("btree", table.priority.asc().nullsLast().op("enum_ops")),
	index("idx_tickets_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "tickets_organization_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "tickets_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.fromUserId],
			foreignColumns: [users.id],
			name: "tickets_from_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "tickets_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.resolvedBy],
			foreignColumns: [users.id],
			name: "tickets_resolved_by_users_id_fk"
		}),
]);

export const enrollments = pgTable("enrollments", {
	id: serial().primaryKey().notNull(),
	studentId: integer("student_id").notNull(),
	branchId: integer("branch_id").notNull(),
	sectionId: integer("section_id"),
	academicYearId: integer("academic_year_id").notNull(),
	rollNumber: integer("roll_number"),
	status: varchar({ length: 64 }).default('ENROLLED').notNull(),
	enrolledAt: timestamp("enrolled_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	leftAt: timestamp("left_at", { precision: 6, mode: 'string' }),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	meta: json(),
	classId: integer("class_id").notNull(),
}, (table) => [
	index("idx_enrollments_branch_year").using("btree", table.branchId.asc().nullsLast().op("int4_ops"), table.academicYearId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_student_academic_year").using("btree", table.studentId.asc().nullsLast().op("int4_ops"), table.academicYearId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "enrollments_class_id_classes_id_fk"
		}),
	foreignKey({
			columns: [table.academicYearId],
			foreignColumns: [academicYears.id],
			name: "enrollments_academic_year_id_academic_years_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "enrollments_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.sectionId],
			foreignColumns: [sections.id],
			name: "enrollments_section_id_sections_id_fk"
		}),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "enrollments_student_id_students_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	passwordHash: text("password_hash").notNull(),
	phone: varchar({ length: 32 }),
	organizationId: integer("organization_id"),
	branchId: integer("branch_id"),
	displayName: varchar("display_name", { length: 255 }),
	avatarUrl: varchar("avatar_url", { length: 1024 }),
	isActive: boolean("is_active").default(true).notNull(),
	loginAttempts: integer("login_attempts").default(0).notNull(),
	lockedUntil: timestamp("locked_until", { precision: 6, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { precision: 6, mode: 'string' }),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	meta: json(),
	lastVerifiedAt: timestamp("last_verified_at", { precision: 6, mode: 'string' }),
}, (table) => [
	index("idx_users_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops"), table.isDeleted.asc().nullsLast().op("bool_ops")),
	index("idx_users_branch").using("btree", table.branchId.asc().nullsLast().op("int4_ops")),
	index("idx_users_org").using("btree", table.organizationId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("users_email_unique").using("btree", table.email.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "users_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "users_organization_id_organizations_id_fk"
		}),
]);

export const addresses = pgTable("addresses", {
	id: serial().primaryKey().notNull(),
	addressLine1: varchar("address_line_1", { length: 255 }).notNull(),
	addressLine2: varchar("address_line_2", { length: 255 }),
	pincode: varchar({ length: 10 }),
	cityVillage: varchar("city_village", { length: 128 }).notNull(),
	district: varchar({ length: 128 }).notNull(),
	state: varchar({ length: 128 }).notNull(),
	country: varchar({ length: 128 }).default('India').notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const staff = pgTable("staff", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	organizationId: integer("organization_id").notNull(),
	branchId: integer("branch_id").notNull(),
	departmentId: integer("department_id"),
	addressId: integer("address_id"),
	personDetailId: integer("person_detail_id"),
	employeeNumber: varchar("employee_number", { length: 128 }),
	employeeType: varchar("employee_type", { length: 32 }).default('STAFF').notNull(),
	position: varchar({ length: 255 }),
	hireDate: timestamp("hire_date", { precision: 6, mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	professionalHistory: json("professional_history"),
	meta: json(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	workingHours: json("working_hours"),
}, (table) => [
	uniqueIndex("uq_staff_employee_number").using("btree", table.branchId.asc().nullsLast().op("int4_ops"), table.employeeNumber.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.addressId],
			foreignColumns: [addresses.id],
			name: "staff_address_id_addresses_id_fk"
		}),
	foreignKey({
			columns: [table.personDetailId],
			foreignColumns: [personDetails.id],
			name: "staff_person_detail_id_person_details_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "staff_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "staff_department_id_departments_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "staff_organization_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "staff_user_id_users_id_fk"
		}),
]);

export const branches = pgTable("branches", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id").notNull(),
	addressId: integer("address_id"),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 64 }),
	contactPhone: varchar("contact_phone", { length: 32 }),
	timezone: varchar({ length: 64 }).default('Asia/Kolkata').notNull(),
	status: varchar({ length: 32 }).default('ACTIVE').notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	meta: json(),
}, (table) => [
	uniqueIndex("uq_branch_code_org").using("btree", table.organizationId.asc().nullsLast().op("int4_ops"), table.code.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_branch_name_org").using("btree", table.organizationId.asc().nullsLast().op("int4_ops"), table.name.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.addressId],
			foreignColumns: [addresses.id],
			name: "branches_address_id_addresses_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "branches_organization_id_organizations_id_fk"
		}),
]);

export const userRoles = pgTable("user_roles", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	role: roleEnum().notNull(),
	organizationId: integer("organization_id").notNull(),
	branchId: integer("branch_id"),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("uq_user_role_branch").using("btree", table.userId.asc().nullsLast().op("enum_ops"), table.role.asc().nullsLast().op("int4_ops"), table.branchId.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "user_roles_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "user_roles_organization_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_users_id_fk"
		}),
]);

export const academicYears = pgTable("academic_years", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id").notNull(),
	branchId: integer("branch_id"),
	name: varchar({ length: 64 }).notNull(),
	startDate: timestamp("start_date", { precision: 6, mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { precision: 6, mode: 'string' }).notNull(),
	isCurrent: boolean("is_current").default(false).notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	meta: json(),
}, (table) => [
	uniqueIndex("uq_current_academic_year").using("btree", table.branchId.asc().nullsLast().op("int4_ops"), table.isCurrent.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "academic_years_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "academic_years_organization_id_organizations_id_fk"
		}),
]);

export const academicCalendarEvents = pgTable("academic_calendar_events", {
	id: serial().primaryKey().notNull(),
	academicYearId: integer("academic_year_id").notNull(),
	branchId: integer("branch_id"),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	startDate: timestamp("start_date", { precision: 6, mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { precision: 6, mode: 'string' }),
	isHoliday: boolean("is_holiday").default(false).notNull(),
	isFullDay: boolean("is_full_day").default(true).notNull(),
	recurringRule: varchar("recurring_rule", { length: 255 }),
	eventType: varchar("event_type", { length: 32 }).default('ACADEMIC').notNull(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.academicYearId],
			foreignColumns: [academicYears.id],
			name: "academic_calendar_events_academic_year_id_academic_years_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "academic_calendar_events_branch_id_branches_id_fk"
		}),
]);

export const subjects = pgTable("subjects", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id"),
	code: varchar({ length: 64 }),
	name: varchar({ length: 255 }).notNull(),
	shortName: varchar("short_name", { length: 64 }),
	isPrivate: boolean("is_private").default(false).notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_subjects_active").using("btree", table.isDeleted.asc().nullsLast().op("bool_ops")),
	index("idx_subjects_private").using("btree", table.isPrivate.asc().nullsLast().op("bool_ops")),
	uniqueIndex("uq_subject_code_organization").using("btree", table.organizationId.asc().nullsLast().op("int4_ops"), table.code.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_subject_name_organization").using("btree", table.organizationId.asc().nullsLast().op("int4_ops"), table.name.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "subjects_organization_id_organizations_id_fk"
		}),
]);

export const periods = pgTable("periods", {
	id: serial().primaryKey().notNull(),
	branchId: integer("branch_id").notNull(),
	name: varchar({ length: 128 }),
	startTime: varchar("start_time", { length: 16 }),
	endTime: varchar("end_time", { length: 16 }),
	isBreak: boolean("is_break").default(false).notNull(),
	order: integer(),
}, (table) => [
	uniqueIndex("uq_period_order_branch").using("btree", table.branchId.asc().nullsLast().op("int4_ops"), table.order.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_period_time_branch").using("btree", table.branchId.asc().nullsLast().op("text_ops"), table.startTime.asc().nullsLast().op("int4_ops"), table.endTime.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "periods_branch_id_branches_id_fk"
		}),
]);

export const departments = pgTable("departments", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id"),
	branchId: integer("branch_id"),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 64 }),
	description: text(),
	isPrivate: boolean("is_private").default(false).notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_departments_deleted").using("btree", table.isDeleted.asc().nullsLast().op("bool_ops")),
	index("idx_departments_private").using("btree", table.isPrivate.asc().nullsLast().op("bool_ops")),
	uniqueIndex("uq_department_code_org").using("btree", table.organizationId.asc().nullsLast().op("int4_ops"), table.code.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_department_name_branch").using("btree", table.branchId.asc().nullsLast().op("int4_ops"), table.name.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "departments_organization_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "departments_branch_id_branches_id_fk"
		}),
]);

export const students = pgTable("students", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id").notNull(),
	branchId: integer("branch_id").notNull(),
	userId: integer("user_id"),
	addressId: integer("address_id"),
	personDetailId: integer("person_detail_id"),
	admissionNumber: varchar("admission_number", { length: 128 }),
	deletedAt: timestamp("deleted_at", { precision: 6, mode: 'string' }),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	meta: json(),
}, (table) => [
	index("idx_students_branch_active").using("btree", table.branchId.asc().nullsLast().op("int4_ops"), table.isDeleted.asc().nullsLast().op("bool_ops")),
	uniqueIndex("uq_student_admission_branch").using("btree", table.admissionNumber.asc().nullsLast().op("int4_ops"), table.branchId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.addressId],
			foreignColumns: [addresses.id],
			name: "students_address_id_addresses_id_fk"
		}),
	foreignKey({
			columns: [table.personDetailId],
			foreignColumns: [personDetails.id],
			name: "students_person_detail_id_person_details_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "students_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "students_organization_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "students_user_id_users_id_fk"
		}),
]);

export const personDetails = pgTable("person_details", {
	id: serial().primaryKey().notNull(),
	firstName: varchar("first_name", { length: 255 }).notNull(),
	lastName: varchar("last_name", { length: 255 }),
	dob: timestamp({ precision: 6, mode: 'string' }),
	gender: varchar({ length: 32 }),
	phone: varchar({ length: 32 }),
	email: varchar({ length: 255 }),
	photoUrl: varchar("photo_url", { length: 1024 }),
	profileUrl: varchar("profile_url", { length: 1024 }),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const parents = pgTable("parents", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	organizationId: integer("organization_id").notNull(),
	branchId: integer("branch_id").notNull(),
	personDetailId: integer("person_detail_id"),
	occupation: varchar({ length: 255 }),
	companyName: varchar("company_name", { length: 255 }),
	annualIncome: integer("annual_income"),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.personDetailId],
			foreignColumns: [personDetails.id],
			name: "parents_person_detail_id_person_details_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "parents_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "parents_organization_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "parents_user_id_users_id_fk"
		}),
]);

export const studentMedicalRecords = pgTable("student_medical_records", {
	id: serial().primaryKey().notNull(),
	studentId: integer("student_id").notNull(),
	allergies: text(),
	medications: text(),
	medicalConditions: text("medical_conditions"),
	specialNeeds: text("special_needs"),
	vaccinationRecords: json("vaccination_records"),
	emergencyMedicalContact: json("emergency_medical_contact"),
	bloodType: varchar("blood_type", { length: 8 }),
	heightCm: integer("height_cm"),
	weightKg: integer("weight_kg"),
	medicalNotes: text("medical_notes"),
	lastUpdated: timestamp("last_updated", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedBy: integer("updated_by"),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("uq_student_medical_record").using("btree", table.studentId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "student_medical_records_student_id_students_id_fk"
		}),
]);

export const studentBehavioralRecords = pgTable("student_behavioral_records", {
	id: serial().primaryKey().notNull(),
	studentId: integer("student_id").notNull(),
	incidentDate: timestamp("incident_date", { precision: 6, mode: 'string' }).notNull(),
	incidentType: varchar("incident_type", { length: 128 }).notNull(),
	description: text().notNull(),
	actionTaken: text("action_taken"),
	severityLevel: varchar("severity_level", { length: 32 }),
	reportedBy: integer("reported_by"),
	followUpNotes: text("follow_up_notes"),
	parentNotified: boolean("parent_notified").default(false).notNull(),
	resolved: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_behavioral_records_date").using("btree", table.incidentDate.asc().nullsLast().op("timestamp_ops")),
	index("idx_behavioral_records_student").using("btree", table.studentId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "student_behavioral_records_student_id_students_id_fk"
		}),
]);

export const studentDocuments = pgTable("student_documents", {
	id: serial().primaryKey().notNull(),
	studentId: integer("student_id").notNull(),
	documentType: varchar("document_type", { length: 128 }).notNull(),
	documentName: varchar("document_name", { length: 255 }).notNull(),
	fileUrl: varchar("file_url", { length: 2048 }).notNull(),
	fileSize: integer("file_size"),
	mimeType: varchar("mime_type", { length: 128 }),
	expiryDate: timestamp("expiry_date", { precision: 6, mode: 'string' }),
	isVerified: boolean("is_verified").default(false).notNull(),
	verifiedBy: integer("verified_by"),
	verifiedAt: timestamp("verified_at", { precision: 6, mode: 'string' }),
	uploadedBy: integer("uploaded_by"),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_student_documents_student").using("btree", table.studentId.asc().nullsLast().op("int4_ops")),
	index("idx_student_documents_type").using("btree", table.documentType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "student_documents_student_id_students_id_fk"
		}),
]);

export const studentExtracurricularActivities = pgTable("student_extracurricular_activities", {
	id: serial().primaryKey().notNull(),
	studentId: integer("student_id").notNull(),
	activityType: varchar("activity_type", { length: 128 }).notNull(),
	activityName: varchar("activity_name", { length: 255 }).notNull(),
	description: text(),
	positionRole: varchar("position_role", { length: 128 }),
	startDate: timestamp("start_date", { precision: 6, mode: 'string' }),
	endDate: timestamp("end_date", { precision: 6, mode: 'string' }),
	achievements: text(),
	certificates: json(),
	participationLevel: varchar("participation_level", { length: 64 }),
	instructorNotes: text("instructor_notes"),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_extracurricular_student").using("btree", table.studentId.asc().nullsLast().op("int4_ops")),
	index("idx_extracurricular_type").using("btree", table.activityType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "student_extracurricular_activities_student_id_students_id_fk"
		}),
]);

export const assets = pgTable("assets", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id"),
	branchId: integer("branch_id"),
	assetCategory: varchar("asset_category", { length: 128 }).notNull(),
	assetName: varchar("asset_name", { length: 255 }).notNull(),
	assetCode: varchar("asset_code", { length: 64 }),
	description: text(),
	brand: varchar({ length: 128 }),
	model: varchar({ length: 128 }),
	serialNumber: varchar("serial_number", { length: 128 }),
	purchaseDate: timestamp("purchase_date", { precision: 6, mode: 'string' }),
	purchaseCost: integer("purchase_cost"),
	currentValue: integer("current_value"),
	location: varchar({ length: 255 }),
	assignedTo: integer("assigned_to"),
	assignedToType: varchar("assigned_to_type", { length: 32 }),
	conditionStatus: varchar("condition_status", { length: 32 }).default('GOOD').notNull(),
	maintenanceSchedule: varchar("maintenance_schedule", { length: 255 }),
	lastMaintenance: timestamp("last_maintenance", { precision: 6, mode: 'string' }),
	nextMaintenance: timestamp("next_maintenance", { precision: 6, mode: 'string' }),
	warrantyExpiry: timestamp("warranty_expiry", { precision: 6, mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_assets_assigned").using("btree", table.assignedTo.asc().nullsLast().op("int4_ops")),
	index("idx_assets_category").using("btree", table.assetCategory.asc().nullsLast().op("text_ops")),
	index("idx_assets_condition").using("btree", table.conditionStatus.asc().nullsLast().op("text_ops")),
	uniqueIndex("uq_asset_code_branch").using("btree", table.branchId.asc().nullsLast().op("int4_ops"), table.assetCode.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "assets_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "assets_organization_id_organizations_id_fk"
		}),
]);

export const studentParents = pgTable("student_parents", {
	id: serial().primaryKey().notNull(),
	studentId: integer("student_id").notNull(),
	parentId: integer("parent_id").notNull(),
	relationship: varchar({ length: 64 }),
	isPrimary: boolean("is_primary").default(false).notNull(),
	canViewReports: boolean("can_view_reports").default(true).notNull(),
	canViewFees: boolean("can_view_fees").default(true).notNull(),
	contactPriority: integer("contact_priority"),
	startDate: timestamp("start_date", { precision: 6, mode: 'string' }),
	endDate: timestamp("end_date", { precision: 6, mode: 'string' }),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("uq_student_parent").using("btree", table.studentId.asc().nullsLast().op("int4_ops"), table.parentId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "student_parents_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [parents.id],
			name: "student_parents_parent_id_parents_id_fk"
		}),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "student_parents_student_id_students_id_fk"
		}),
]);

export const subjectAssignments = pgTable("subject_assignments", {
	id: serial().primaryKey().notNull(),
	staffId: integer("staff_id").notNull(),
	subjectId: integer("subject_id").notNull(),
	sectionId: integer("section_id").notNull(),
	assignedAt: timestamp("assigned_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_subject_assignments_section").using("btree", table.sectionId.asc().nullsLast().op("int4_ops")),
	index("idx_subject_assignments_staff").using("btree", table.staffId.asc().nullsLast().op("int4_ops")),
	index("idx_subject_assignments_subject").using("btree", table.subjectId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_subject_assignment").using("btree", table.staffId.asc().nullsLast().op("int4_ops"), table.subjectId.asc().nullsLast().op("int4_ops"), table.sectionId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [staff.id],
			name: "subject_assignments_staff_id_staff_id_fk"
		}),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [subjects.id],
			name: "subject_assignments_subject_id_subjects_id_fk"
		}),
	foreignKey({
			columns: [table.sectionId],
			foreignColumns: [sections.id],
			name: "subject_assignments_section_id_sections_id_fk"
		}),
]);

export const staffAttendance = pgTable("staff_attendance", {
	id: serial().primaryKey().notNull(),
	staffId: integer("staff_id").notNull(),
	date: timestamp({ precision: 6, mode: 'string' }).notNull(),
	status: attendanceStatus().default('PRESENT').notNull(),
	checkInTime: timestamp("check_in_time", { precision: 6, mode: 'string' }),
	checkOutTime: timestamp("check_out_time", { precision: 6, mode: 'string' }),
	workingHours: integer("working_hours"),
	overtimeHours: integer("overtime_hours").default(0).notNull(),
	breakDuration: integer("break_duration"),
	note: text(),
	markedBy: integer("marked_by"),
	markedAt: timestamp("marked_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_staff_attendance_date").using("btree", table.date.asc().nullsLast().op("timestamp_ops")),
	index("idx_staff_attendance_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	uniqueIndex("uq_staff_attendance_staff_date").using("btree", table.staffId.asc().nullsLast().op("int4_ops"), table.date.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [staff.id],
			name: "staff_attendance_staff_id_staff_id_fk"
		}),
]);

export const attendance = pgTable("attendance", {
	id: serial().primaryKey().notNull(),
	branchId: integer("branch_id").notNull(),
	date: timestamp({ precision: 6, mode: 'string' }).notNull(),
	shift: shiftEnum().default('FULL_DAY').notNull(),
	academicYearId: integer("academic_year_id").notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("uq_attendance_branch_date_shift").using("btree", table.branchId.asc().nullsLast().op("int4_ops"), table.date.asc().nullsLast().op("int4_ops"), table.shift.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.academicYearId],
			foreignColumns: [academicYears.id],
			name: "attendance_academic_year_id_academic_years_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "attendance_branch_id_branches_id_fk"
		}),
]);

export const studentAttendanceRecords = pgTable("student_attendance_records", {
	id: serial().primaryKey().notNull(),
	attendanceId: integer("attendance_id").notNull(),
	studentId: integer("student_id").notNull(),
	enrollmentId: integer("enrollment_id").notNull(),
	status: attendanceStatus().default('PRESENT').notNull(),
	markedBy: integer("marked_by").notNull(),
	markedAt: timestamp("marked_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	note: text(),
}, (table) => [
	index("idx_student_attendance_records_enrollment").using("btree", table.enrollmentId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_student_attendance_records_attendance_student").using("btree", table.attendanceId.asc().nullsLast().op("int4_ops"), table.studentId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.attendanceId],
			foreignColumns: [attendance.id],
			name: "student_attendance_records_attendance_id_attendance_id_fk"
		}),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollments.id],
			name: "student_attendance_records_enrollment_id_enrollments_id_fk"
		}),
	foreignKey({
			columns: [table.markedBy],
			foreignColumns: [users.id],
			name: "student_attendance_records_marked_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "student_attendance_records_student_id_students_id_fk"
		}),
]);

export const exams = pgTable("exams", {
	id: serial().primaryKey().notNull(),
	branchId: integer("branch_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	academicYearId: integer("academic_year_id").notNull(),
	examType: varchar("exam_type", { length: 64 }),
	startDate: timestamp("start_date", { precision: 6, mode: 'string' }),
	endDate: timestamp("end_date", { precision: 6, mode: 'string' }),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_exams_branch_year").using("btree", table.branchId.asc().nullsLast().op("int4_ops"), table.academicYearId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.academicYearId],
			foreignColumns: [academicYears.id],
			name: "exams_academic_year_id_academic_years_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "exams_branch_id_branches_id_fk"
		}),
]);

export const marks = pgTable("marks", {
	id: serial().primaryKey().notNull(),
	examId: integer("exam_id").notNull(),
	studentId: integer("student_id").notNull(),
	enrollmentId: integer("enrollment_id").notNull(),
	subjectId: integer("subject_id").notNull(),
	marksObtained: integer("marks_obtained"),
	maxMarks: integer("max_marks"),
	remarks: text(),
	enteredBy: integer("entered_by"),
	enteredAt: timestamp("entered_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_marks_enrollment").using("btree", table.enrollmentId.asc().nullsLast().op("int4_ops")),
	index("idx_marks_exam").using("btree", table.examId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_marks_exam_student_subject").using("btree", table.examId.asc().nullsLast().op("int4_ops"), table.studentId.asc().nullsLast().op("int4_ops"), table.subjectId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollments.id],
			name: "marks_enrollment_id_enrollments_id_fk"
		}),
	foreignKey({
			columns: [table.enteredBy],
			foreignColumns: [users.id],
			name: "marks_entered_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.examId],
			foreignColumns: [exams.id],
			name: "marks_exam_id_exams_id_fk"
		}),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "marks_student_id_students_id_fk"
		}),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [subjects.id],
			name: "marks_subject_id_subjects_id_fk"
		}),
]);

export const feeTypes = pgTable("fee_types", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id"),
	code: varchar({ length: 64 }),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	isPrivate: boolean("is_private").default(false).notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_fee_types_deleted").using("btree", table.isDeleted.asc().nullsLast().op("bool_ops")),
	index("idx_fee_types_private").using("btree", table.isPrivate.asc().nullsLast().op("bool_ops")),
	uniqueIndex("uq_fee_type_code_organization").using("btree", table.organizationId.asc().nullsLast().op("int4_ops"), table.code.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_fee_type_name_organization").using("btree", table.organizationId.asc().nullsLast().op("int4_ops"), table.name.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "fee_types_organization_id_organizations_id_fk"
		}),
]);

export const feeInvoices = pgTable("fee_invoices", {
	id: serial().primaryKey().notNull(),
	branchId: integer("branch_id").notNull(),
	studentId: integer("student_id").notNull(),
	enrollmentId: integer("enrollment_id").notNull(),
	invoiceNumber: varchar("invoice_number", { length: 128 }).notNull(),
	totalAmountPaise: integer("total_amount_paise").notNull(),
	discount: integer().default(0).notNull(),
	tax: jsonb(),
	status: feeStatus().default('PENDING').notNull(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("uq_fee_invoice_number_branch").using("btree", table.branchId.asc().nullsLast().op("int4_ops"), table.invoiceNumber.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "fee_invoices_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "fee_invoices_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [enrollments.id],
			name: "fee_invoices_enrollment_id_enrollments_id_fk"
		}),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "fee_invoices_student_id_students_id_fk"
		}),
]);

export const feeInvoiceItems = pgTable("fee_invoice_items", {
	id: serial().primaryKey().notNull(),
	feeInvoiceId: integer("fee_invoice_id").notNull(),
	feeItemId: integer("fee_item_id"),
	description: varchar({ length: 255 }),
	amountPaise: integer("amount_paise").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.feeInvoiceId],
			foreignColumns: [feeInvoices.id],
			name: "fee_invoice_items_fee_invoice_id_fee_invoices_id_fk"
		}),
	foreignKey({
			columns: [table.feeItemId],
			foreignColumns: [feeItems.id],
			name: "fee_invoice_items_fee_item_id_fee_items_id_fk"
		}),
]);

export const feePayments = pgTable("fee_payments", {
	id: serial().primaryKey().notNull(),
	feeInvoiceId: integer("fee_invoice_id").notNull(),
	paymentMode: varchar("payment_mode", { length: 64 }).notNull(),
	amountPaise: integer("amount_paise").notNull(),
	transactionRef: varchar("transaction_ref", { length: 255 }),
	paidBy: integer("paid_by"),
	paidAt: timestamp("paid_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.feeInvoiceId],
			foreignColumns: [feeInvoices.id],
			name: "fee_payments_fee_invoice_id_fee_invoices_id_fk"
		}),
	foreignKey({
			columns: [table.paidBy],
			foreignColumns: [users.id],
			name: "fee_payments_paid_by_users_id_fk"
		}),
]);

export const staffSalaries = pgTable("staff_salaries", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id").notNull(),
	branchId: integer("branch_id").notNull(),
	employeeType: varchar("employee_type", { length: 32 }).notNull(),
	employeeId: integer("employee_id").notNull(),
	basicSalary: integer("basic_salary").notNull(),
	allowances: json(),
	deductions: json(),
	effectiveFrom: timestamp("effective_from", { precision: 6, mode: 'string' }).notNull(),
	effectiveTo: timestamp("effective_to", { precision: 6, mode: 'string' }),
	isCurrent: boolean("is_current").default(true).notNull(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("uq_staff_salary_employee_branch_org").using("btree", table.employeeId.asc().nullsLast().op("int4_ops"), table.branchId.asc().nullsLast().op("int4_ops"), table.organizationId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "staff_salaries_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "staff_salaries_organization_id_organizations_id_fk"
		}),
]);

export const monthlyPayslips = pgTable("monthly_payslips", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id").notNull(),
	branchId: integer("branch_id").notNull(),
	employeeType: varchar("employee_type", { length: 32 }).notNull(),
	employeeId: integer("employee_id").notNull(),
	staffSalaryId: integer("staff_salary_id").notNull(),
	month: integer().notNull(),
	status: integer().default(0).notNull(),
	year: integer().notNull(),
	payPeriodStart: timestamp("pay_period_start", { precision: 6, mode: 'string' }).notNull(),
	payPeriodEnd: timestamp("pay_period_end", { precision: 6, mode: 'string' }).notNull(),
	basicSalary: integer("basic_salary").notNull(),
	allowances: json(),
	deductions: json(),
	grossSalary: integer("gross_salary").notNull(),
	totalDeductions: integer("total_deductions").notNull(),
	netSalary: integer("net_salary").notNull(),
	paymentStatus: varchar("payment_status", { length: 32 }).default('PENDING').notNull(),
	paymentDate: timestamp("payment_date", { precision: 6, mode: 'string' }),
	paymentMethod: varchar("payment_method", { length: 64 }),
	paymentReference: varchar("payment_reference", { length: 128 }),
	workingDays: integer("working_days").notNull(),
	presentDays: integer("present_days").notNull(),
	leaveDays: integer("leave_days").default(0).notNull(),
	absentDays: integer("absent_days").default(0).notNull(),
	overtimeHours: integer("overtime_hours").default(0).notNull(),
	overtimeRate: integer("overtime_rate").default(0).notNull(),
	overtimeAmount: integer("overtime_amount").default(0).notNull(),
	bonus: integer().default(0).notNull(),
	advanceDeduction: integer("advance_deduction").default(0).notNull(),
	notes: text(),
	generatedBy: integer("generated_by").notNull(),
	approvedBy: integer("approved_by"),
	paidBy: integer("paid_by"),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_payslips_branch_month").using("btree", table.branchId.asc().nullsLast().op("int4_ops"), table.year.asc().nullsLast().op("int4_ops"), table.month.asc().nullsLast().op("int4_ops")),
	index("idx_payslips_payment_status").using("btree", table.paymentStatus.asc().nullsLast().op("text_ops")),
	uniqueIndex("uq_payslip_employee_month").using("btree", table.employeeType.asc().nullsLast().op("text_ops"), table.employeeId.asc().nullsLast().op("int4_ops"), table.month.asc().nullsLast().op("int4_ops"), table.year.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "monthly_payslips_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "monthly_payslips_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.generatedBy],
			foreignColumns: [users.id],
			name: "monthly_payslips_generated_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "monthly_payslips_organization_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.paidBy],
			foreignColumns: [users.id],
			name: "monthly_payslips_paid_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.staffSalaryId],
			foreignColumns: [staffSalaries.id],
			name: "monthly_payslips_staff_salary_id_staff_salaries_id_fk"
		}),
]);

export const statistics = pgTable("statistics", {
	id: serial().primaryKey().notNull(),
	branchId: integer("branch_id"),
	organizationId: integer("organization_id"),
	statType: varchar("stat_type", { length: 128 }).notNull(),
	meta: json(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_statistics_branch").using("btree", table.branchId.asc().nullsLast().op("int4_ops")),
	index("idx_statistics_created").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_statistics_org").using("btree", table.organizationId.asc().nullsLast().op("int4_ops")),
	index("idx_statistics_type").using("btree", table.statType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "statistics_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "statistics_organization_id_organizations_id_fk"
		}),
]);

export const auditLogs = pgTable("audit_logs", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id"),
	branchId: integer("branch_id"),
	userId: integer("user_id"),
	action: varchar({ length: 255 }).notNull(),
	resource: varchar({ length: 255 }),
	resourceId: integer("resource_id"),
	before: json(),
	after: json(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "audit_logs_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "audit_logs_organization_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_logs_user_id_users_id_fk"
		}),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	branchId: integer("branch_id"),
	title: varchar({ length: 255 }),
	message: text(),
	type: varchar({ length: 64 }),
	payload: json(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "notifications_branch_id_branches_id_fk"
		}),
]);

export const files = pgTable("files", {
	id: serial().primaryKey().notNull(),
	branchId: integer("branch_id"),
	uploadedBy: integer("uploaded_by"),
	url: varchar({ length: 2048 }).notNull(),
	mimeType: varchar("mime_type", { length: 128 }),
	sizeBytes: integer("size_bytes"),
	meta: json(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "files_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "files_uploaded_by_users_id_fk"
		}),
]);

export const classTeachers = pgTable("class_teachers", {
	id: serial().primaryKey().notNull(),
	staffId: integer("staff_id").notNull(),
	sectionId: integer("section_id").notNull(),
	academicYear: varchar("academic_year", { length: 32 }).notNull(),
	classId: integer("class_id").notNull(),
}, (table) => [
	uniqueIndex("uq_class_teacher_section_year").using("btree", table.sectionId.asc().nullsLast().op("int4_ops"), table.academicYear.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "class_teachers_class_id_classes_id_fk"
		}),
	foreignKey({
			columns: [table.sectionId],
			foreignColumns: [sections.id],
			name: "class_teachers_section_id_sections_id_fk"
		}),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [staff.id],
			name: "class_teachers_staff_id_staff_id_fk"
		}),
]);

export const examSchedule = pgTable("exam_schedule", {
	id: serial().primaryKey().notNull(),
	examId: integer("exam_id").notNull(),
	sectionId: integer("section_id"),
	subjectId: integer("subject_id").notNull(),
	date: timestamp({ precision: 6, mode: 'string' }).notNull(),
	startTime: varchar("start_time", { length: 16 }),
	endTime: varchar("end_time", { length: 16 }),
	classId: integer("class_id").notNull(),
}, (table) => [
	index("idx_exam_schedule_date").using("btree", table.date.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("uq_exam_schedule").using("btree", table.examId.asc().nullsLast().op("int4_ops"), table.classId.asc().nullsLast().op("int4_ops"), table.sectionId.asc().nullsLast().op("int4_ops"), table.subjectId.asc().nullsLast().op("int4_ops"), table.date.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "exam_schedule_class_id_classes_id_fk"
		}),
	foreignKey({
			columns: [table.examId],
			foreignColumns: [exams.id],
			name: "exam_schedule_exam_id_exams_id_fk"
		}),
	foreignKey({
			columns: [table.sectionId],
			foreignColumns: [sections.id],
			name: "exam_schedule_section_id_sections_id_fk"
		}),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [subjects.id],
			name: "exam_schedule_subject_id_subjects_id_fk"
		}),
]);

export const feeItems = pgTable("fee_items", {
	id: serial().primaryKey().notNull(),
	organizationId: integer("organization_id").notNull(),
	branchId: integer("branch_id"),
	feeTypeId: integer("fee_type_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	amountPaise: integer("amount_paise").notNull(),
	isMandatory: boolean("is_mandatory").default(true).notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	enabledClasses: integer("enabled_classes").array().default([]),
	updatedAt: timestamp("updated_at", { precision: 6, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_fee_items_branch").using("btree", table.branchId.asc().nullsLast().op("int4_ops")),
	index("idx_fee_items_deleted").using("btree", table.isDeleted.asc().nullsLast().op("bool_ops")),
	index("idx_fee_items_type").using("btree", table.feeTypeId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uq_fee_item_org_branch_type_name").using("btree", table.organizationId.asc().nullsLast().op("int4_ops"), table.branchId.asc().nullsLast().op("int4_ops"), table.feeTypeId.asc().nullsLast().op("int4_ops"), table.name.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "fee_items_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.feeTypeId],
			foreignColumns: [feeTypes.id],
			name: "fee_items_fee_type_id_fee_types_id_fk"
		}),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "fee_items_organization_id_organizations_id_fk"
		}),
]);
