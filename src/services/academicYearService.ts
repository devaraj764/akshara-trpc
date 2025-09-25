import { eq, and, sql } from 'drizzle-orm';
import db from '../db/index.js';
import { academicYears, organizations, branches } from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreateAcademicYearData {
  name: string;
  startDate: string;
  endDate: string;
  organizationId: number;
  branchId?: number | undefined;
  isCurrent?: boolean | undefined;
}

export interface UpdateAcademicYearData {
  name?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  isCurrent?: boolean | undefined;
}

export interface GetAllOptions {
  organizationId?: number | undefined;
  branchId?: number | undefined;
  includeDeleted?: boolean | undefined;
  currentOnly?: boolean | undefined;
}

export class AcademicYearService {
  static async getAll(options: GetAllOptions = {}): Promise<ServiceResponse<any[]>> {
    try {
      // Build where conditions
      let whereConditions = [];
      
      if (!options.includeDeleted) {
        whereConditions.push(eq(academicYears.isDeleted, false));
      }

      if (options.organizationId) {
        whereConditions.push(eq(academicYears.organizationId, options.organizationId));
      }

      if (options.branchId) {
        whereConditions.push(eq(academicYears.branchId, options.branchId));
      }

      if (options.currentOnly) {
        whereConditions.push(eq(academicYears.isCurrent, true));
      }

      const result = await db.select({
        id: academicYears.id,
        name: academicYears.name,
        startDate: academicYears.startDate,
        endDate: academicYears.endDate,
        isCurrent: academicYears.isCurrent,
        organizationId: academicYears.organizationId,
        branchId: academicYears.branchId,
        createdAt: academicYears.createdAt,
        // Include organization info
        organizationName: organizations.name,
        // Include branch info if available
        branchName: branches.name,
      })
      .from(academicYears)
      .leftJoin(organizations, eq(academicYears.organizationId, organizations.id))
      .leftJoin(branches, eq(academicYears.branchId, branches.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(academicYears.startDate);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch academic years' };
    }
  }

  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: academicYears.id,
        name: academicYears.name,
        startDate: academicYears.startDate,
        endDate: academicYears.endDate,
        isCurrent: academicYears.isCurrent,
        organizationId: academicYears.organizationId,
        branchId: academicYears.branchId,
        createdAt: academicYears.createdAt,
        organizationName: organizations.name,
        branchName: branches.name,
      })
      .from(academicYears)
      .leftJoin(organizations, eq(academicYears.organizationId, organizations.id))
      .leftJoin(branches, eq(academicYears.branchId, branches.id))
      .where(and(
        eq(academicYears.id, id),
        eq(academicYears.isDeleted, false)
      ))
      .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Academic year not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch academic year' };
    }
  }

  static async create(data: CreateAcademicYearData): Promise<ServiceResponse<any>> {
    try {
      // If setting as current, ensure no other academic year is marked as current for the same scope
      if (data.isCurrent) {
        let updateConditions = [eq(academicYears.organizationId, data.organizationId)];
        
        if (data.branchId) {
          updateConditions.push(eq(academicYears.branchId, data.branchId));
        } else {
          // For organization-level academic years, update all organization-level years
          updateConditions.push(sql`${academicYears.branchId} IS NULL`);
        }

        // Set all other academic years to not current
        await db.update(academicYears)
          .set({ isCurrent: false })
          .where(and(...updateConditions));
      }

      const result = await db.insert(academicYears).values({
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        organizationId: data.organizationId,
        branchId: data.branchId || null,
        isCurrent: data.isCurrent || false,
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create academic year' };
    }
  }

  static async update(id: number, data: UpdateAcademicYearData, userOrganizationId?: number): Promise<ServiceResponse<any>> {
    try {
      // Verify academic year exists and user has permission
      const existing = await db.select({ 
        organizationId: academicYears.organizationId,
        branchId: academicYears.branchId,
      })
        .from(academicYears)
        .where(and(eq(academicYears.id, id), eq(academicYears.isDeleted, false)))
        .limit(1);

      if (existing.length === 0) {
        return { success: false, error: 'Academic year not found' };
      }

      // Check organization permission if specified
      if (userOrganizationId && existing[0]!.organizationId !== userOrganizationId) {
        return { success: false, error: 'Access denied' };
      }

      // If setting as current, ensure no other academic year is marked as current for the same scope
      if (data.isCurrent) {
        let updateConditions = [
          eq(academicYears.organizationId, existing[0]!.organizationId),
          sql`${academicYears.id} != ${id}` // Exclude current record
        ];
        
        if (existing[0]!.branchId) {
          updateConditions.push(eq(academicYears.branchId, existing[0]!.branchId));
        } else {
          // For organization-level academic years, update all organization-level years
          updateConditions.push(sql`${academicYears.branchId} IS NULL`);
        }

        // Set all other academic years to not current
        await db.update(academicYears)
          .set({ isCurrent: false })
          .where(and(...updateConditions));
      }

      const result = await db.update(academicYears)
        .set(data)
        .where(eq(academicYears.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Academic year not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update academic year' };
    }
  }

  static async delete(id: number, userOrganizationId?: number): Promise<ServiceResponse<any>> {
    try {
      // Verify academic year exists and user has permission
      const existing = await db.select({ 
        organizationId: academicYears.organizationId,
        isCurrent: academicYears.isCurrent,
      })
        .from(academicYears)
        .where(and(eq(academicYears.id, id), eq(academicYears.isDeleted, false)))
        .limit(1);

      if (existing.length === 0) {
        return { success: false, error: 'Academic year not found' };
      }

      // Check organization permission if specified
      if (userOrganizationId && existing[0]!.organizationId !== userOrganizationId) {
        return { success: false, error: 'Access denied' };
      }

      // Prevent deletion of current academic year
      if (existing[0]!.isCurrent) {
        return { success: false, error: 'Cannot delete the current academic year. Please set another year as current first.' };
      }

      const result = await db.update(academicYears)
        .set({ isDeleted: true })
        .where(eq(academicYears.id, id))
        .returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete academic year' };
    }
  }

  static async restore(id: number, userOrganizationId?: number): Promise<ServiceResponse<any>> {
    try {
      // Verify academic year exists and user has permission
      const existing = await db.select({ organizationId: academicYears.organizationId })
        .from(academicYears)
        .where(and(eq(academicYears.id, id), eq(academicYears.isDeleted, true)))
        .limit(1);

      if (existing.length === 0) {
        return { success: false, error: 'Deleted academic year not found' };
      }

      // Check organization permission if specified
      if (userOrganizationId && existing[0]!.organizationId !== userOrganizationId) {
        return { success: false, error: 'Access denied' };
      }

      const result = await db.update(academicYears)
        .set({ isDeleted: false })
        .where(eq(academicYears.id, id))
        .returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to restore academic year' };
    }
  }

  static async getCurrentAcademicYear(organizationId: number, branchId?: number): Promise<ServiceResponse<any>> {
    try {
      let whereConditions = [
        eq(academicYears.organizationId, organizationId),
        eq(academicYears.isCurrent, true),
        eq(academicYears.isDeleted, false)
      ];

      if (branchId) {
        whereConditions.push(eq(academicYears.branchId, branchId));
      } else {
        whereConditions.push(sql`${academicYears.branchId} IS NULL`);
      }

      const result = await db.select({
        id: academicYears.id,
        name: academicYears.name,
        startDate: academicYears.startDate,
        endDate: academicYears.endDate,
        isCurrent: academicYears.isCurrent,
        organizationId: academicYears.organizationId,
        branchId: academicYears.branchId,
        createdAt: academicYears.createdAt,
      })
      .from(academicYears)
      .where(and(...whereConditions))
      .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'No current academic year found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch current academic year' };
    }
  }
}