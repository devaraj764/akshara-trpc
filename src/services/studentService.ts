import { eq, and, sql } from 'drizzle-orm';
import db from '../db/index.js';
import { 
  students,
  organizations,
  branches,
  studentMedicalRecords,
  studentBehavioralRecords,
  studentDocuments,
  studentExtracurricularActivities
} from '../db/schema.js';
import { ServiceResponse } from '../types.db.js';

export class StudentService {
  static async getById(id: number): Promise<ServiceResponse<any>> {
    return { success: false, error: 'Not implemented' };
  }

  static async getAll(organizationId: number, classId?: number): Promise<ServiceResponse<any[]>> {
    return { success: false, error: 'Not implemented' };
  }

  static async create(data: any): Promise<ServiceResponse<any>> {
    return { success: false, error: 'Not implemented' };
  }

  static async update(id: number, data: any): Promise<ServiceResponse<any>> {
    return { success: false, error: 'Not implemented' };
  }

  static async delete(id: number): Promise<ServiceResponse<void>> {
    return { success: false, error: 'Not implemented' };
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
        studentName: sql<string>`CONCAT(${students.firstName}, ' ', ${students.lastName})`,
        branchName: branches.name,
        incidentDate: studentBehavioralRecords.incidentDate,
        incidentType: studentBehavioralRecords.incidentType,
        description: studentBehavioralRecords.description,
        severityLevel: studentBehavioralRecords.severityLevel,
        resolved: studentBehavioralRecords.resolved,
        parentNotified: studentBehavioralRecords.parentNotified
      })
        .from(students)
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
        studentName: sql<string>`CONCAT(${students.firstName}, ' ', ${students.lastName})`,
        allergies: studentMedicalRecords.allergies,
        medicalConditions: studentMedicalRecords.medicalConditions,
        medications: studentMedicalRecords.medications,
        specialNeeds: studentMedicalRecords.specialNeeds,
        emergencyMedicalContact: studentMedicalRecords.emergencyMedicalContact
      })
        .from(students)
        .leftJoin(studentMedicalRecords, eq(students.id, studentMedicalRecords.studentId))
        .where(
          and(
            eq(students.branchId, branchId),
            sql`(${studentMedicalRecords.allergies} IS NOT NULL OR ${studentMedicalRecords.medicalConditions} IS NOT NULL OR ${studentMedicalRecords.specialNeeds} IS NOT NULL)`
          )
        )
        .orderBy(students.firstName);

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
        studentName: sql<string>`CONCAT(${students.firstName}, ' ', ${students.lastName})`,
        documentType: studentDocuments.documentType,
        documentName: studentDocuments.documentName,
        expiryDate: studentDocuments.expiryDate,
        organizationName: organizations.name,
        branchName: branches.name
      })
        .from(studentDocuments)
        .leftJoin(students, eq(studentDocuments.studentId, students.id))
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