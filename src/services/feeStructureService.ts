// DEPRECATED: FeeStructures table has been removed from the schema
// Use FeeItemsService and FeeTypesService instead

import type { ServiceResponse } from '../types.db.js';

export interface CreateFeeStructureData {
  branchId?: number | null | undefined;
  name: string;
  description?: string | undefined;
  academicYearId: number;
  feeItems: CreateFeeItemData[];
}

export interface CreateFeeItemData {
  name: string;
  amountPaise: number;
  isMandatory?: boolean;
  enabledClasses?: number[];
  feeTypeId: number;
}

export interface UpdateFeeStructureData {
  name?: string | undefined;
  description?: string | undefined;
  academicYearId?: number | undefined;
  feeItems?: CreateFeeItemData[] | undefined;
}

export interface GetFeeStructuresOptions {
  branchId?: number | undefined;
  academicYearId?: number | undefined;
  organizationId?: number | undefined;
  includeDeleted?: boolean | undefined;
}

const DEPRECATION_ERROR = 'Fee structures are no longer supported. Use FeeItemsService and FeeTypesService instead.';

export class FeeStructureService {
  static async create(data: CreateFeeStructureData): Promise<ServiceResponse<any>> {
    return { success: false, error: DEPRECATION_ERROR };
  }

  static async getAll(options: GetFeeStructuresOptions = {}): Promise<ServiceResponse<any[]>> {
    return { success: false, error: DEPRECATION_ERROR };
  }

  static async getById(id: number): Promise<ServiceResponse<any>> {
    return { success: false, error: DEPRECATION_ERROR };
  }

  static async update(id: number, data: UpdateFeeStructureData): Promise<ServiceResponse<any>> {
    return { success: false, error: DEPRECATION_ERROR };
  }

  static async delete(id: number): Promise<ServiceResponse<any>> {
    return { success: false, error: DEPRECATION_ERROR };
  }

  static async duplicate(id: number, data: { name: string; academicYearId?: number }): Promise<ServiceResponse<any>> {
    return { success: false, error: DEPRECATION_ERROR };
  }

  static async getOrganizationFeeStructures(organizationId: number, academicYearId?: number): Promise<ServiceResponse<any[]>> {
    return { success: false, error: DEPRECATION_ERROR };
  }

  static async getBranchFeeStructures(branchId: number, academicYearId?: number): Promise<ServiceResponse<any[]>> {
    return { success: false, error: DEPRECATION_ERROR };
  }

  static async getFeeStructureStats(organizationId?: number, branchId?: number): Promise<ServiceResponse<any>> {
    return { success: false, error: DEPRECATION_ERROR };
  }
}