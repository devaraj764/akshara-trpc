import { eq, and, sql, asc, inArray, or } from 'drizzle-orm';
import db from '../db/index.js';
import { 
  feeTypes,
  organizations,
  feeItems
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreateFeeTypeData {
  organizationId?: number | null | undefined;
  code?: string | undefined;
  name: string;
  description?: string | undefined;
  isPrivate?: boolean | undefined;
}

export interface UpdateFeeTypeData {
  code?: string | undefined;
  name?: string | undefined;
  description?: string | undefined;
  isPrivate?: boolean | undefined;
}

export interface GetFeeTypesOptions {
  organizationId?: number | undefined;
  includeDeleted?: boolean | undefined;
  includePrivate?: boolean | undefined;
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
            const currentEnabled = orgResult[0]?.enabledFeetypes || [];
            const newEnabled = [...currentEnabled, result[0]?.id].filter(id => id !== undefined);
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

  // Get enabled fee types for an organization (including deleted ones for restore functionality)
  static async getEnabledFeeTypes(organizationId: number): Promise<ServiceResponse<any[]>> {
    try {
      console.log('getEnabledFeeTypes called with organizationId:', organizationId);
      
      // Get enabled fee type IDs from organization
      const orgResult = await db.select({ enabledFeetypes: organizations.enabledFeetypes })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      console.log('Organization result (fee types):', orgResult);

      if (orgResult.length === 0) {
        return { success: false, error: 'Organization not found' };
      }

      const enabledIds = orgResult[0]?.enabledFeetypes || [];
      console.log('Enabled fee type IDs:', enabledIds);
      
      // Include ALL fee types that either:
      // 1. Are in the enabled list (global + enabled private fee types)
      // 2. OR belong to this organization (all org fee types including deleted ones)
      const conditions = [];
      
      // Add enabled fee types condition
      if (enabledIds.length > 0) {
        conditions.push(inArray(feeTypes.id, enabledIds));
        console.log('Added condition for enabled fee types');
      }
      
      // Add organization-owned fee types condition (including deleted ones)
      conditions.push(eq(feeTypes.organizationId, organizationId));
      console.log('Added condition for ALL organization fee types');
      
      // Use OR to combine both conditions
      const finalCondition = conditions.length > 1 ? or(...conditions) : conditions[0];
      console.log('Using OR condition to combine enabled + organization fee types');

      // Fetch the fee types
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
        .where(finalCondition)
        .orderBy(feeTypes.isDeleted, asc(feeTypes.name));

      console.log('Query result (fee types):', result.length, 'fee types found');
      console.log('Result preview (fee types):', result.map(f => ({ id: f.id, name: f.name, isDeleted: f.isDeleted, organizationId: f.organizationId })));

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error in getEnabledFeeTypes:', error);
      return { success: false, error: error.message || 'Failed to fetch enabled fee types' };
    }
  }

  // Restore fee type and add back to enabled list
  static async restore(id: number, organizationId?: number): Promise<ServiceResponse<any>> {
    try {
      console.log('Restoring fee type with ID:', id);
      
      // First get the fee type to check if it exists and get organization info
      const feeTypeResult = await db.select({
        id: feeTypes.id,
        name: feeTypes.name,
        organizationId: feeTypes.organizationId,
        isDeleted: feeTypes.isDeleted,
        isPrivate: feeTypes.isPrivate
      })
      .from(feeTypes)
      .where(eq(feeTypes.id, id))
      .limit(1);

      if (feeTypeResult.length === 0) {
        return {
          success: false,
          error: 'Fee type not found'
        };
      }

      const feeType = feeTypeResult[0];
      console.log('Fee type found:', feeType);

      // For private fee types, they must be deleted to restore
      if (feeType.isPrivate && feeType.organizationId) {
        if (!feeType.isDeleted) {
          return {
            success: false,
            error: 'Private fee type is not deleted'
          };
        }
        
        // Check for name conflicts
        const existingFeeType = await db.select()
          .from(feeTypes)
          .where(and(
            eq(feeTypes.name, feeType.name),
            eq(feeTypes.organizationId, feeType.organizationId),
            eq(feeTypes.isDeleted, false)
          ))
          .limit(1);
          
        if (existingFeeType.length > 0) {
          return {
            success: false,
            error: 'A fee type with this name already exists in the organization'
          };
        }
      }

      // For global fee types, we need organizationId to add them back to enabled list
      if (!feeType.isPrivate && !organizationId) {
        return {
          success: false,
          error: 'Organization ID is required to restore global fee type'
        };
      }

      // Use transaction to restore fee type and add to enabled list
      const result = await db.transaction(async (tx) => {
        let restoredFeeType = feeType;
        
        // Step 1: For private fee types, restore the fee type (set isDeleted = false)
        if (feeType.isPrivate && feeType.organizationId && feeType.isDeleted) {
          const restored = await tx.update(feeTypes)
            .set({ 
              isDeleted: false,
              deletedAt: null,
              updatedAt: sql`CURRENT_TIMESTAMP`
            })
            .where(eq(feeTypes.id, id))
            .returning();

          console.log('Private fee type restored:', restored[0]);
          restoredFeeType = restored[0];
        }

        // Step 2: Add fee type back to organization's enabled list
        const targetOrgId = organizationId || feeType.organizationId;
        if (targetOrgId) {
          const orgResult = await tx.select({ enabledFeetypes: organizations.enabledFeetypes })
            .from(organizations)
            .where(eq(organizations.id, targetOrgId))
            .limit(1);

          if (orgResult && orgResult[0]) {
            const currentEnabled = orgResult[0].enabledFeetypes || [];
            
            // Only add if not already in enabled list
            if (!currentEnabled.includes(id)) {
              const newEnabled = [...currentEnabled, id];
              
              await tx.update(organizations)
                .set({ enabledFeetypes: newEnabled })
                .where(eq(organizations.id, targetOrgId));
                
              console.log('Added fee type to enabled list for organization:', targetOrgId);
            } else {
              console.log('Fee type already in enabled list');
            }
          }
        }

        return restoredFeeType;
      });

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('Error in restore (fee types):', error);
      return {
        success: false,
        error: error.message || 'Failed to restore fee type'
      };
    }
  }

  // Get global (system-wide) fee types
  static async getGlobalFeeTypes(): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      includeDeleted: false,
      includePrivate: false
    });
  }

  // Add fee types to organization's enabled list
  static async addToEnabledFeeTypes(organizationId: number, feeTypeIds: number[]): Promise<ServiceResponse<any>> {
    try {
      return await db.transaction(async (tx) => {
        // Get current enabled fee types
        const orgResult = await tx.select({ enabledFeetypes: organizations.enabledFeetypes })
          .from(organizations)
          .where(eq(organizations.id, organizationId))
          .limit(1);

        if (orgResult.length === 0) {
          return { success: false, error: 'Organization not found' };
        }

        const currentEnabled = orgResult[0]?.enabledFeetypes || [];
        const newEnabled = [...new Set([...currentEnabled, ...feeTypeIds])]; // Remove duplicates

        // Update organization with new enabled fee types
        await tx.update(organizations)
          .set({ enabledFeetypes: newEnabled })
          .where(eq(organizations.id, organizationId));

        return { success: true, data: { enabledFeetypes: newEnabled } };
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to add fee types to enabled list' };
    }
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

  // Check removal info - determines if fee type should be deleted or just removed from enabled list
  static async checkRemoval(feeTypeId: number, organizationId: number): Promise<ServiceResponse<any>> {
    try {
      // First, get the fee type to check if it's private or global
      const feeTypeResult = await this.getById(feeTypeId);
      if (!feeTypeResult.success) {
        return { success: false, error: 'Fee type not found' };
      }

      const feeType = feeTypeResult.data;
      const isPrivate = feeType.organizationId !== null;
      
      // Check if fee type is currently used by any fee items
      const usageResult = await db.select({
        count: sql`COUNT(*)`.as('count')
      })
        .from(feeItems)
        .where(
          and(
            eq(feeItems.feeTypeId, feeTypeId),
            eq(feeItems.organizationId, organizationId),
            eq(feeItems.isDeleted, false)
          )
        );

      const usageCount = parseInt(usageResult[0]?.count as string) || 0;
      const hasUsage = usageCount > 0;

      let willDelete = false;
      let message = '';

      if (isPrivate) {
        // Check if user belongs to same organization
        if (feeType.organizationId === organizationId) {
          willDelete = true;
          message = hasUsage 
            ? `This private fee type will be permanently deleted. ${usageCount} fee item${usageCount !== 1 ? 's' : ''} currently use this type.`
            : 'This private fee type will be permanently deleted from your organization.';
        } else {
          return { 
            success: false, 
            error: 'You do not have permission to delete this fee type' 
          };
        }
      } else {
        // Global fee type - just remove from enabled list
        willDelete = false;
        message = hasUsage
          ? `This fee type will be removed from your organization's enabled types. ${usageCount} fee item${usageCount !== 1 ? 's' : ''} currently use this type and should be reassigned.`
          : 'This fee type will be removed from your organization\'s enabled types.';
      }

      return {
        success: true,
        data: {
          willDelete,
          hasUsage,
          usageCount,
          message,
          isPrivate,
          feeTypeName: feeType.name
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to check removal info' };
    }
  }

  // Remove or delete fee type based on ownership and usage
  static async removeOrDelete(feeTypeId: number, organizationId: number): Promise<ServiceResponse<any>> {
    try {
      return await db.transaction(async (tx) => {
        // First check what action should be taken
        const checkResult = await this.checkRemoval(feeTypeId, organizationId);
        if (!checkResult.success) {
          return checkResult;
        }

        const { willDelete, hasUsage, usageCount } = checkResult.data;

        if (willDelete) {
          // Private fee type - delete it entirely
          if (hasUsage) {
            // First, check if we should prevent deletion due to usage
            // For now, we'll allow deletion but could add a force flag in the future
            console.warn(`Deleting fee type ${feeTypeId} that is used by ${usageCount} fee items`);
          }

          // Remove from all organizations' enabled lists first
          const orgsWithThisFeeType = await tx.select({
            id: organizations.id,
            enabledFeetypes: organizations.enabledFeetypes
          })
            .from(organizations)
            .where(sql`${feeTypeId} = ANY(${organizations.enabledFeetypes})`);

          for (const org of orgsWithThisFeeType) {
            const updatedEnabled = (org.enabledFeetypes || []).filter(id => id !== feeTypeId);
            await tx.update(organizations)
              .set({ enabledFeetypes: updatedEnabled })
              .where(eq(organizations.id, org.id));
          }

          // Soft delete the fee type
          const deleteResult = await tx.update(feeTypes)
            .set({ isDeleted: true })
            .where(eq(feeTypes.id, feeTypeId))
            .returning();

          return {
            success: true,
            data: {
              action: 'deleted',
              feeType: deleteResult[0],
              message: `Fee type permanently deleted${hasUsage ? ` (was used by ${usageCount} fee items)` : ''}`
            }
          };
        } else {
          // Global fee type - just remove from organization's enabled list
          const orgResult = await tx.select({ enabledFeetypes: organizations.enabledFeetypes })
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1);

          if (orgResult.length === 0) {
            return { success: false, error: 'Organization not found' };
          }

          const currentEnabled = orgResult[0]?.enabledFeetypes || [];
          const updatedEnabled = currentEnabled.filter(id => id !== feeTypeId);

          await tx.update(organizations)
            .set({ enabledFeetypes: updatedEnabled })
            .where(eq(organizations.id, organizationId));

          return {
            success: true,
            data: {
              action: 'removed',
              enabledFeetypes: updatedEnabled,
              message: `Fee type removed from organization${hasUsage ? ` (was used by ${usageCount} fee items)` : ''}`
            }
          };
        }
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to remove or delete fee type' };
    }
  }
}