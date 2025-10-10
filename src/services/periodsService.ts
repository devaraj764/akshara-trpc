import { eq, and, desc, asc } from 'drizzle-orm';
import db from '../db/index.js';
import { periods } from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreatePeriodData {
  branchId: number;
  name: string;
  startTime: string;
  endTime: string;
  order?: number;
  isBreak?: boolean;
}

export interface UpdatePeriodData {
  name?: string;
  startTime?: string;
  endTime?: string;
  order?: number;
  isBreak?: boolean;
}

export class PeriodsService {
  static async create(data: CreatePeriodData): Promise<ServiceResponse<any>> {
    try {
      // If no order provided, get the next order number for this branch
      let order = data.order;
      if (!order) {
        const lastPeriod = await db.select({ order: periods.order })
          .from(periods)
          .where(eq(periods.branchId, data.branchId))
          .orderBy(desc(periods.order))
          .limit(1);
        
        order = lastPeriod.length > 0 ? (lastPeriod[0].order || 0) + 1 : 1;
      }

      const result = await db.insert(periods).values({
        branchId: data.branchId,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        order,
        isBreak: data.isBreak ?? false
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create period' };
    }
  }

  static async getByBranch(branchId: number): Promise<ServiceResponse<any[]>> {
    try {
      const result = await db.select()
        .from(periods)
        .where(eq(periods.branchId, branchId))
        .orderBy(asc(periods.order));

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch periods' };
    }
  }

  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select()
        .from(periods)
        .where(eq(periods.id, id))
        .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Period not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch period' };
    }
  }

  static async update(id: number, data: UpdatePeriodData): Promise<ServiceResponse<any>> {
    try {
      const updateData: any = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.startTime !== undefined) updateData.startTime = data.startTime;
      if (data.endTime !== undefined) updateData.endTime = data.endTime;
      if (data.order !== undefined) updateData.order = data.order;
      if (data.isBreak !== undefined) updateData.isBreak = data.isBreak;

      if (Object.keys(updateData).length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      const result = await db.update(periods)
        .set(updateData)
        .where(eq(periods.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Period not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update period' };
    }
  }

  static async delete(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.delete(periods)
        .where(eq(periods.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Period not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete period' };
    }
  }

  static async reorderPeriods(branchId: number, periodsOrder: { id: number; order: number }[]): Promise<ServiceResponse<any[]>> {
    try {
      const results = [];
      
      for (const periodOrder of periodsOrder) {
        const result = await db.update(periods)
          .set({ order: periodOrder.order })
          .where(and(
            eq(periods.id, periodOrder.id),
            eq(periods.branchId, branchId)
          ))
          .returning();
        
        if (result.length > 0) {
          results.push(result[0]);
        }
      }

      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to reorder periods' };
    }
  }
}