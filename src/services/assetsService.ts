import { eq, and, sql, desc } from 'drizzle-orm';
import db from '../db/index.js';
import { 
  assets,
  organizations,
  branches
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreateAssetData {
  organizationId?: number;
  branchId?: number;
  assetCategory: string;
  assetName: string;
  assetCode?: string;
  description?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentValue?: number;
  location?: string;
  assignedTo?: number;
  assignedToType?: string;
  conditionStatus?: string;
  maintenanceSchedule?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  warrantyExpiry?: string;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateAssetData {
  assetCategory?: string;
  assetName?: string;
  assetCode?: string;
  description?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentValue?: number;
  location?: string;
  assignedTo?: number;
  assignedToType?: string;
  conditionStatus?: string;
  maintenanceSchedule?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  warrantyExpiry?: string;
  isActive?: boolean;
  notes?: string;
}

export interface GetAssetsOptions {
  organizationId?: number;
  branchId?: number;
  assetCategory?: string;
  conditionStatus?: string;
  isActive?: boolean;
  assignedTo?: number;
  assignedToType?: string;
  location?: string;
}

export class AssetsService {
  static async create(data: CreateAssetData): Promise<ServiceResponse<any>> {
    try {
      // Generate asset code if not provided
      let assetCode = data.assetCode;
      if (!assetCode) {
        const categoryPrefix = data.assetCategory.substring(0, 3).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        assetCode = `${categoryPrefix}${timestamp}`;
      }

      const result = await db.insert(assets).values({
        organizationId: data.organizationId || null,
        branchId: data.branchId || null,
        assetCategory: data.assetCategory,
        assetName: data.assetName,
        assetCode: assetCode,
        description: data.description || null,
        brand: data.brand || null,
        model: data.model || null,
        serialNumber: data.serialNumber || null,
        purchaseDate: data.purchaseDate || null,
        purchaseCost: data.purchaseCost || null,
        currentValue: data.currentValue || null,
        location: data.location || null,
        assignedTo: data.assignedTo || null,
        assignedToType: data.assignedToType || null,
        conditionStatus: data.conditionStatus || 'GOOD',
        maintenanceSchedule: data.maintenanceSchedule || null,
        lastMaintenance: data.lastMaintenance || null,
        nextMaintenance: data.nextMaintenance || null,
        warrantyExpiry: data.warrantyExpiry || null,
        isActive: data.isActive ?? true,
        notes: data.notes || null
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      if (error.constraint?.includes('uq_asset_code_branch')) {
        return { success: false, error: 'Asset code already exists in this branch' };
      }
      return { success: false, error: error.message || 'Failed to create asset' };
    }
  }

  static async getAll(options: GetAssetsOptions = {}): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [];

      if (options.organizationId) {
        whereConditions.push(eq(assets.organizationId, options.organizationId));
      }

      if (options.branchId) {
        whereConditions.push(eq(assets.branchId, options.branchId));
      }

      if (options.assetCategory) {
        whereConditions.push(eq(assets.assetCategory, options.assetCategory));
      }

      if (options.conditionStatus) {
        whereConditions.push(eq(assets.conditionStatus, options.conditionStatus));
      }

      if (options.isActive !== undefined) {
        whereConditions.push(eq(assets.isActive, options.isActive));
      }

      if (options.assignedTo) {
        whereConditions.push(eq(assets.assignedTo, options.assignedTo));
      }

      if (options.assignedToType) {
        whereConditions.push(eq(assets.assignedToType, options.assignedToType));
      }

      if (options.location) {
        whereConditions.push(eq(assets.location, options.location));
      }

      const result = await db.select({
        id: assets.id,
        organizationId: assets.organizationId,
        branchId: assets.branchId,
        assetCategory: assets.assetCategory,
        assetName: assets.assetName,
        assetCode: assets.assetCode,
        description: assets.description,
        brand: assets.brand,
        model: assets.model,
        serialNumber: assets.serialNumber,
        purchaseDate: assets.purchaseDate,
        purchaseCost: assets.purchaseCost,
        currentValue: assets.currentValue,
        location: assets.location,
        assignedTo: assets.assignedTo,
        assignedToType: assets.assignedToType,
        conditionStatus: assets.conditionStatus,
        maintenanceSchedule: assets.maintenanceSchedule,
        lastMaintenance: assets.lastMaintenance,
        nextMaintenance: assets.nextMaintenance,
        warrantyExpiry: assets.warrantyExpiry,
        isActive: assets.isActive,
        notes: assets.notes,
        createdAt: assets.createdAt,
        updatedAt: assets.updatedAt,
        // Organization info
        organizationName: organizations.name,
        // Branch info
        branchName: branches.name
      })
        .from(assets)
        .leftJoin(organizations, eq(assets.organizationId, organizations.id))
        .leftJoin(branches, eq(assets.branchId, branches.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(assets.assetCategory, assets.assetName);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch assets' };
    }
  }

  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: assets.id,
        organizationId: assets.organizationId,
        branchId: assets.branchId,
        assetCategory: assets.assetCategory,
        assetName: assets.assetName,
        assetCode: assets.assetCode,
        description: assets.description,
        brand: assets.brand,
        model: assets.model,
        serialNumber: assets.serialNumber,
        purchaseDate: assets.purchaseDate,
        purchaseCost: assets.purchaseCost,
        currentValue: assets.currentValue,
        location: assets.location,
        assignedTo: assets.assignedTo,
        assignedToType: assets.assignedToType,
        conditionStatus: assets.conditionStatus,
        maintenanceSchedule: assets.maintenanceSchedule,
        lastMaintenance: assets.lastMaintenance,
        nextMaintenance: assets.nextMaintenance,
        warrantyExpiry: assets.warrantyExpiry,
        isActive: assets.isActive,
        notes: assets.notes,
        createdAt: assets.createdAt,
        updatedAt: assets.updatedAt,
        // Organization info
        organizationName: organizations.name,
        // Branch info
        branchName: branches.name
      })
        .from(assets)
        .leftJoin(organizations, eq(assets.organizationId, organizations.id))
        .leftJoin(branches, eq(assets.branchId, branches.id))
        .where(eq(assets.id, id))
        .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Asset not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch asset' };
    }
  }

  static async update(id: number, data: UpdateAssetData): Promise<ServiceResponse<any>> {
    try {
      const updateData: any = {};

      if (data.assetCategory !== undefined) updateData.assetCategory = data.assetCategory;
      if (data.assetName !== undefined) updateData.assetName = data.assetName;
      if (data.assetCode !== undefined) updateData.assetCode = data.assetCode;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.brand !== undefined) updateData.brand = data.brand;
      if (data.model !== undefined) updateData.model = data.model;
      if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber;
      if (data.purchaseDate !== undefined) updateData.purchaseDate = data.purchaseDate;
      if (data.purchaseCost !== undefined) updateData.purchaseCost = data.purchaseCost;
      if (data.currentValue !== undefined) updateData.currentValue = data.currentValue;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
      if (data.assignedToType !== undefined) updateData.assignedToType = data.assignedToType;
      if (data.conditionStatus !== undefined) updateData.conditionStatus = data.conditionStatus;
      if (data.maintenanceSchedule !== undefined) updateData.maintenanceSchedule = data.maintenanceSchedule;
      if (data.lastMaintenance !== undefined) updateData.lastMaintenance = data.lastMaintenance;
      if (data.nextMaintenance !== undefined) updateData.nextMaintenance = data.nextMaintenance;
      if (data.warrantyExpiry !== undefined) updateData.warrantyExpiry = data.warrantyExpiry;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.notes !== undefined) updateData.notes = data.notes;

      if (Object.keys(updateData).length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      updateData.updatedAt = sql`CURRENT_TIMESTAMP`;

      const result = await db.update(assets)
        .set(updateData)
        .where(eq(assets.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Asset not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      if (error.constraint?.includes('uq_asset_code_branch')) {
        return { success: false, error: 'Asset code already exists in this branch' };
      }
      return { success: false, error: error.message || 'Failed to update asset' };
    }
  }

  static async delete(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(assets)
        .set({
          isActive: false,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(assets.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Asset not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete asset' };
    }
  }

  static async assignAsset(id: number, assignedTo: number, assignedToType: string): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(assets)
        .set({
          assignedTo,
          assignedToType,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(assets.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Asset not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to assign asset' };
    }
  }

  static async unassignAsset(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(assets)
        .set({
          assignedTo: null,
          assignedToType: null,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(assets.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Asset not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to unassign asset' };
    }
  }

  static async updateMaintenance(id: number, lastMaintenance: string, nextMaintenance?: string): Promise<ServiceResponse<any>> {
    try {
      const updateData: any = {
        lastMaintenance,
        updatedAt: sql`CURRENT_TIMESTAMP`
      };

      if (nextMaintenance) {
        updateData.nextMaintenance = nextMaintenance;
      }

      const result = await db.update(assets)
        .set(updateData)
        .where(eq(assets.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Asset not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update maintenance' };
    }
  }

  // Organization Level Methods
  static async getOrganizationAssets(organizationId: number, isActive: boolean = true): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      organizationId,
      isActive
    });
  }

  static async getOrganizationAssetsByCategory(organizationId: number, assetCategory: string): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      organizationId,
      assetCategory,
      isActive: true
    });
  }

  // Branch Level Methods
  static async getBranchAssets(branchId: number, isActive: boolean = true): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      branchId,
      isActive
    });
  }

  static async getMaintenanceDue(daysAhead: number = 30, organizationId?: number, branchId?: number): Promise<ServiceResponse<any[]>> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const whereConditions = [
        eq(assets.isActive, true),
        sql`${assets.nextMaintenance} <= ${futureDate.toISOString()}`,
        sql`${assets.nextMaintenance} >= CURRENT_DATE`
      ];

      if (organizationId) {
        whereConditions.push(eq(assets.organizationId, organizationId));
      }

      if (branchId) {
        whereConditions.push(eq(assets.branchId, branchId));
      }

      const result = await db.select({
        id: assets.id,
        assetName: assets.assetName,
        assetCode: assets.assetCode,
        assetCategory: assets.assetCategory,
        location: assets.location,
        conditionStatus: assets.conditionStatus,
        lastMaintenance: assets.lastMaintenance,
        nextMaintenance: assets.nextMaintenance,
        organizationName: organizations.name,
        branchName: branches.name
      })
        .from(assets)
        .leftJoin(organizations, eq(assets.organizationId, organizations.id))
        .leftJoin(branches, eq(assets.branchId, branches.id))
        .where(and(...whereConditions))
        .orderBy(assets.nextMaintenance);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch maintenance due assets' };
    }
  }

  static async getWarrantyExpiring(daysAhead: number = 30, organizationId?: number, branchId?: number): Promise<ServiceResponse<any[]>> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const whereConditions = [
        eq(assets.isActive, true),
        sql`${assets.warrantyExpiry} <= ${futureDate.toISOString()}`,
        sql`${assets.warrantyExpiry} >= CURRENT_DATE`
      ];

      if (organizationId) {
        whereConditions.push(eq(assets.organizationId, organizationId));
      }

      if (branchId) {
        whereConditions.push(eq(assets.branchId, branchId));
      }

      const result = await db.select({
        id: assets.id,
        assetName: assets.assetName,
        assetCode: assets.assetCode,
        assetCategory: assets.assetCategory,
        brand: assets.brand,
        model: assets.model,
        purchaseDate: assets.purchaseDate,
        warrantyExpiry: assets.warrantyExpiry,
        organizationName: organizations.name,
        branchName: branches.name
      })
        .from(assets)
        .leftJoin(organizations, eq(assets.organizationId, organizations.id))
        .leftJoin(branches, eq(assets.branchId, branches.id))
        .where(and(...whereConditions))
        .orderBy(assets.warrantyExpiry);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch warranty expiring assets' };
    }
  }

  static async getAssetsByCondition(conditionStatus: string, organizationId?: number, branchId?: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      organizationId,
      branchId,
      conditionStatus,
      isActive: true
    });
  }

  static async getUnassignedAssets(organizationId?: number, branchId?: number): Promise<ServiceResponse<any[]>> {
    try {
      const whereConditions = [
        eq(assets.isActive, true),
        sql`${assets.assignedTo} IS NULL`
      ];

      if (organizationId) {
        whereConditions.push(eq(assets.organizationId, organizationId));
      }

      if (branchId) {
        whereConditions.push(eq(assets.branchId, branchId));
      }

      const result = await db.select()
        .from(assets)
        .leftJoin(organizations, eq(assets.organizationId, organizations.id))
        .leftJoin(branches, eq(assets.branchId, branches.id))
        .where(and(...whereConditions))
        .orderBy(assets.assetCategory, assets.assetName);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch unassigned assets' };
    }
  }
}