import { eq, and, sql } from 'drizzle-orm';
import db from '../db/index.js';
import { organizations, addresses } from '../db/schema.js';
import { ServiceResponse } from '../types.db.js';

export interface CreateOrganizationData {
  name: string;
  registrationNumber?: string | undefined;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    pincode?: string;
    cityVillage: string;
    district: string;
    state: string;
    country?: string;
  };
  contactEmail?: string | undefined;
  contactPhone?: string | undefined;
  settings?: any;
  status?: string | undefined;
}

export interface UpdateOrganizationData {
  name?: string | undefined;
  registrationNumber?: string | undefined;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    pincode?: string;
    cityVillage: string;
    district: string;
    state: string;
    country?: string;
  };
  contactEmail?: string | undefined;
  contactPhone?: string | undefined;
  settings?: any;
  status?: string | undefined;
  enabledDepartments?: number[] | undefined;
  enabledSubjects?: number[] | undefined;
  enabledGrades?: number[] | undefined;
  enabledFeetypes?: number[] | undefined;
}

export class OrganizationService {
  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: organizations.id,
        name: organizations.name,
        registrationNumber: organizations.registrationNumber,
        address: organizations.address,
        contactEmail: organizations.contactEmail,
        contactPhone: organizations.contactPhone,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        settings: organizations.settings,
        status: organizations.status,
        enabledDepartments: organizations.enabledDepartments,
        enabledSubjects: organizations.enabledSubjects,
        enabledGrades: organizations.enabledGrades,
        enabledFeetypes: organizations.enabledFeetypes,
      })
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

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
        address: organizations.address,
        contactEmail: organizations.contactEmail,
        contactPhone: organizations.contactPhone,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        settings: organizations.settings,
        status: organizations.status,
        enabledDepartments: organizations.enabledDepartments,
        enabledSubjects: organizations.enabledSubjects,
        enabledGrades: organizations.enabledGrades,
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

        // Create organization
        const result = await tx.insert(organizations).values({
          name: data.name,
          registrationNumber: data.registrationNumber || null,
          contactEmail: data.contactEmail || null,
          contactPhone: data.contactPhone || null,
          settings: data.settings || null,
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
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.registrationNumber !== undefined) updateData.registrationNumber = data.registrationNumber;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
      if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
      if (data.settings !== undefined) updateData.settings = data.settings;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.enabledDepartments !== undefined) updateData.enabledDepartments = data.enabledDepartments;
      if (data.enabledSubjects !== undefined) updateData.enabledSubjects = data.enabledSubjects;
      if (data.enabledGrades !== undefined) updateData.enabledGrades = data.enabledGrades;
      if (data.enabledFeetypes !== undefined) updateData.enabledFeetypes = data.enabledFeetypes;

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          error: 'No fields to update'
        };
      }

      updateData.updatedAt = sql`CURRENT_TIMESTAMP`;

      const result = await db.update(organizations)
        .set(updateData)
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
  static async updateEnabledGrades(id: number, gradeIds: number[]): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(organizations)
        .set({ 
          enabledGrades: gradeIds,
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

  static async addEnabledGrade(id: number, gradeId: number): Promise<ServiceResponse<any>> {
    try {
      // Get current enabled grades
      const current = await this.getById(id);
      if (!current.success) {
        return current;
      }

      const currentIds = current.data.enabledGrades || [];
      if (currentIds.includes(gradeId)) {
        return {
          success: true,
          data: current.data
        };
      }

      const newIds = [...currentIds, gradeId];
      return this.updateEnabledGrades(id, newIds);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add enabled grade'
      };
    }
  }

  static async removeEnabledGrade(id: number, gradeId: number): Promise<ServiceResponse<any>> {
    try {
      // Get current enabled grades
      const current = await this.getById(id);
      if (!current.success) {
        return current;
      }

      const currentIds = current.data.enabledGrades || [];
      const newIds = currentIds.filter((gId: number) => gId !== gradeId);
      
      return this.updateEnabledGrades(id, newIds);
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