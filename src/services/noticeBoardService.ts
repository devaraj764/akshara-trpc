import { eq, and, sql, desc } from 'drizzle-orm';
import db from '../db/index.js';
import { 
  noticeBoard,
  organizations,
  branches,
  users
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

export interface CreateNoticeData {
  organizationId?: number | undefined;
  branchId?: number | undefined;
  title: string;
  content: string;
  noticeType: string;
  priorityLevel?: string;
  targetAudience?: string[] | undefined;
  targetSections?: number[] | undefined;
  isUrgent?: boolean;
  isPublished?: boolean;
  publishDate?: string | undefined;
  expiryDate?: string | undefined;
  attachments?: any;
  authorId?: number | undefined;
}

export interface UpdateNoticeData {
  title?: string | undefined;
  content?: string | undefined;
  noticeType?: string | undefined;
  priorityLevel?: string | undefined;
  targetAudience?: string[] | undefined;
  targetSections?: number[] | undefined;
  isUrgent?: boolean | undefined;
  isPublished?: boolean | undefined;
  publishDate?: string | undefined;
  expiryDate?: string | undefined;
  attachments?: any;
  approvedBy?: number | undefined;
  approvedAt?: string | undefined;
}

export interface GetNoticesOptions {
  organizationId?: number | undefined;
  branchId?: number | undefined;
  noticeType?: string | undefined;
  priorityLevel?: string | undefined;
  isPublished?: boolean | undefined;
  isUrgent?: boolean | undefined;
  targetAudience?: string | undefined;
  includeExpired?: boolean | undefined;
}

export class NoticeBoardService {
  static async create(data: CreateNoticeData): Promise<ServiceResponse<any>> {
    try {
      const result = await db.insert(noticeBoard).values({
        organizationId: data.organizationId || null,
        branchId: data.branchId || null,
        title: data.title,
        content: data.content,
        noticeType: data.noticeType,
        priorityLevel: data.priorityLevel || 'NORMAL',
        targetAudience: data.targetAudience || [],
        targetSections: data.targetSections || [],
        isUrgent: data.isUrgent ?? false,
        isPublished: data.isPublished ?? false,
        publishDate: data.publishDate || null,
        expiryDate: data.expiryDate || null,
        attachments: data.attachments || null,
        authorId: data.authorId || null,
        readCount: 0
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create notice' };
    }
  }

  static async getAll(options: GetNoticesOptions = {}): Promise<ServiceResponse<any[]>> {
    try {
      console.log('NoticeBoard getAll called with options:', options);
      
      const whereConditions = [];

      if (options.organizationId) {
        whereConditions.push(eq(noticeBoard.organizationId, options.organizationId));
      }

      if (options.branchId) {
        whereConditions.push(eq(noticeBoard.branchId, options.branchId));
      }

      if (options.noticeType) {
        whereConditions.push(eq(noticeBoard.noticeType, options.noticeType));
      }

      if (options.priorityLevel) {
        whereConditions.push(eq(noticeBoard.priorityLevel, options.priorityLevel));
      }

      if (options.isPublished !== undefined) {
        whereConditions.push(eq(noticeBoard.isPublished, options.isPublished));
      }

      if (options.isUrgent !== undefined) {
        whereConditions.push(eq(noticeBoard.isUrgent, options.isUrgent));
      }

      if (options.targetAudience && typeof options.targetAudience === 'string' && options.targetAudience.trim() !== '') {
        try {
          whereConditions.push(sql`${noticeBoard.targetAudience} @> ARRAY[${options.targetAudience}]`);
        } catch (error) {
          console.error('Error in targetAudience query:', error);
          // Skip this condition if it fails
        }
      }

      if (!options.includeExpired) {
        try {
          whereConditions.push(
            sql`(${noticeBoard.expiryDate} IS NULL OR ${noticeBoard.expiryDate} >= CURRENT_DATE)`
          );
        } catch (error) {
          console.error('Error in expiry date query:', error);
          // Skip this condition if it fails
        }
      }

      console.log('Where conditions count:', whereConditions.length);

      let result;
      try {
        result = await db.select({
        id: noticeBoard.id,
        organizationId: noticeBoard.organizationId,
        branchId: noticeBoard.branchId,
        title: noticeBoard.title,
        content: noticeBoard.content,
        noticeType: noticeBoard.noticeType,
        priorityLevel: noticeBoard.priorityLevel,
        targetAudience: noticeBoard.targetAudience,
        targetSections: noticeBoard.targetSections,
        isUrgent: noticeBoard.isUrgent,
        isPublished: noticeBoard.isPublished,
        publishDate: noticeBoard.publishDate,
        expiryDate: noticeBoard.expiryDate,
        attachments: noticeBoard.attachments,
        authorId: noticeBoard.authorId,
        approvedBy: noticeBoard.approvedBy,
        approvedAt: noticeBoard.approvedAt,
        readCount: noticeBoard.readCount,
        createdAt: noticeBoard.createdAt,
        updatedAt: noticeBoard.updatedAt,
        // Author info
        authorName: users.displayName,
        authorEmail: users.email,
        // Organization info
        organizationName: organizations.name,
        // Branch info
        branchName: branches.name
      })
        .from(noticeBoard)
        .leftJoin(users, eq(noticeBoard.authorId, users.id))
        .leftJoin(organizations, eq(noticeBoard.organizationId, organizations.id))
        .leftJoin(branches, eq(noticeBoard.branchId, branches.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(noticeBoard.isUrgent), desc(noticeBoard.publishDate), desc(noticeBoard.createdAt));
      } catch (queryError: any) {
        console.error('Error executing notice board query:', queryError);
        return { 
          success: false, 
          error: `Database query failed: ${queryError.message || 'Unknown error'}` 
        };
      }

      console.log('Query executed successfully, result count:', result?.length || 0);
      return { success: true, data: result || [] };
    } catch (error: any) {
      console.error('Error in NoticeBoard getAll:', error);
      return { success: false, error: error.message || 'Failed to fetch notices' };
    }
  }

  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: noticeBoard.id,
        organizationId: noticeBoard.organizationId,
        branchId: noticeBoard.branchId,
        title: noticeBoard.title,
        content: noticeBoard.content,
        noticeType: noticeBoard.noticeType,
        priorityLevel: noticeBoard.priorityLevel,
        targetAudience: noticeBoard.targetAudience,
        targetSections: noticeBoard.targetSections,
        isUrgent: noticeBoard.isUrgent,
        isPublished: noticeBoard.isPublished,
        publishDate: noticeBoard.publishDate,
        expiryDate: noticeBoard.expiryDate,
        attachments: noticeBoard.attachments,
        authorId: noticeBoard.authorId,
        approvedBy: noticeBoard.approvedBy,
        approvedAt: noticeBoard.approvedAt,
        readCount: noticeBoard.readCount,
        createdAt: noticeBoard.createdAt,
        updatedAt: noticeBoard.updatedAt,
        // Author info
        authorName: users.displayName,
        authorEmail: users.email,
        // Organization info
        organizationName: organizations.name,
        // Branch info
        branchName: branches.name
      })
        .from(noticeBoard)
        .leftJoin(users, eq(noticeBoard.authorId, users.id))
        .leftJoin(organizations, eq(noticeBoard.organizationId, organizations.id))
        .leftJoin(branches, eq(noticeBoard.branchId, branches.id))
        .where(eq(noticeBoard.id, id))
        .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Notice not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch notice' };
    }
  }

  static async update(id: number, data: UpdateNoticeData): Promise<ServiceResponse<any>> {
    try {
      const updateData: any = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.noticeType !== undefined) updateData.noticeType = data.noticeType;
      if (data.priorityLevel !== undefined) updateData.priorityLevel = data.priorityLevel;
      if (data.targetAudience !== undefined) updateData.targetAudience = data.targetAudience;
      if (data.targetSections !== undefined) updateData.targetSections = data.targetSections;
      if (data.isUrgent !== undefined) updateData.isUrgent = data.isUrgent;
      if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
      if (data.publishDate !== undefined) updateData.publishDate = data.publishDate;
      if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;
      if (data.attachments !== undefined) updateData.attachments = data.attachments;
      if (data.approvedBy !== undefined) updateData.approvedBy = data.approvedBy;
      if (data.approvedAt !== undefined) updateData.approvedAt = data.approvedAt;

      if (Object.keys(updateData).length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      updateData.updatedAt = sql`CURRENT_TIMESTAMP`;

      const result = await db.update(noticeBoard)
        .set(updateData)
        .where(eq(noticeBoard.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Notice not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update notice' };
    }
  }

  static async delete(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.delete(noticeBoard)
        .where(eq(noticeBoard.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Notice not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete notice' };
    }
  }

  static async publish(id: number, approvedBy?: number): Promise<ServiceResponse<any>> {
    try {
      const updateData: any = {
        isPublished: true,
        publishDate: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      };

      if (approvedBy) {
        updateData.approvedBy = approvedBy;
        updateData.approvedAt = sql`CURRENT_TIMESTAMP`;
      }

      const result = await db.update(noticeBoard)
        .set(updateData)
        .where(eq(noticeBoard.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Notice not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to publish notice' };
    }
  }

  static async incrementReadCount(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(noticeBoard)
        .set({
          readCount: sql`${noticeBoard.readCount} + 1`
        })
        .where(eq(noticeBoard.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Notice not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to increment read count' };
    }
  }

  // Organization Level Methods
  static async getOrganizationNotices(organizationId: number, isPublished?: boolean): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      organizationId,
      isPublished,
      includeExpired: false
    });
  }

  // Branch Level Methods
  static async getBranchNotices(branchId: number, isPublished?: boolean): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      branchId,
      isPublished,
      includeExpired: false
    });
  }

  static async getUrgentNotices(organizationId?: number, branchId?: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      organizationId,
      branchId,
      isUrgent: true,
      isPublished: true,
      includeExpired: false
    });
  }

  static async getPendingApproval(organizationId?: number, branchId?: number): Promise<ServiceResponse<any[]>> {
    return this.getAll({
      organizationId,
      branchId,
      isPublished: false
    });
  }

  static async getExpiringNotices(daysAhead: number = 7, organizationId?: number, branchId?: number): Promise<ServiceResponse<any[]>> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const whereConditions = [
        eq(noticeBoard.isPublished, true),
        sql`${noticeBoard.expiryDate} <= ${futureDate.toISOString()}`,
        sql`${noticeBoard.expiryDate} >= CURRENT_DATE`
      ];

      if (organizationId) {
        whereConditions.push(eq(noticeBoard.organizationId, organizationId));
      }

      if (branchId) {
        whereConditions.push(eq(noticeBoard.branchId, branchId));
      }

      const result = await db.select({
        id: noticeBoard.id,
        title: noticeBoard.title,
        noticeType: noticeBoard.noticeType,
        expiryDate: noticeBoard.expiryDate,
        organizationName: organizations.name,
        branchName: branches.name,
        authorName: users.displayName
      })
        .from(noticeBoard)
        .leftJoin(users, eq(noticeBoard.authorId, users.id))
        .leftJoin(organizations, eq(noticeBoard.organizationId, organizations.id))
        .leftJoin(branches, eq(noticeBoard.branchId, branches.id))
        .where(and(...whereConditions))
        .orderBy(noticeBoard.expiryDate);

      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch expiring notices' };
    }
  }
}