import { and, asc, desc, eq, sql } from 'drizzle-orm';
import db from '../db/index.js';
import {
  branches,
  organizations,
  tickets
} from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

// Table aliases will be handled in raw SQL

export interface CreateTicketData {
  organizationId: number;
  branchId?: number;
  title: string;
  description?: string;
  category: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  fromUserId: number;
  assignedTo?: number;
  attachments?: any;
  tags?: string[];
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  category?: string;
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: number;
  resolvedBy?: number;
  resolutionNotes?: string;
  attachments?: any;
  tags?: string[];
}

export interface GetTicketsOptions {
  organizationId?: number;
  branchId?: number;
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category?: string;
  fromUserId?: number;
  assignedTo?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export class TicketService {
  static async create(data: CreateTicketData): Promise<ServiceResponse<any>> {
    try {
      const now = new Date().toISOString();
      console.log('Creating ticket with timestamp:', now);
      
      const result = await db.insert(tickets).values({
        organizationId: data.organizationId,
        branchId: data.branchId,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority || 'MEDIUM',
        fromUserId: data.fromUserId,
        assignedTo: data.assignedTo,
        attachments: data.attachments,
        tags: data.tags || [],
        status: 'OPEN',
        createdAt: now,
        updatedAt: now
      }).returning();

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create ticket' };
    }
  }

  static async getAll(options: GetTicketsOptions = {}): Promise<ServiceResponse<any>> {
    try {
      const whereConditions = [];

      if (options.organizationId) {
        whereConditions.push(eq(tickets.organizationId, options.organizationId));
      }

      if (options.branchId) {
        whereConditions.push(eq(tickets.branchId, options.branchId));
      }

      if (options.status) {
        whereConditions.push(eq(tickets.status, options.status));
      }

      if (options.priority) {
        whereConditions.push(eq(tickets.priority, options.priority));
      }

      if (options.category) {
        whereConditions.push(eq(tickets.category, options.category));
      }

      if (options.fromUserId) {
        whereConditions.push(eq(tickets.fromUserId, options.fromUserId));
      }

      if (options.assignedTo) {
        whereConditions.push(eq(tickets.assignedTo, options.assignedTo));
      }

      if (options.search) {
        const searchTerm = `%${options.search}%`;
        whereConditions.push(
          sql`(
            ${tickets.title} ILIKE ${searchTerm} OR
            ${tickets.description} ILIKE ${searchTerm} OR
            ${tickets.id}::text = ${options.search}
          )`
        );
      }

      // Get total count first (without pagination)
      let countQuery = db.select({ count: sql<number>`count(*)` })
        .from(tickets)
        .leftJoin(sql`users from_user`, eq(tickets.fromUserId, sql`from_user.id`))
        .leftJoin(sql`staff from_staff`, eq(sql`from_user.id`, sql`from_staff.user_id`))
        .leftJoin(sql`person_details from_person`, eq(sql`from_staff.person_detail_id`, sql`from_person.id`))
        .leftJoin(sql`users assigned_user`, eq(tickets.assignedTo, sql`assigned_user.id`))
        .leftJoin(sql`staff assigned_staff`, eq(sql`assigned_user.id`, sql`assigned_staff.user_id`))
        .leftJoin(sql`person_details assigned_person`, eq(sql`assigned_staff.person_detail_id`, sql`assigned_person.id`))
        .leftJoin(sql`users resolved_user`, eq(tickets.resolvedBy, sql`resolved_user.id`))
        .leftJoin(sql`staff resolved_staff`, eq(sql`resolved_user.id`, sql`resolved_staff.user_id`))
        .leftJoin(sql`person_details resolved_person`, eq(sql`resolved_staff.person_detail_id`, sql`resolved_person.id`))
        .leftJoin(branches, eq(tickets.branchId, branches.id))
        .leftJoin(organizations, eq(tickets.organizationId, organizations.id));

      if (whereConditions.length > 0) {
        countQuery = countQuery.where(and(...whereConditions));
      }

      const [countResult] = await countQuery;
      const totalCount = countResult.count;

      // Get paginated tickets
      let query = db.select({
        id: tickets.id,
        organizationId: tickets.organizationId,
        branchId: tickets.branchId,
        title: tickets.title,
        description: tickets.description,
        category: tickets.category,
        status: tickets.status,
        priority: tickets.priority,
        attachments: tickets.attachments,
        tags: tickets.tags,
        resolvedAt: tickets.resolvedAt,
        resolutionNotes: tickets.resolutionNotes,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        // From user info
        fromUserDisplayName: sql<string>`from_user.display_name`,
        fromUserEmail: sql<string>`from_user.email`,
        fromUserFirstName: sql<string>`from_person.first_name`,
        fromUserLastName: sql<string>`from_person.last_name`,
        // Assigned to user info
        assignedToDisplayName: sql<string>`assigned_user.display_name`,
        assignedToEmail: sql<string>`assigned_user.email`,
        assignedToFirstName: sql<string>`assigned_person.first_name`,
        assignedToLastName: sql<string>`assigned_person.last_name`,
        // Resolved by user info
        resolvedByDisplayName: sql<string>`resolved_user.display_name`,
        resolvedByEmail: sql<string>`resolved_user.email`,
        resolvedByFirstName: sql<string>`resolved_person.first_name`,
        resolvedByLastName: sql<string>`resolved_person.last_name`,
        // Branch info
        branchName: branches.name,
        branchCode: branches.code,
        // Organization info
        organizationName: organizations.name
      })
        .from(tickets)
        .leftJoin(sql`users from_user`, eq(tickets.fromUserId, sql`from_user.id`))
        .leftJoin(sql`staff from_staff`, eq(sql`from_user.id`, sql`from_staff.user_id`))
        .leftJoin(sql`person_details from_person`, eq(sql`from_staff.person_detail_id`, sql`from_person.id`))
        .leftJoin(sql`users assigned_user`, eq(tickets.assignedTo, sql`assigned_user.id`))
        .leftJoin(sql`staff assigned_staff`, eq(sql`assigned_user.id`, sql`assigned_staff.user_id`))
        .leftJoin(sql`person_details assigned_person`, eq(sql`assigned_staff.person_detail_id`, sql`assigned_person.id`))
        .leftJoin(sql`users resolved_user`, eq(tickets.resolvedBy, sql`resolved_user.id`))
        .leftJoin(sql`staff resolved_staff`, eq(sql`resolved_user.id`, sql`resolved_staff.user_id`))
        .leftJoin(sql`person_details resolved_person`, eq(sql`resolved_staff.person_detail_id`, sql`resolved_person.id`))
        .leftJoin(branches, eq(tickets.branchId, branches.id))
        .leftJoin(organizations, eq(tickets.organizationId, organizations.id));

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      query = query.orderBy(desc(tickets.createdAt));

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.offset(options.offset);
      }

      const ticketsData = await query;

      // Debug: Log some timestamp information
      if (ticketsData.length > 0) {
        console.log('Sample ticket timestamp from DB:', ticketsData[0].createdAt);
        console.log('Current server time:', new Date().toISOString());
        console.log('Database timezone assumed:', 'Local (no timezone info in schema)');
      }

      return { 
        success: true, 
        data: {
          tickets: ticketsData,
          totalCount: totalCount
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch tickets' };
    }
  }

  static async getById(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.select({
        id: tickets.id,
        organizationId: tickets.organizationId,
        branchId: tickets.branchId,
        title: tickets.title,
        description: tickets.description,
        category: tickets.category,
        status: tickets.status,
        priority: tickets.priority,
        fromUserId: tickets.fromUserId,
        assignedTo: tickets.assignedTo,
        resolvedBy: tickets.resolvedBy,
        attachments: tickets.attachments,
        tags: tickets.tags,
        resolvedAt: tickets.resolvedAt,
        resolutionNotes: tickets.resolutionNotes,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        // From user info
        fromUserDisplayName: sql<string>`from_user.display_name`,
        fromUserEmail: sql<string>`from_user.email`,
        fromUserFirstName: sql<string>`from_person.first_name`,
        fromUserLastName: sql<string>`from_person.last_name`,
        // Assigned to user info
        assignedToDisplayName: sql<string>`assigned_user.display_name`,
        assignedToEmail: sql<string>`assigned_user.email`,
        assignedToFirstName: sql<string>`assigned_person.first_name`,
        assignedToLastName: sql<string>`assigned_person.last_name`,
        // Resolved by user info
        resolvedByDisplayName: sql<string>`resolved_user.display_name`,
        resolvedByEmail: sql<string>`resolved_user.email`,
        resolvedByFirstName: sql<string>`resolved_person.first_name`,
        resolvedByLastName: sql<string>`resolved_person.last_name`,
        // Branch info
        branchName: branches.name,
        branchCode: branches.code,
        // Organization info
        organizationName: organizations.name
      })
        .from(tickets)
        .leftJoin(sql`users from_user`, eq(tickets.fromUserId, sql`from_user.id`))
        .leftJoin(sql`staff from_staff`, eq(sql`from_user.id`, sql`from_staff.user_id`))
        .leftJoin(sql`person_details from_person`, eq(sql`from_staff.person_detail_id`, sql`from_person.id`))
        .leftJoin(sql`users assigned_user`, eq(tickets.assignedTo, sql`assigned_user.id`))
        .leftJoin(sql`staff assigned_staff`, eq(sql`assigned_user.id`, sql`assigned_staff.user_id`))
        .leftJoin(sql`person_details assigned_person`, eq(sql`assigned_staff.person_detail_id`, sql`assigned_person.id`))
        .leftJoin(sql`users resolved_user`, eq(tickets.resolvedBy, sql`resolved_user.id`))
        .leftJoin(sql`staff resolved_staff`, eq(sql`resolved_user.id`, sql`resolved_staff.user_id`))
        .leftJoin(sql`person_details resolved_person`, eq(sql`resolved_staff.person_detail_id`, sql`resolved_person.id`))
        .leftJoin(branches, eq(tickets.branchId, branches.id))
        .leftJoin(organizations, eq(tickets.organizationId, organizations.id))
        .where(eq(tickets.id, id))
        .limit(1);

      if (result.length === 0) {
        return { success: false, error: 'Ticket not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch ticket' };
    }
  }

  static async update(id: number, data: UpdateTicketData): Promise<ServiceResponse<any>> {
    try {
      const updateData: any = {
        updatedAt: sql`CURRENT_TIMESTAMP`
      };

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.status !== undefined) {
        updateData.status = data.status;
        // Set resolvedAt when status changes to RESOLVED
        if (data.status === 'RESOLVED') {
          updateData.resolvedAt = sql`CURRENT_TIMESTAMP`;
        }
        // Clear resolvedAt when reopening
        if (data.status === 'REOPENED') {
          updateData.resolvedAt = null;
          updateData.resolvedBy = null;
          updateData.resolutionNotes = null;
        }
      }
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
      if (data.resolvedBy !== undefined) updateData.resolvedBy = data.resolvedBy;
      if (data.resolutionNotes !== undefined) updateData.resolutionNotes = data.resolutionNotes;
      if (data.attachments !== undefined) updateData.attachments = data.attachments;
      if (data.tags !== undefined) updateData.tags = data.tags;

      const result = await db.update(tickets)
        .set(updateData)
        .where(eq(tickets.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Ticket not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update ticket' };
    }
  }

  static async delete(id: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.delete(tickets)
        .where(eq(tickets.id, id))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Ticket not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete ticket' };
    }
  }

  // Get tickets by organization
  static async getByOrganization(organizationId: number, options: Omit<GetTicketsOptions, 'organizationId'> = {}): Promise<ServiceResponse<any[]>> {
    return this.getAll({ ...options, organizationId });
  }

  // Get tickets by branch
  static async getByBranch(branchId: number, options: Omit<GetTicketsOptions, 'branchId'> = {}): Promise<ServiceResponse<any[]>> {
    return this.getAll({ ...options, branchId });
  }

  // Get tickets assigned to a user
  static async getAssignedToUser(userId: number, options: Omit<GetTicketsOptions, 'assignedTo'> = {}): Promise<ServiceResponse<any[]>> {
    return this.getAll({ ...options, assignedTo: userId });
  }

  // Get tickets created by a user
  static async getCreatedByUser(userId: number, options: Omit<GetTicketsOptions, 'fromUserId'> = {}): Promise<ServiceResponse<any[]>> {
    return this.getAll({ ...options, fromUserId: userId });
  }

  // Get ticket statistics
  static async getStatistics(organizationId?: number, branchId?: number): Promise<ServiceResponse<any>> {
    try {
      const whereConditions = [];

      if (organizationId) {
        whereConditions.push(eq(tickets.organizationId, organizationId));
      }

      if (branchId) {
        whereConditions.push(eq(tickets.branchId, branchId));
      }

      const result = await db.select({
        totalTickets: sql<number>`count(*)`,
        openTickets: sql<number>`count(case when ${tickets.status} = 'OPEN' then 1 end)`,
        inProgressTickets: sql<number>`count(case when ${tickets.status} = 'IN_PROGRESS' then 1 end)`,
        resolvedTickets: sql<number>`count(case when ${tickets.status} = 'RESOLVED' then 1 end)`,
        closedTickets: sql<number>`count(case when ${tickets.status} = 'CLOSED' then 1 end)`,
        reopenedTickets: sql<number>`count(case when ${tickets.status} = 'REOPENED' then 1 end)`,
        lowPriorityTickets: sql<number>`count(case when ${tickets.priority} = 'LOW' then 1 end)`,
        mediumPriorityTickets: sql<number>`count(case when ${tickets.priority} = 'MEDIUM' then 1 end)`,
        highPriorityTickets: sql<number>`count(case when ${tickets.priority} = 'HIGH' then 1 end)`,
        urgentPriorityTickets: sql<number>`count(case when ${tickets.priority} = 'URGENT' then 1 end)`
      })
        .from(tickets)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch ticket statistics' };
    }
  }

  // Get available ticket categories
  static async getCategories(organizationId?: number, branchId?: number): Promise<ServiceResponse<string[]>> {
    try {
      const whereConditions = [];

      if (organizationId) {
        whereConditions.push(eq(tickets.organizationId, organizationId));
      }

      if (branchId) {
        whereConditions.push(eq(tickets.branchId, branchId));
      }

      const result = await db.selectDistinct({
        category: tickets.category
      })
        .from(tickets)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(asc(tickets.category));

      const categories = result.map(r => r.category).filter(Boolean);

      return { success: true, data: categories };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch ticket categories' };
    }
  }

  // Assign ticket to user
  static async assignTicket(ticketId: number, assignedToUserId: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(tickets)
        .set({
          assignedTo: assignedToUserId,
          status: 'IN_PROGRESS',
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(tickets.id, ticketId))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Ticket not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to assign ticket' };
    }
  }

  // Resolve ticket
  static async resolveTicket(ticketId: number, resolvedByUserId: number, resolutionNotes?: string): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(tickets)
        .set({
          status: 'RESOLVED',
          resolvedBy: resolvedByUserId,
          resolvedAt: sql`CURRENT_TIMESTAMP`,
          resolutionNotes: resolutionNotes,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(tickets.id, ticketId))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Ticket not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to resolve ticket' };
    }
  }

  // Close ticket
  static async closeTicket(ticketId: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(tickets)
        .set({
          status: 'CLOSED',
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(tickets.id, ticketId))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Ticket not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to close ticket' };
    }
  }

  // Reopen ticket
  static async reopenTicket(ticketId: number): Promise<ServiceResponse<any>> {
    try {
      const result = await db.update(tickets)
        .set({
          status: 'REOPENED',
          resolvedAt: null,
          resolvedBy: null,
          resolutionNotes: null,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(tickets.id, ticketId))
        .returning();

      if (result.length === 0) {
        return { success: false, error: 'Ticket not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to reopen ticket' };
    }
  }
}