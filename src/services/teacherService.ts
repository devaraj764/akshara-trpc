import { eq, and } from 'drizzle-orm';
import db from '../db/index.js';
import { staff, branches, organizations } from '../db/schema.js';
import { ServiceResponse } from '../types.db.js';

export class TeacherService {
  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: staff.id,
        userId: staff.userId,
        organizationId: staff.organizationId,
        branchId: staff.branchId,
        employeeNumber: staff.employeeNumber,
        firstName: staff.firstName,
        lastName: staff.lastName,
        phone: staff.phone,
        email: staff.email,
        address: staff.address,
        dob: staff.dob,
        gender: staff.gender,
        hireDate: staff.hireDate,
        isActive: staff.isActive,
        createdAt: staff.createdAt,
        branchName: branches.name,
        organizationName: organizations.name,
      })
      .from(staff)
      .leftJoin(branches, eq(staff.branchId, branches.id))
      .leftJoin(organizations, eq(staff.organizationId, organizations.id))
      .where(and(
        eq(staff.id, id),
        eq(staff.isDeleted, false)
      ))
      .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Teacher not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch teacher' };
    }
  }

  static async getAll(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: staff.id,
        userId: staff.userId,
        organizationId: staff.organizationId,
        branchId: staff.branchId,
        employeeNumber: staff.employeeNumber,
        firstName: staff.firstName,
        lastName: staff.lastName,
        phone: staff.phone,
        email: staff.email,
        isActive: staff.isActive,
        branchName: branches.name,
      })
      .from(staff)
      .leftJoin(branches, eq(staff.branchId, branches.id))
      .where(and(
        eq(staff.organizationId, organizationId),
        eq(staff.isDeleted, false)
      ))
      .orderBy(staff.firstName, staff.lastName);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch staff' };
    }
  }

  static async getByBranch(branchId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: staff.id,
        userId: staff.userId,
        organizationId: staff.organizationId,
        branchId: staff.branchId,
        employeeNumber: staff.employeeNumber,
        firstName: staff.firstName,
        lastName: staff.lastName,
        phone: staff.phone,
        email: staff.email,
        isActive: staff.isActive,
      })
      .from(staff)
      .where(and(
        eq(staff.branchId, branchId),
        eq(staff.isDeleted, false),
        eq(staff.isActive, true)
      ))
      .orderBy(staff.firstName, staff.lastName);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch staff' };
    }
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

  static async getBySubject(subject: string, organizationId: number): Promise<ServiceResponse<any[]>> {
    return { success: false, error: 'Not implemented' };
  }
}