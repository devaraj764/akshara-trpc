import { eq, and, or, sql } from 'drizzle-orm';
import db from '../db/index.js';
import { 
  students,
  organizations,
  branches,
  addresses,
  personDetails,
  studentMedicalRecords,
  studentBehavioralRecords,
  studentDocuments,
  studentExtracurricularActivities,
  enrollments,
  grades,
  sections,
  academicYears
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

interface CreateStudentData {
  organizationId: number;
  branchId: number;
  firstName: string;
  lastName?: string;
  admissionNumber?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    pincode?: string;
    cityVillage: string;
    district: string;
    state: string;
    country?: string;
  };
  meta?: any;
}

interface UpdateStudentData extends Partial<CreateStudentData> {
  id: number;
}

export class StudentService {
  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: students.id,
        organizationId: students.organizationId,
        branchId: students.branchId,
        userId: students.userId,
        admissionNumber: students.admissionNumber,
        meta: students.meta,
        isActive: sql<boolean>`NOT ${students.isDeleted}`,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
        // Person details
        firstName: personDetails.firstName,
        lastName: personDetails.lastName,
        dob: personDetails.dob,
        gender: personDetails.gender,
        phone: personDetails.phone,
        email: personDetails.email,
        photoUrl: personDetails.photoUrl,
        profileUrl: personDetails.profileUrl,
        // Address details
        addressLine1: addresses.addressLine1,
        addressLine2: addresses.addressLine2,
        pincode: addresses.pincode,
        cityVillage: addresses.cityVillage,
        district: addresses.district,
        state: addresses.state,
        country: addresses.country,
        // Current enrollment data
        enrollmentId: enrollments.id,
        gradeName: grades.name,
        sectionName: sections.name,
        academicYearId: academicYears.id,
      })
      .from(students)
      .leftJoin(personDetails, eq(students.personDetailId, personDetails.id))
      .leftJoin(addresses, eq(students.addressId, addresses.id))
      .leftJoin(enrollments, and(
        eq(students.id, enrollments.studentId),
        eq(enrollments.status, 'ENROLLED'),
        eq(enrollments.isDeleted, false)
      ))
      .leftJoin(academicYears, and(
        eq(enrollments.academicYearId, academicYears.id),
        eq(academicYears.isCurrent, true)
      ))
      .leftJoin(grades, eq(enrollments.gradeId, grades.id))
      .leftJoin(sections, eq(enrollments.sectionId, sections.id))
      .where(and(
        eq(students.id, id),
        eq(students.isDeleted, false)
      ))
      .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Student not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      console.error('Error fetching student by ID:', error);
      return { success: false, error: error.message || 'Failed to fetch student' };
    }
  }

  static async getAll(filters: { 
    organizationId?: number; 
    branchId?: number; 
    classId?: number;
    search?: string;
    isActive?: boolean;
    academicYearId?: number;
    enrollmentStatus?: 'enrolled' | 'unenrolled';
  } = {}): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [eq(students.isDeleted, false)];

      if (filters.organizationId) {
        whereConditions.push(eq(students.organizationId, filters.organizationId));
      }

      if (filters.branchId) {
        whereConditions.push(eq(students.branchId, filters.branchId));
      }

      // Add isActive filter (only active students)
      if (filters.isActive !== undefined) {
        if (filters.isActive) {
          // Active students: not deleted
          whereConditions.push(eq(students.isDeleted, false));
        } else {
          // Inactive students: deleted or soft-deleted
          whereConditions.push(eq(students.isDeleted, true));
        }
      }

      // Add search functionality
      if (filters.search && filters.search.trim()) {
        const searchTerm = `%${filters.search.trim().toLowerCase()}%`;
        whereConditions.push(
          or(
            sql`LOWER(${personDetails.firstName}) LIKE ${searchTerm}`,
            sql`LOWER(${personDetails.lastName}) LIKE ${searchTerm}`,
            sql`LOWER(${students.admissionNumber}) LIKE ${searchTerm}`
          )
        );
      }

      const result = await db.select({
        id: students.id,
        organizationId: students.organizationId,
        branchId: students.branchId,
        userId: students.userId,
        admissionNumber: students.admissionNumber,
        meta: students.meta,
        isActive: sql<boolean>`NOT ${students.isDeleted}`,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
        // Person details
        firstName: personDetails.firstName,
        lastName: personDetails.lastName,
        dob: personDetails.dob,
        gender: personDetails.gender,
        phone: personDetails.phone,
        email: personDetails.email,
        photoUrl: personDetails.photoUrl,
        profileUrl: personDetails.profileUrl,
        // Address details
        addressLine1: addresses.addressLine1,
        addressLine2: addresses.addressLine2,
        pincode: addresses.pincode,
        cityVillage: addresses.cityVillage,
        district: addresses.district,
        state: addresses.state,
        country: addresses.country,
        // Current enrollment data
        enrollmentId: enrollments.id,
        gradeName: grades.name,
        sectionName: sections.name,
        academicYearId: academicYears.id,
      })
      .from(students)
      .leftJoin(personDetails, eq(students.personDetailId, personDetails.id))
      .leftJoin(addresses, eq(students.addressId, addresses.id))
      .leftJoin(enrollments, and(
        eq(students.id, enrollments.studentId),
        eq(enrollments.status, 'ENROLLED'),
        eq(enrollments.isDeleted, false)
        // Always join all enrollments - filtering happens in WHERE clause
      ))
      .leftJoin(academicYears, eq(enrollments.academicYearId, academicYears.id))
      .leftJoin(grades, eq(enrollments.gradeId, grades.id))
      .leftJoin(sections, eq(enrollments.sectionId, sections.id))
      .where(and(...whereConditions))
      .orderBy(students.createdAt);

      let finalResult = result;

      // Apply enrollment status filtering after query if needed
      if (filters.enrollmentStatus && filters.academicYearId) {
        if (filters.enrollmentStatus === 'enrolled') {
          // Only students enrolled in the specified academic year
          finalResult = result.filter(student => 
            student.enrollmentId && student.academicYearId === filters.academicYearId
          );
        } else if (filters.enrollmentStatus === 'unenrolled') {
          // Students not enrolled in the specified academic year
          finalResult = result.filter(student => 
            !student.enrollmentId || student.academicYearId !== filters.academicYearId
          );
        }
      }

      return { success: true, data: finalResult };
    } catch (error: any) {
      console.error('Error fetching students:', error);
      return { success: false, error: error.message || 'Failed to fetch students' };
    }
  }

  static async create(data: CreateStudentData): Promise<ServiceResponse<any>> {
    try {
      return await db.transaction(async (tx) => {
        // Generate admission number if not provided
        let admissionNumber = data.admissionNumber;
        if (!admissionNumber) {
          const currentYear = new Date().getFullYear();
          const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          admissionNumber = `${currentYear}/ADM/${randomNum}`;
        }

        // Create address if provided
        let addressId: number | undefined;
        if (data.address) {
          const addressResult = await tx.insert(addresses).values({
            addressLine1: data.address.addressLine1,
            addressLine2: data.address.addressLine2,
            pincode: data.address.pincode,
            cityVillage: data.address.cityVillage,
            district: data.address.district,
            state: data.address.state,
            country: data.address.country || 'India',
          }).returning({ id: addresses.id });
          addressId = addressResult[0]?.id;
        }

        // Create person details
        const personDetailsResult = await tx.insert(personDetails).values({
          firstName: data.firstName,
          lastName: data.lastName,
          dob: data.dob,
          gender: data.gender,
          phone: data.phone,
          email: data.email,
          photoUrl: data.photoUrl,
        }).returning({ id: personDetails.id });

        const personDetailId = personDetailsResult[0]?.id;
        if (!personDetailId) {
          throw new Error('Failed to create person details');
        }

        // Create student record
        const result = await tx.insert(students).values({
          organizationId: data.organizationId,
          branchId: data.branchId,
          addressId: addressId,
          personDetailId: personDetailId,
          admissionNumber,
          meta: data.meta ? JSON.stringify(data.meta) : null,
        }).returning({
          id: students.id,
          organizationId: students.organizationId,
          branchId: students.branchId,
          userId: students.userId,
          admissionNumber: students.admissionNumber,
          addressId: students.addressId,
          personDetailId: students.personDetailId,
          meta: students.meta,
          isActive: sql<boolean>`NOT ${students.isDeleted}`,
          createdAt: students.createdAt,
          updatedAt: students.updatedAt
        });

        return { success: true, data: result[0] };
      });
    } catch (error: any) {
      console.error('Error creating student:', error);
      return { success: false, error: error.message || 'Failed to create student' };
    }
  }

  static async update(data: UpdateStudentData): Promise<ServiceResponse<any>> {
    try {
      return await db.transaction(async (tx) => {
        // Get current student data to know which records to update
        const currentStudent = await tx.select({
          id: students.id,
          addressId: students.addressId,
          personDetailId: students.personDetailId,
        })
        .from(students)
        .where(and(
          eq(students.id, data.id),
          eq(students.isDeleted, false)
        ))
        .limit(1);

        if (currentStudent.length === 0) {
          throw new Error('Student not found or already deleted');
        }

        const student = currentStudent[0];

        // Update address if provided
        if (data.address && student.addressId) {
          await tx.update(addresses)
            .set({
              addressLine1: data.address.addressLine1,
              addressLine2: data.address.addressLine2,
              pincode: data.address.pincode,
              cityVillage: data.address.cityVillage,
              district: data.address.district,
              state: data.address.state,
              country: data.address.country || 'India',
              updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(addresses.id, student.addressId));
        } else if (data.address && !student.addressId) {
          // Create new address if student doesn't have one
          const addressResult = await tx.insert(addresses).values({
            addressLine1: data.address.addressLine1,
            addressLine2: data.address.addressLine2,
            pincode: data.address.pincode,
            cityVillage: data.address.cityVillage,
            district: data.address.district,
            state: data.address.state,
            country: data.address.country || 'India',
          }).returning({ id: addresses.id });
          
          const addressId = addressResult[0]?.id;
          if (addressId) {
            await tx.update(students)
              .set({ addressId })
              .where(eq(students.id, data.id));
          }
        }

        // Update person details
        if (student.personDetailId) {
          const personUpdateData: any = {};
          if (data.firstName !== undefined) personUpdateData.firstName = data.firstName;
          if (data.lastName !== undefined) personUpdateData.lastName = data.lastName;
          if (data.dob !== undefined) personUpdateData.dob = data.dob;
          if (data.gender !== undefined) personUpdateData.gender = data.gender;
          if (data.phone !== undefined) personUpdateData.phone = data.phone;
          if (data.email !== undefined) personUpdateData.email = data.email;
          if (data.photoUrl !== undefined) personUpdateData.photoUrl = data.photoUrl;

          if (Object.keys(personUpdateData).length > 0) {
            personUpdateData.updatedAt = sql`CURRENT_TIMESTAMP`;
            await tx.update(personDetails)
              .set(personUpdateData)
              .where(eq(personDetails.id, student.personDetailId));
          }
        }

        // Update student record itself
        const studentUpdateData: any = {};
        if (data.admissionNumber !== undefined) studentUpdateData.admissionNumber = data.admissionNumber;
        if (data.meta !== undefined) {
          studentUpdateData.meta = data.meta ? JSON.stringify(data.meta) : null;
        }

        if (Object.keys(studentUpdateData).length > 0) {
          studentUpdateData.updatedAt = sql`CURRENT_TIMESTAMP`;
          await tx.update(students)
            .set(studentUpdateData)
            .where(eq(students.id, data.id));
        }

        // Return updated student data
        const result = await tx.select({
          id: students.id,
          organizationId: students.organizationId,
          branchId: students.branchId,
          userId: students.userId,
          admissionNumber: students.admissionNumber,
          addressId: students.addressId,
          personDetailId: students.personDetailId,
          meta: students.meta,
          isActive: sql<boolean>`NOT ${students.isDeleted}`,
          createdAt: students.createdAt,
          updatedAt: students.updatedAt
        })
        .from(students)
        .where(eq(students.id, data.id))
        .limit(1);

        return { success: true, data: result[0] };
      });
    } catch (error: any) {
      console.error('Error updating student:', error);
      return { success: false, error: error.message || 'Failed to update student' };
    }
  }

  static async delete(id: number): Promise<ServiceResponse<void>> {
    try {
      const result = await db.update(students)
        .set({ 
          isDeleted: true,
          deletedAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(and(
          eq(students.id, id),
          eq(students.isDeleted, false)
        ))
        .returning({ id: students.id });

      if (result.length === 0) {
        return { success: false, error: 'Student not found or already deleted' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting student:', error);
      return { success: false, error: error.message || 'Failed to delete student' };
    }
  }

  static async getByClass(classId: number): Promise<ServiceResponse<any[]>> {
    return { success: false, error: 'Not implemented' };
  }

  // Student Medical Records Methods
  static async addMedicalRecord(studentId: number, medicalData: any): Promise<ServiceResponse<any>> {
    try {
      const result = await db.insert(studentMedicalRecords).values({
        studentId,
        allergies: medicalData.allergies || null,
        medications: medicalData.medications || null,
        medicalConditions: medicalData.medicalConditions || null,
        specialNeeds: medicalData.specialNeeds || null,
        vaccinationRecords: medicalData.vaccinationRecords || null,
        emergencyMedicalContact: medicalData.emergencyMedicalContact || null,
        bloodType: medicalData.bloodType || null,
        heightCm: medicalData.heightCm || null,
        weightKg: medicalData.weightKg || null,
        medicalNotes: medicalData.medicalNotes || null,
        updatedBy: medicalData.updatedBy || null
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to add medical record' };
    }
  }

  static async getMedicalRecord(studentId: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select()
        .from(studentMedicalRecords)
        .where(eq(studentMedicalRecords.studentId, studentId))
        .limit(1);

      return { success: true, data: result[0] || null };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch medical record' };
    }
  }

  // Student Behavioral Records Methods
  static async addBehavioralRecord(studentId: number, behavioralData: any): Promise<ServiceResponse<any>> {
    try {
      const result = await db.insert(studentBehavioralRecords).values({
        studentId,
        incidentDate: behavioralData.incidentDate,
        incidentType: behavioralData.incidentType,
        description: behavioralData.description,
        actionTaken: behavioralData.actionTaken || null,
        severityLevel: behavioralData.severityLevel || null,
        reportedBy: behavioralData.reportedBy || null,
        followUpNotes: behavioralData.followUpNotes || null,
        parentNotified: behavioralData.parentNotified ?? false,
        resolved: behavioralData.resolved ?? false
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to add behavioral record' };
    }
  }

  static async getBehavioralRecords(studentId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select()
        .from(studentBehavioralRecords)
        .where(eq(studentBehavioralRecords.studentId, studentId))
        .orderBy(studentBehavioralRecords.incidentDate);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch behavioral records' };
    }
  }

  // Student Documents Methods
  static async addDocument(studentId: number, documentData: any): Promise<ServiceResponse<any>> {
    try {
      const result = await db.insert(studentDocuments).values({
        studentId,
        documentType: documentData.documentType,
        documentName: documentData.documentName,
        fileUrl: documentData.fileUrl,
        fileSize: documentData.fileSize || null,
        mimeType: documentData.mimeType || null,
        expiryDate: documentData.expiryDate || null,
        isVerified: documentData.isVerified ?? false,
        verifiedBy: documentData.verifiedBy || null,
        verifiedAt: documentData.verifiedAt || null,
        uploadedBy: documentData.uploadedBy || null
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to add document' };
    }
  }

  static async getStudentDocuments(studentId: number, documentType?: string): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [eq(studentDocuments.studentId, studentId)];
      
      if (documentType) {
        whereConditions.push(eq(studentDocuments.documentType, documentType));
      }

      const result = await db.select()
        .from(studentDocuments)
        .where(and(...whereConditions))
        .orderBy(studentDocuments.createdAt);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch student documents' };
    }
  }

  // Student Extracurricular Activities Methods
  static async addExtracurricularActivity(studentId: number, activityData: any): Promise<ServiceResponse<any>> {
    try {
      const result = await db.insert(studentExtracurricularActivities).values({
        studentId,
        activityType: activityData.activityType,
        activityName: activityData.activityName,
        description: activityData.description || null,
        positionRole: activityData.positionRole || null,
        startDate: activityData.startDate || null,
        endDate: activityData.endDate || null,
        achievements: activityData.achievements || null,
        certificates: activityData.certificates || null,
        participationLevel: activityData.participationLevel || null,
        instructorNotes: activityData.instructorNotes || null
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to add extracurricular activity' };
    }
  }

  static async getExtracurricularActivities(studentId: number, activityType?: string): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [eq(studentExtracurricularActivities.studentId, studentId)];
      
      if (activityType) {
        whereConditions.push(eq(studentExtracurricularActivities.activityType, activityType));
      }

      const result = await db.select()
        .from(studentExtracurricularActivities)
        .where(and(...whereConditions))
        .orderBy(studentExtracurricularActivities.startDate);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch extracurricular activities' };
    }
  }

  // Organization and Branch Level Methods
  static async getOrganizationBehavioralIncidents(organizationId: number, severityLevel?: string): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [eq(students.organizationId, organizationId)];
      
      if (severityLevel) {
        whereConditions.push(eq(studentBehavioralRecords.severityLevel, severityLevel));
      }

      const result = await db.select({
        studentId: students.id,
        studentName: sql<string>`CONCAT(${personDetails.firstName}, ' ', ${personDetails.lastName})`,
        branchName: branches.name,
        incidentDate: studentBehavioralRecords.incidentDate,
        incidentType: studentBehavioralRecords.incidentType,
        description: studentBehavioralRecords.description,
        severityLevel: studentBehavioralRecords.severityLevel,
        resolved: studentBehavioralRecords.resolved,
        parentNotified: studentBehavioralRecords.parentNotified
      })
        .from(students)
        .leftJoin(personDetails, eq(students.personDetailId, personDetails.id))
        .leftJoin(branches, eq(students.branchId, branches.id))
        .leftJoin(studentBehavioralRecords, eq(students.id, studentBehavioralRecords.studentId))
        .where(and(...whereConditions))
        .orderBy(studentBehavioralRecords.incidentDate);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch organization behavioral incidents' };
    }
  }

  static async getBranchMedicalAlerts(branchId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        studentId: students.id,
        studentName: sql<string>`CONCAT(${personDetails.firstName}, ' ', ${personDetails.lastName})`,
        allergies: studentMedicalRecords.allergies,
        medicalConditions: studentMedicalRecords.medicalConditions,
        medications: studentMedicalRecords.medications,
        specialNeeds: studentMedicalRecords.specialNeeds,
        emergencyMedicalContact: studentMedicalRecords.emergencyMedicalContact
      })
        .from(students)
        .leftJoin(personDetails, eq(students.personDetailId, personDetails.id))
        .leftJoin(studentMedicalRecords, eq(students.id, studentMedicalRecords.studentId))
        .where(
          and(
            eq(students.branchId, branchId),
            sql`(${studentMedicalRecords.allergies} IS NOT NULL OR ${studentMedicalRecords.medicalConditions} IS NOT NULL OR ${studentMedicalRecords.specialNeeds} IS NOT NULL)`
          )
        )
        .orderBy(personDetails.firstName);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch branch medical alerts' };
    }
  }

  static async getExpiringDocuments(daysAhead: number = 30, organizationId?: number, branchId?: number): Promise<ServiceResponse<any[]>> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const whereConditions = [
        sql`${studentDocuments.expiryDate} <= ${futureDate.toISOString()}`,
        sql`${studentDocuments.expiryDate} >= CURRENT_DATE`
      ];

      if (organizationId) {
        whereConditions.push(eq(students.organizationId, organizationId));
      }

      if (branchId) {
        whereConditions.push(eq(students.branchId, branchId));
      }

      const result = await db.select({
        studentId: students.id,
        studentName: sql<string>`CONCAT(${personDetails.firstName}, ' ', ${personDetails.lastName})`,
        documentType: studentDocuments.documentType,
        documentName: studentDocuments.documentName,
        expiryDate: studentDocuments.expiryDate,
        organizationName: organizations.name,
        branchName: branches.name
      })
        .from(studentDocuments)
        .leftJoin(students, eq(studentDocuments.studentId, students.id))
        .leftJoin(personDetails, eq(students.personDetailId, personDetails.id))
        .leftJoin(organizations, eq(students.organizationId, organizations.id))
        .leftJoin(branches, eq(students.branchId, branches.id))
        .where(and(...whereConditions))
        .orderBy(studentDocuments.expiryDate);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch expiring documents' };
    }
  }
}