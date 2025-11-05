import { eq, and, sql } from 'drizzle-orm';
import db from '../db/index.js';
import { organizations, addresses } from '../db/schema.js';
import { ServiceResponse } from '../types.db.js';

export interface OrganizationSetup {
  academic_years?: any[];
  subjects?: any[];
  departments?: any[];
  grades?: any[];
  fee_types?: any[];
  fee_items?: any[];
}

export interface CreateOrganizationData {
  name: string;
  registrationNumber?: string;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    pincode?: string;
    cityVillage: string;
    district: string;
    state: string;
    country?: string;
  };
  contactEmail?: string;
  contactPhone?: string;
  status?: string;
  setup?: OrganizationSetup;
}

export interface UpdateOrganizationData {
  name?: string;
  registrationNumber?: string;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    pincode?: string;
    cityVillage: string;
    district: string;
    state: string;
    country?: string;
  };
  contactEmail?: string;
  contactPhone?: string;
  status?: string;
  enabledDepartments?: number[];
  enabledSubjects?: number[];
  enabledClasses?: number[];
  enabledFeetypes?: number[];
  setup?: OrganizationSetup;
}

export class OrganizationService {
  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: organizations.id,
        name: organizations.name,
        registrationNumber: organizations.registrationNumber,
        addressId: organizations.addressId,
        contactEmail: organizations.contactEmail,
        contactPhone: organizations.contactPhone,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        meta: organizations.meta,
        status: organizations.status,
        enabledDepartments: organizations.enabledDepartments,
        enabledSubjects: organizations.enabledSubjects,
        enabledClasses: organizations.enabledClasses,
        enabledFeetypes: organizations.enabledFeetypes,
        // Address data
        address: {
          addressLine1: addresses.addressLine1,
          addressLine2: addresses.addressLine2,
          pincode: addresses.pincode,
          cityVillage: addresses.cityVillage,
          district: addresses.district,
          state: addresses.state,
          country: addresses.country,
        }
      })
      .from(organizations)
      .leftJoin(addresses, eq(organizations.addressId, addresses.id))
      .where(eq(organizations.id, id))
      .limit(1);

      if (result.length === 0) {
        return {
          success: false,
          error: 'Organization not found'
        };
      }

      const organization = result[0];
      // Clean up address if no addressId
      const cleanedOrganization = {
        ...organization,
        address: organization.addressId ? organization.address : undefined
      };

      return {
        success: true,
        data: cleanedOrganization
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch organization'
      };
    }
  }

  static async getAll(): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select({
        id: organizations.id,
        name: organizations.name,
        registrationNumber: organizations.registrationNumber,
        addressId: organizations.addressId,
        contactEmail: organizations.contactEmail,
        contactPhone: organizations.contactPhone,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        meta: organizations.meta,
        status: organizations.status,
        enabledDepartments: organizations.enabledDepartments,
        enabledSubjects: organizations.enabledSubjects,
        enabledClasses: organizations.enabledClasses,
        enabledFeetypes: organizations.enabledFeetypes,
      })
      .from(organizations)
      .orderBy(organizations.name);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch organizations'
      };
    }
  }

  static async create(data: CreateOrganizationData): Promise<ServiceResponse<any>> {
    try {
      // Validate required fields
      if (!data.name) {
        return { success: false, error: 'Organization name is required' };
      }

      return await db.transaction(async (tx) => {
        // Create address if provided
        let addressId: number | undefined;
        if (data.address) {
          const addressResult = await tx.insert(addresses).values({
            addressLine1: data.address.addressLine1,
            addressLine2: data.address.addressLine2 || null,
            pincode: data.address.pincode || null,
            cityVillage: data.address.cityVillage,
            district: data.address.district,
            state: data.address.state,
            country: data.address.country || 'India',
          }).returning({ id: addresses.id });
          addressId = addressResult[0]?.id;
        }

        // Prepare meta object with setup if provided
        const metaData: any = {};
        if (data.setup) {
          metaData.setup = data.setup;
        }

        // Create organization
        const result = await tx.insert(organizations).values({
          name: data.name,
          registrationNumber: data.registrationNumber || null,
          contactEmail: data.contactEmail || null,
          contactPhone: data.contactPhone || null,
          meta: Object.keys(metaData).length > 0 ? metaData : null,
          status: data.status || 'ACTIVE',
          addressId: addressId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).returning();

        if (result.length === 0) {
          throw new Error('Failed to create organization');
        }

        return {
          success: true,
          data: result[0]
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create organization'
      };
    }
  }

  static async update(id: number, data: UpdateOrganizationData): Promise<ServiceResponse<any>> {
    try {
      // Check if organization exists
      const existingOrganization = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
      
      if (!existingOrganization || !existingOrganization[0]) {
        return { success: false, error: 'Organization not found' };
      }

      return await db.transaction(async (tx) => {
        // Handle address update if provided
        let addressId: number | undefined = existingOrganization[0]?.addressId || undefined;
        if (data.address) {
          if (addressId) {
            // Update existing address
            await tx.update(addresses).set({
              addressLine1: data.address.addressLine1,
              addressLine2: data.address.addressLine2 || null,
              pincode: data.address.pincode || null,
              cityVillage: data.address.cityVillage,
              district: data.address.district,
              state: data.address.state,
              country: data.address.country || 'India',
              updatedAt: new Date().toISOString()
            }).where(eq(addresses.id, addressId));
          } else {
            // Create new address
            const addressResult = await tx.insert(addresses).values({
              addressLine1: data.address.addressLine1,
              addressLine2: data.address.addressLine2 || null,
              pincode: data.address.pincode || null,
              cityVillage: data.address.cityVillage,
              district: data.address.district,
              state: data.address.state,
              country: data.address.country || 'India',
            }).returning({ id: addresses.id });
            addressId = addressResult[0]?.id;
          }
        }

        const updateData: any = {
          updatedAt: new Date().toISOString()
        };
        
        if (data.name !== undefined) updateData.name = data.name;
        if (data.registrationNumber !== undefined) updateData.registrationNumber = data.registrationNumber;
        if (addressId !== undefined) updateData.addressId = addressId;
        if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
        if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.enabledDepartments !== undefined) updateData.enabledDepartments = data.enabledDepartments;
        if (data.enabledSubjects !== undefined) updateData.enabledSubjects = data.enabledSubjects;
        if (data.enabledClasses !== undefined) updateData.enabledClasses = data.enabledClasses;
        if (data.enabledFeetypes !== undefined) updateData.enabledFeetypes = data.enabledFeetypes;

        // Handle meta updates (setup)
        if (data.setup !== undefined) {
          // Get current meta to merge
          const currentMeta = existingOrganization[0].meta || {};
          const newMeta: any = { ...currentMeta };
          
          newMeta.setup = data.setup;
          
          updateData.meta = newMeta;
        }

        const result = await tx.update(organizations)
          .set(updateData)
          .where(eq(organizations.id, id))
          .returning();

        if (result.length === 0) {
          throw new Error('Failed to update organization');
        }

        return {
          success: true,
          data: result[0]
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update organization'
      };
    }
  }

  static async delete(id: number): Promise<ServiceResponse<void>> {
    return { success: false, error: 'Not implemented' };
  }

  static async getStats(id: number): Promise<ServiceResponse<any>> {
    return { success: false, error: 'Not implemented' };
  }

  // Methods for managing enabled departments and subjects
  static async updateEnabledDepartments(id: number, departmentIds: number[]): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(organizations)
        .set({ 
          enabledDepartments: departmentIds,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(organizations.id, id))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Organization not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update enabled departments'
      };
    }
  }

  static async updateEnabledSubjects(id: number, subjectIds: number[]): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(organizations)
        .set({ 
          enabledSubjects: subjectIds,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(organizations.id, id))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Organization not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update enabled subjects'
      };
    }
  }

  static async addEnabledDepartment(id: number, departmentId: number): Promise<ServiceResponse<any>> {
    try {
      // Get current enabled departments
      const current = await this.getById(id);
      if (!current.success) {
        return current;
      }

      const currentIds = current.data.enabledDepartments || [];
      if (currentIds.includes(departmentId)) {
        return {
          success: true,
          data: current.data
        };
      }

      const newIds = [...currentIds, departmentId];
      return this.updateEnabledDepartments(id, newIds);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add enabled department'
      };
    }
  }

  static async removeEnabledDepartment(id: number, departmentId: number): Promise<ServiceResponse<any>> {
    try {
      // Get current enabled departments
      const current = await this.getById(id);
      if (!current.success) {
        return current;
      }

      const currentIds = current.data.enabledDepartments || [];
      const newIds = currentIds.filter((dId: number) => dId !== departmentId);
      
      return this.updateEnabledDepartments(id, newIds);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove enabled department'
      };
    }
  }

  static async addEnabledSubject(id: number, subjectId: number): Promise<ServiceResponse<any>> {
    try {
      // Get current enabled subjects
      const current = await this.getById(id);
      if (!current.success) {
        return current;
      }

      const currentIds = current.data.enabledSubjects || [];
      if (currentIds.includes(subjectId)) {
        return {
          success: true,
          data: current.data
        };
      }

      const newIds = [...currentIds, subjectId];
      return this.updateEnabledSubjects(id, newIds);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add enabled subject'
      };
    }
  }

  static async removeEnabledSubject(id: number, subjectId: number): Promise<ServiceResponse<any>> {
    try {
      // Get current enabled subjects
      const current = await this.getById(id);
      if (!current.success) {
        return current;
      }

      const currentIds = current.data.enabledSubjects || [];
      const newIds = currentIds.filter((sId: number) => sId !== subjectId);
      
      return this.updateEnabledSubjects(id, newIds);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove enabled subject'
      };
    }
  }

  // Methods for managing enabled grades
  static async updateEnabledClasses(id: number, classIds: number[]): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(organizations)
        .set({ 
          enabledClasses: classIds,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(organizations.id, id))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Organization not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update enabled grades'
      };
    }
  }

  static async addEnabledClass(id: number, classId: number): Promise<ServiceResponse<any>> {
    try {
      // Get current enabled grades
      const current = await this.getById(id);
      if (!current.success) {
        return current;
      }

      const currentIds = current.data.enabledClasses || [];
      if (currentIds.includes(classId)) {
        return {
          success: true,
          data: current.data
        };
      }

      const newIds = [...currentIds, classId];
      return this.updateEnabledClasses(id, newIds);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add enabled grade'
      };
    }
  }

  static async removeEnabledClass(id: number, classId: number): Promise<ServiceResponse<any>> {
    try {
      // Get current enabled grades
      const current = await this.getById(id);
      if (!current.success) {
        return current;
      }

      const currentIds = current.data.enabledClasses || [];
      const newIds = currentIds.filter((cId: number) => cId !== classId);
      
      return this.updateEnabledClasses(id, newIds);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove enabled grade'
      };
    }
  }

  // Methods for managing enabled fee types
  static async updateEnabledFeetypes(id: number, feeTypeIds: number[]): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(organizations)
        .set({ 
          enabledFeetypes: feeTypeIds,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(organizations.id, id))
        .returning();

      if (result.length === 0) {
        return {
          success: false,
          error: 'Organization not found'
        };
      }

      return {
        success: true,
        data: result[0]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update enabled fee types'
      };
    }
  }

  static async addEnabledFeeType(id: number, feeTypeId: number): Promise<ServiceResponse<any>> {
    try {
      // Get current enabled fee types
      const current = await this.getById(id);
      if (!current.success) {
        return current;
      }

      const currentIds = current.data.enabledFeetypes || [];
      if (currentIds.includes(feeTypeId)) {
        return {
          success: true,
          data: current.data
        };
      }

      const newIds = [...currentIds, feeTypeId];
      return this.updateEnabledFeetypes(id, newIds);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add enabled fee type'
      };
    }
  }

  static async removeEnabledFeeType(id: number, feeTypeId: number): Promise<ServiceResponse<any>> {
    try {
      // Get current enabled fee types
      const current = await this.getById(id);
      if (!current.success) {
        return current;
      }

      const currentIds = current.data.enabledFeetypes || [];
      const newIds = currentIds.filter((ftId: number) => ftId !== feeTypeId);
      
      return this.updateEnabledFeetypes(id, newIds);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove enabled fee type'
      };
    }
  }
}