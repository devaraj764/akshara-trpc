import { eq, and, sql, desc, asc } from 'drizzle-orm';
import db from '../db/index.js';
import { 
  feeItems,
  feeTypes,
  branches,
  users
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreateFeeItemData {
  name: string;
  amountPaise: number;
  isMandatory?: boolean;
  branchId?: number | null;
  organizationId: number;
  enabledClasses?: number[];
  feeTypeId: number;
}

export interface UpdateFeeItemData {
  name?: string;
  amountPaise?: number;
  isMandatory?: boolean;
  enabledClasses?: number[];
  feeTypeId?: number;
}

export interface GetFeeItemsOptions {
  branchId?: number;
  organizationId?: number;
  feeTypeId?: number;
  includeDeleted?: boolean;
}

export class FeeItemsService {
  static async create(data: CreateFeeItemData): Promise<ServiceResponse<any>> {
    try {
      const result = await db.insert(feeItems).values({
        name: data.name,
        amountPaise: data.amountPaise,
        isMandatory: data.isMandatory ?? true,
        branchId: data.branchId || null,
        organizationId: data.organizationId,
        enabledClasses: data.enabledClasses || [],
        feeTypeId: data.feeTypeId,
        isDeleted: false
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create fee item' };
    }
  }

  static async getAll(options: GetFeeItemsOptions = {}): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [];

      if (options.organizationId) {
        whereConditions.push(eq(feeItems.organizationId, options.organizationId));
      }

      if (options.branchId) {
        whereConditions.push(eq(feeItems.branchId, options.branchId));
      }


      if (options.feeTypeId) {
        whereConditions.push(eq(feeItems.feeTypeId, options.feeTypeId));
      }

      if (!options.includeDeleted) {
        whereConditions.push(eq(feeItems.isDeleted, false));
      }

      const result = await db.select({
        id: feeItems.id,
        name: feeItems.name,
        amountPaise: feeItems.amountPaise,
        isMandatory: feeItems.isMandatory,
        branchId: feeItems.branchId,
        organizationId: feeItems.organizationId,
        enabledClasses: feeItems.enabledClasses,
        feeTypeId: feeItems.feeTypeId,
        createdAt: feeItems.createdAt,
        isDeleted: feeItems.isDeleted,
        // Fee type info
        feeTypeName: feeTypes.name,
        feeTypeCode: feeTypes.code,
        // Branch info
        branchName: branches.name,
        branchCode: branches.code,
      })
        .from(feeItems)
        .leftJoin(feeTypes, eq(feeItems.feeTypeId, feeTypes.id))
        .leftJoin(branches, eq(feeItems.branchId, branches.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : sql`1=1`)
        .orderBy(desc(feeItems.createdAt));

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch fee items' };
    }
  }

  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: feeItems.id,
        name: feeItems.name,
        amountPaise: feeItems.amountPaise,
        isMandatory: feeItems.isMandatory,
        branchId: feeItems.branchId,
        organizationId: feeItems.organizationId,
        enabledClasses: feeItems.enabledClasses,
        feeTypeId: feeItems.feeTypeId,
        createdAt: feeItems.createdAt,
        isDeleted: feeItems.isDeleted,
        // Fee type info
        feeTypeName: feeTypes.name,
        feeTypeCode: feeTypes.code,
        // Branch info
        branchName: branches.name,
        branchCode: branches.code,
      })
        .from(feeItems)
        .leftJoin(feeTypes, eq(feeItems.feeTypeId, feeTypes.id))
        .leftJoin(branches, eq(feeItems.branchId, branches.id))
        .where(eq(feeItems.id, id))
        .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Fee item not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch fee item' };
    }
  }

  static async update(id: number, data: UpdateFeeItemData): Promise<ServiceResponse<any>> {
    try {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.amountPaise !== undefined) updateData.amountPaise = data.amountPaise;
      if (data.isMandatory !== undefined) updateData.isMandatory = data.isMandatory;
      if (data.enabledClasses !== undefined) updateData.enabledClasses = data.enabledClasses;
      if (data.feeTypeId !== undefined) updateData.feeTypeId = data.feeTypeId;

      if (Object.keys(updateData).length === 0) {
        return { success: false, error: 'No data to update' };
      }

      const result = await db.update(feeItems)
        .set(updateData)
        .where(eq(feeItems.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Fee item not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update fee item' };
    }
  }

  static async delete(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(feeItems)
        .set({ isDeleted: true })
        .where(eq(feeItems.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Fee item not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete fee item' };
    }
  }

  // Organization Level Methods
  static async getOrganizationFeeItems(organizationId: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      organizationId,
      includeDeleted: false
    });
  }

  // Branch Level Methods
  static async getBranchFeeItems(branchId: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      branchId,
      includeDeleted: false
    });
  }

  static async getFeeItemStats(organizationId?: number, branchId?: number): Promise<ServiceResponse<any>> {
    try {
      const whereConditions = [eq(feeItems.isDeleted, false)];

      if (branchId) {
        whereConditions.push(eq(feeItems.branchId, branchId));
      } else if (organizationId) {
        whereConditions.push(eq(feeItems.organizationId, organizationId));
      }

      const totalItems = await db.select({
        count: sql`COUNT(*)`.as('count')
      })
        .from(feeItems)
        .where(and(...whereConditions));

      // Get items by fee type
      const itemsByType = await db.select({
        feeTypeId: feeItems.feeTypeId,
        feeTypeName: feeTypes.name,
        count: sql`COUNT(*)`.as('count')
      })
        .from(feeItems)
        .leftJoin(feeTypes, eq(feeItems.feeTypeId, feeTypes.id))
        .where(and(...whereConditions))
        .groupBy(feeItems.feeTypeId, feeTypes.name)
        .orderBy(desc(sql`COUNT(*)`));

      // Get average fee amount
      const avgFeeAmount = await db.select({
        avgAmount: sql`AVG(${feeItems.amountPaise})`.as('avgAmount'),
        maxAmount: sql`MAX(${feeItems.amountPaise})`.as('maxAmount'),
        minAmount: sql`MIN(${feeItems.amountPaise})`.as('minAmount')
      })
        .from(feeItems)
        .where(and(...whereConditions));

      const stats = {
        totalItems: parseInt(totalItems[0]?.count as string) || 0,
        itemsByType: itemsByType.map(item => ({
          feeTypeId: item.feeTypeId,
          feeTypeName: item.feeTypeName,
          count: parseInt(item.count as string) || 0
        })),
        averageFeeAmount: parseFloat(avgFeeAmount[0]?.avgAmount as string) || 0,
        maxFeeAmount: parseFloat(avgFeeAmount[0]?.maxAmount as string) || 0,
        minFeeAmount: parseFloat(avgFeeAmount[0]?.minAmount as string) || 0
      };

      return { success: true, data: stats };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch fee item stats' };
    }
  }
}