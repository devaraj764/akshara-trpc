-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."AttendanceStatus" AS ENUM('PRESENT', 'ABSENT', 'LEAVE', 'HOLIDAY');--> statement-breakpoint
CREATE TYPE "public"."FeeStatus" AS ENUM('PENDING', 'PAID', 'PARTIAL');--> statement-breakpoint
CREATE TYPE "public"."RoleEnum" AS ENUM('SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'TEACHER', 'PARENT', 'STUDENT', 'ACCOUNTANT', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."ShiftEnum" AS ENUM('MORNING', 'AFTERNOON', 'EVENING', 'FULL_DAY');--> statement-breakpoint
CREATE TABLE "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"registration_number" varchar(128),
	"address" text,
	"contact_email" varchar(255),
	"contact_phone" varchar(32),
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"settings" json
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(64),
	"address" text,
	"contact_phone" varchar(32),
	"timezone" varchar(64) DEFAULT 'Asia/Kolkata' NOT NULL,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"settings" json
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"phone" varchar(32),
	"organization_id" integer,
	"branch_id" integer,
	"display_name" varchar(255),
	"avatar_url" varchar(1024),
	"is_active" boolean DEFAULT true NOT NULL,
	"login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp(6),
	"deleted_at" timestamp(6),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"meta" json
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" "RoleEnum" NOT NULL,
	"organization_id" integer NOT NULL,
	"branch_id" integer,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_years" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"branch_id" integer,
	"name" varchar(64) NOT NULL,
	"start_date" timestamp(6) NOT NULL,
	"end_date" timestamp(6) NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"meta" json
);
--> statement-breakpoint
CREATE TABLE "academic_calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"academic_year_id" integer NOT NULL,
	"branch_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"start_date" timestamp(6) NOT NULL,
	"end_date" timestamp(6),
	"is_holiday" boolean DEFAULT false NOT NULL,
	"recurring_rule" varchar(255),
	"created_by" integer,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"name" varchar(64) NOT NULL,
	"display_name" varchar(128),
	"order" integer
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"grade_id" integer NOT NULL,
	"name" varchar(32) NOT NULL,
	"capacity" integer
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"code" varchar(64),
	"name" varchar(255) NOT NULL,
	"short_name" varchar(64),
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"name" varchar(128),
	"start_time" varchar(16),
	"end_time" varchar(16),
	"order" integer
);
--> statement-breakpoint
CREATE TABLE "timetables" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"grade_id" integer NOT NULL,
	"section_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"period_id" integer NOT NULL,
	"subject_id" integer NOT NULL,
	"teacher_id" integer
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"employee_number" varchar(128),
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255),
	"phone" varchar(32),
	"email" varchar(255),
	"address" text,
	"dob" timestamp(6),
	"gender" varchar(32),
	"qualification" varchar(255),
	"experience_years" integer,
	"specialization" varchar(255),
	"emergency_contact" json,
	"hire_date" timestamp(6),
	"is_active" boolean DEFAULT true NOT NULL,
	"meta" json,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"user_id" integer,
	"admission_number" varchar(128),
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255),
	"dob" timestamp(6),
	"gender" varchar(32),
	"blood_group" varchar(8),
	"photo_url" varchar(1024),
	"address" text,
	"phone" varchar(32),
	"emergency_contact" json,
	"deleted_at" timestamp(6),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"meta" json
);
--> statement-breakpoint
CREATE TABLE "parents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"relationship" varchar(64),
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255),
	"phone" varchar(32),
	"email" varchar(255),
	"address" text,
	"occupation" varchar(255),
	"company_name" varchar(255),
	"annual_income" integer,
	"emergency_contact" json,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"employee_number" varchar(128),
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255),
	"phone" varchar(32),
	"email" varchar(255),
	"address" text,
	"dob" timestamp(6),
	"gender" varchar(32),
	"department" varchar(255),
	"position" varchar(255),
	"emergency_contact" json,
	"hire_date" timestamp(6),
	"is_active" boolean DEFAULT true NOT NULL,
	"meta" json,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"grade_id" integer NOT NULL,
	"section_id" integer,
	"academic_year_id" integer NOT NULL,
	"roll_number" integer,
	"status" varchar(64) DEFAULT 'ENROLLED' NOT NULL,
	"enrolled_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"left_at" timestamp(6),
	"is_active" boolean DEFAULT true NOT NULL,
	"meta" json
);
--> statement-breakpoint
CREATE TABLE "student_parents" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"parent_id" integer NOT NULL,
	"relationship" varchar(64),
	"is_primary" boolean DEFAULT false NOT NULL,
	"can_view_reports" boolean DEFAULT true NOT NULL,
	"can_view_fees" boolean DEFAULT true NOT NULL,
	"contact_priority" integer,
	"start_date" timestamp(6),
	"end_date" timestamp(6),
	"created_by" integer,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_teachers" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacher_id" integer NOT NULL,
	"grade_id" integer NOT NULL,
	"section_id" integer NOT NULL,
	"academic_year" varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacher_id" integer NOT NULL,
	"subject_id" integer NOT NULL,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"date" timestamp(6) NOT NULL,
	"shift" "ShiftEnum" DEFAULT 'FULL_DAY' NOT NULL,
	"academic_year_id" integer NOT NULL,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"attendance_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"enrollment_id" integer NOT NULL,
	"status" "AttendanceStatus" DEFAULT 'PRESENT' NOT NULL,
	"marked_by" integer NOT NULL,
	"marked_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"academic_year_id" integer NOT NULL,
	"exam_type" varchar(64),
	"start_date" timestamp(6),
	"end_date" timestamp(6),
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"grade_id" integer NOT NULL,
	"section_id" integer,
	"subject_id" integer NOT NULL,
	"date" timestamp(6) NOT NULL,
	"start_time" varchar(16),
	"end_time" varchar(16)
);
--> statement-breakpoint
CREATE TABLE "marks" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"enrollment_id" integer NOT NULL,
	"subject_id" integer NOT NULL,
	"marks_obtained" integer,
	"max_marks" integer,
	"remarks" text,
	"entered_by" integer,
	"entered_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"academic_year_id" integer NOT NULL,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"fee_structure_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"amount_paise" integer NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"enrollment_id" integer NOT NULL,
	"invoice_number" varchar(128) NOT NULL,
	"total_amount_paise" integer NOT NULL,
	"status" "FeeStatus" DEFAULT 'PENDING' NOT NULL,
	"created_by" integer,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"fee_invoice_id" integer NOT NULL,
	"fee_item_id" integer,
	"description" varchar(255),
	"amount_paise" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"fee_invoice_id" integer NOT NULL,
	"payment_mode" varchar(64) NOT NULL,
	"amount_paise" integer NOT NULL,
	"transaction_ref" varchar(255),
	"paid_by" integer,
	"paid_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_salaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"employee_type" varchar(32) NOT NULL,
	"employee_id" integer NOT NULL,
	"basic_salary" integer NOT NULL,
	"allowances" json,
	"deductions" json,
	"effective_from" timestamp(6) NOT NULL,
	"effective_to" timestamp(6),
	"is_current" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_payslips" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"employee_type" varchar(32) NOT NULL,
	"employee_id" integer NOT NULL,
	"staff_salary_id" integer NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"pay_period_start" timestamp(6) NOT NULL,
	"pay_period_end" timestamp(6) NOT NULL,
	"basic_salary" integer NOT NULL,
	"allowances" json,
	"deductions" json,
	"gross_salary" integer NOT NULL,
	"total_deductions" integer NOT NULL,
	"net_salary" integer NOT NULL,
	"payment_status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"payment_date" timestamp(6),
	"payment_method" varchar(64),
	"payment_reference" varchar(128),
	"working_days" integer NOT NULL,
	"present_days" integer NOT NULL,
	"leave_days" integer DEFAULT 0 NOT NULL,
	"absent_days" integer DEFAULT 0 NOT NULL,
	"overtime_hours" integer DEFAULT 0 NOT NULL,
	"overtime_rate" integer DEFAULT 0 NOT NULL,
	"overtime_amount" integer DEFAULT 0 NOT NULL,
	"bonus" integer DEFAULT 0 NOT NULL,
	"advance_deduction" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"generated_by" integer NOT NULL,
	"approved_by" integer,
	"paid_by" integer,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer,
	"branch_id" integer,
	"user_id" integer,
	"action" varchar(255) NOT NULL,
	"resource" varchar(255),
	"resource_id" integer,
	"before" json,
	"after" json,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer,
	"title" varchar(255),
	"message" text,
	"type" varchar(64),
	"payload" json,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer,
	"uploaded_by" integer,
	"url" varchar(2048) NOT NULL,
	"mime_type" varchar(128),
	"size_bytes" integer,
	"meta" json,
	"created_at" timestamp(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_calendar_events" ADD CONSTRAINT "academic_calendar_events_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_calendar_events" ADD CONSTRAINT "academic_calendar_events_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periods" ADD CONSTRAINT "periods_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_period_id_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_attendance_id_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_marked_by_users_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedule" ADD CONSTRAINT "exam_schedule_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedule" ADD CONSTRAINT "exam_schedule_grade_id_grades_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedule" ADD CONSTRAINT "exam_schedule_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedule" ADD CONSTRAINT "exam_schedule_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_items" ADD CONSTRAINT "fee_items_fee_structure_id_fee_structures_id_fk" FOREIGN KEY ("fee_structure_id") REFERENCES "public"."fee_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoices" ADD CONSTRAINT "fee_invoices_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoice_items" ADD CONSTRAINT "fee_invoice_items_fee_invoice_id_fee_invoices_id_fk" FOREIGN KEY ("fee_invoice_id") REFERENCES "public"."fee_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_invoice_items" ADD CONSTRAINT "fee_invoice_items_fee_item_id_fee_items_id_fk" FOREIGN KEY ("fee_item_id") REFERENCES "public"."fee_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_fee_invoice_id_fee_invoices_id_fk" FOREIGN KEY ("fee_invoice_id") REFERENCES "public"."fee_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_salaries" ADD CONSTRAINT "staff_salaries_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_salaries" ADD CONSTRAINT "staff_salaries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payslips" ADD CONSTRAINT "monthly_payslips_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payslips" ADD CONSTRAINT "monthly_payslips_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payslips" ADD CONSTRAINT "monthly_payslips_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payslips" ADD CONSTRAINT "monthly_payslips_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payslips" ADD CONSTRAINT "monthly_payslips_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payslips" ADD CONSTRAINT "monthly_payslips_staff_salary_id_staff_salaries_id_fk" FOREIGN KEY ("staff_salary_id") REFERENCES "public"."staff_salaries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "users" USING btree ("is_active" bool_ops,"is_deleted" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_users_branch" ON "users" USING btree ("branch_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_users_org" ON "users" USING btree ("organization_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_current_academic_year" ON "academic_years" USING btree ("branch_id" int4_ops,"is_current" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_students_branch_active" ON "students" USING btree ("branch_id" int4_ops,"is_deleted" bool_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_student_admission_branch" ON "students" USING btree ("admission_number" int4_ops,"branch_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_enrollments_branch_year" ON "enrollments" USING btree ("branch_id" int4_ops,"academic_year_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_student_academic_year" ON "enrollments" USING btree ("student_id" int4_ops,"academic_year_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_student_parent" ON "student_parents" USING btree ("student_id" int4_ops,"parent_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_teacher_subject" ON "teacher_subjects" USING btree ("teacher_id" int4_ops,"subject_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_attendance_branch_date_shift" ON "attendance" USING btree ("branch_id" timestamp_ops,"date" timestamp_ops,"shift" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_attendance_records_enrollment" ON "attendance_records" USING btree ("enrollment_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_attendance_records_attendance_student" ON "attendance_records" USING btree ("attendance_id" int4_ops,"student_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_exams_branch_year" ON "exams" USING btree ("branch_id" int4_ops,"academic_year_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_exam_schedule_date" ON "exam_schedule" USING btree ("date" timestamp_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_exam_schedule" ON "exam_schedule" USING btree ("exam_id" int4_ops,"grade_id" timestamp_ops,"section_id" int4_ops,"subject_id" int4_ops,"date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_marks_enrollment" ON "marks" USING btree ("enrollment_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_marks_exam" ON "marks" USING btree ("exam_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_marks_exam_student_subject" ON "marks" USING btree ("exam_id" int4_ops,"student_id" int4_ops,"subject_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_payslips_branch_month" ON "monthly_payslips" USING btree ("branch_id" int4_ops,"year" int4_ops,"month" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_payslips_payment_status" ON "monthly_payslips" USING btree ("payment_status" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_payslip_employee_month" ON "monthly_payslips" USING btree ("employee_type" text_ops,"employee_id" int4_ops,"month" int4_ops,"year" text_ops);
*/