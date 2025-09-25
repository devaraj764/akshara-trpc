import { eq, and, sql, desc, asc, inArray } from 'drizzle-orm';
import db from '../db/index.js';
import { 
  feeTypes,
  organizations
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreateFeeTypeData {
  organizationId?: number | null;
  code?: string;
  name: string;
  description?: string;
  isPrivate?: boolean;
}

export interface UpdateFeeTypeData {
  code?: string;
  name?: string;
  description?: string;
  isPrivate?: boolean;
}

export interface GetFeeTypesOptions {
  organizationId?: number;
  includeDeleted?: boolean;
  includePrivate?: boolean;
}

export class FeeTypesService {
  static async create(data: CreateFeeTypeData): Promise<ServiceResponse<any>> {
    try {
      return await db.transaction(async (tx) => {
        const result = await tx.insert(feeTypes).values({
          organizationId: data.organizationId || null,
          code: data.code || null,
          name: data.name,
          description: data.description || null,
          isPrivate: data.isPrivate ?? false,
          isDeleted: false
        }).returning();

        // If this is an organization-specific fee type, auto-enable it for the organization
        if (data.organizationId) {
          const orgResult = await tx.select({ enabledFeetypes: organizations.enabledFeetypes })
            .from(organizations)
            .where(eq(organizations.id, data.organizationId))
            .limit(1);

          if (orgResult.length > 0) {
            const currentEnabled = orgResult[0].enabledFeetypes || [];
            const newEnabled = [...currentEnabled, result[0].id];
            await tx.update(organizations)
              .set({ enabledFeetypes: newEnabled })
              .where(eq(organizations.id, data.organizationId));
          }
        }

        return { success: true, data: result[0] };
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create fee type' };
    }
  }

  static async getAll(options: GetFeeTypesOptions = {}): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [];

      if (options.organizationId) {
        whereConditions.push(eq(feeTypes.organizationId, options.organizationId));
      }

      if (!options.includeDeleted) {
        whereConditions.push(eq(feeTypes.isDeleted, false));
      }

      if (!options.includePrivate) {
        whereConditions.push(eq(feeTypes.isPrivate, false));
      }

      const result = await db.select({
        id: feeTypes.id,
        organizationId: feeTypes.organizationId,
        code: feeTypes.code,
        name: feeTypes.name,
        description: feeTypes.description,
        isPrivate: feeTypes.isPrivate,
        isDeleted: feeTypes.isDeleted,
        createdAt: feeTypes.createdAt,
        // Organization info
        organizationName: organizations.name
      })
        .from(feeTypes)
        .leftJoin(organizations, eq(feeTypes.organizationId, organizations.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`)
        .orderBy(asc(feeTypes.name));

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch fee types' };
    }
  }

  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: feeTypes.id,
        organizationId: feeTypes.organizationId,
        code: feeTypes.code,
        name: feeTypes.name,
        description: feeTypes.description,
        isPrivate: feeTypes.isPrivate,
        isDeleted: feeTypes.isDeleted,
        createdAt: feeTypes.createdAt,
        // Organization info
        organizationName: organizations.name
      })
        .from(feeTypes)
        .leftJoin(organizations, eq(feeTypes.organizationId, organizations.id))
        .where(eq(feeTypes.id, id))
        .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Fee type not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch fee type' };
    }
  }

  static async update(id: number, data: UpdateFeeTypeData): Promise<ServiceResponse<any>> {
    try {
      const updateData: any = {};
      if (data.code !== undefined) updateData.code = data.code;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.isPrivate !== undefined) updateData.isPrivate = data.isPrivate;

      if (Object.keys(updateData).length === 0) {
        return { success: false, error: 'No data to update' };
      }

      const result = await db.update(feeTypes)
        .set(updateData)
        .where(eq(feeTypes.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Fee type not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update fee type' };
    }
  }

  static async delete(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(feeTypes)
        .set({ isDeleted: true })
        .where(eq(feeTypes.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Fee type not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete fee type' };
    }
  }

  // Get organization fee types (includes global types)
  static async getOrganizationFeeTypes(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: feeTypes.id,
        organizationId: feeTypes.organizationId,
        code: feeTypes.code,
        name: feeTypes.name,
        description: feeTypes.description,
        isPrivate: feeTypes.isPrivate,
        isDeleted: feeTypes.isDeleted,
        createdAt: feeTypes.createdAt,
        // Organization info
        organizationName: organizations.name
      })
        .from(feeTypes)
        .leftJoin(organizations, eq(feeTypes.organizationId, organizations.id))
        .where(
          and(
            eq(feeTypes.isDeleted, false),
            eq(feeTypes.isPrivate, false),
            sql`(${feeTypes.organizationId} IS NULL OR ${feeTypes.organizationId} = ${organizationId})`
          )
        )
        .orderBy(asc(feeTypes.name));

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch organization fee types' };
    }
  }

  // Get enabled fee types for an organization
  static async getEnabledFeeTypes(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      // Get enabled fee type IDs from organization
      const orgResult = await db.select({ enabledFeetypes: organizations.enabledFeetypes })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (orgResult.length === 0) {
        return { success: false, error: 'Organization not found' };
      }

      const enabledIds = orgResult[0].enabledFeetypes || [];
      if (enabledIds.length === 0) {
        return { success: true, data: [] };
      }

      // Fetch the enabled fee types
      const result = await db.select({
        id: feeTypes.id,
        organizationId: feeTypes.organizationId,
        code: feeTypes.code,
        name: feeTypes.name,
        description: feeTypes.description,
        isPrivate: feeTypes.isPrivate,
        isDeleted: feeTypes.isDeleted,
        createdAt: feeTypes.createdAt,
        // Organization info
        organizationName: organizations.name
      })
        .from(feeTypes)
        .leftJoin(organizations, eq(feeTypes.organizationId, organizations.id))
        .where(
          and(
            inArray(feeTypes.id, enabledIds),
            eq(feeTypes.isDeleted, false)
          )
        )
        .orderBy(asc(feeTypes.name));

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch enabled fee types' };
    }
  }

  // Get global (system-wide) fee types
  static async getGlobalFeeTypes(): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      includeDeleted: false,
      includePrivate: false
    });
  }

  static async getFeeTypeStats(organizationId?: number): Promise<ServiceResponse<any>> {
    try {
      const whereConditions = [eq(feeTypes.isDeleted, false)];

      if (organizationId) {
        whereConditions.push(
          sql`(${feeTypes.organizationId} IS NULL OR ${feeTypes.organizationId} = ${organizationId})`
        );
      }

      const totalTypes = await db.select({
        count: sql`COUNT(*)`.as('count')
      })
        .from(feeTypes)
        .where(and(...whereConditions));

      const privateTypes = await db.select({
        count: sql`COUNT(*)`.as('count')
      })
        .from(feeTypes)
        .where(and(...whereConditions, eq(feeTypes.isPrivate, true)));

      const globalTypes = await db.select({
        count: sql`COUNT(*)`.as('count')
      })
        .from(feeTypes)
        .where(and(...whereConditions, sql`${feeTypes.organizationId} IS NULL`));

      const stats = {
        totalTypes: parseInt(totalTypes[0]?.count as string) || 0,
        privateTypes: parseInt(privateTypes[0]?.count as string) || 0,
        globalTypes: parseInt(globalTypes[0]?.count as string) || 0,
        organizationTypes: (parseInt(totalTypes[0]?.count as string) || 0) - (parseInt(globalTypes[0]?.count as string) || 0)
      };

      return { success: true, data: stats };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch fee type stats' };
    }
  }
}