import { z } from 'zod';
import { router, protectedProcedure, adminProcedure, branchAdminProcedure, TRPCError } from '../trpc.js';
import { userService } from '../services/userService.js';

const updateUserSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT', 'TEACHER', 'STUDENT', 'PARENT', 'STAFF']).optional(),
  branchId: z.number().optional(),
  isActive: z.boolean().optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  role: z.enum(['BRANCH_ADMIN', 'ACCOUNTANT', 'TEACHER', 'STUDENT', 'PARENT', 'STAFF']),
  branchId: z.number().optional(),
  organizationId: z.number().optional(),
});

const userFiltersSchema = z.object({
  branchId: z.number().optional(),
  role: z.string().optional(),
  search: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const userRouter = router({
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const result = await userService.getProfile(ctx.user.id);

      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'User not found',
        });
      }

      return result.data;
    }),

  updateProfile: protectedProcedure
    .input(updateUserSchema.omit({ role: true }))
    .mutation(async ({ input, ctx }) => {
      const result = await userService.updateUser({
        ...input,
        id: ctx.user.id,
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update profile',
        });
      }

      return result.data;
    }),

  getAllUsers: branchAdminProcedure
    .input(userFiltersSchema.optional())
    .query(async ({ input, ctx }) => {
      // Get the current user's profile to apply role-based filtering
      const currentUserProfile = await userService.getProfile(ctx.user.id);
      if (!currentUserProfile.success || !currentUserProfile.data) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Unable to verify user permissions',
        });
      }

      const currentUser = currentUserProfile.data;
      const currentUserRole = currentUser.roles?.[0]?.role;

      // Apply role-based filters
      let filters = input || {};

      if (currentUserRole === 'BRANCH_ADMIN') {
        // Branch admins can only see users in their branch
        filters.branchId = currentUser.branchId!;
      }
      // SUPER_ADMIN can see all users (no additional filters)

      const result = await userService.getAllUsers({
        ...filters,
        organizationId: currentUser.organizationId!
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch users',
        });
      }

      return result.data;
    }),

  createUser: branchAdminProcedure
    .input(createUserSchema)
    .mutation(async ({ input, ctx }) => {
      // Get the current user's profile to determine their permissions
      const currentUserProfile = await userService.getProfile(ctx.user.id);
      if (!currentUserProfile.success || !currentUserProfile.data) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Unable to verify user permissions',
        });
      }

      const currentUser = currentUserProfile.data;
      const currentUserRole = currentUser.roles?.[0]?.role;

      // Validation based on current user's role
      if (currentUserRole === 'BRANCH_ADMIN') {
        // Branch admins can only create TEACHER, STUDENT, PARENT, STAFF in their branch
        if (!['TEACHER', 'STUDENT', 'PARENT', 'STAFF'].includes(input.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Branch admins can only create teachers, students, parents, and staff',
          });
        }
        // Must be in the same branch
        input.branchId = currentUser.branchId ?? undefined;
      } else if (currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN') {
        // Admins can create any role including BRANCH_ADMIN
        // No additional restrictions for admins
      } else {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins and branch admins can create users',
        });
      }

      // Validate role-based requirements
      if (['BRANCH_ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'STAFF'].includes(input.role) && !input.branchId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${input.role} role requires a branch assignment`,
        });
      }

      const result = await userService.createUser({
        ...input,
        organizationId: input.organizationId || currentUser.organizationId!
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to create user',
        });
      }

      return result.data;
    }),

  updateUser: adminProcedure
    .input(updateUserSchema)
    .mutation(async ({ input }) => {
      const result = await userService.updateUser(input);

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to update user',
        });
      }

      return result.data;
    }),


  // Additional user management routes
  getUserById: branchAdminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      // Get the current user's profile to apply role-based filtering
      const currentUserProfile = await userService.getProfile(ctx.user.id);
      if (!currentUserProfile.success || !currentUserProfile.data) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Unable to verify user permissions',
        });
      }

      const result = await userService.getUserById(input.id);

      if (!result.success) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: result.error || 'User not found',
        });
      }

      const currentUser = currentUserProfile.data;
      const currentUserRole = currentUser.roles?.[0]?.role;
      const targetUser = result.data!;

      // Apply role-based access control
      if (currentUserRole === 'BRANCH_ADMIN') {
        // Branch admins can only access users in their branch
        if (targetUser.branchId !== currentUser.branchId ||
          targetUser.organizationId !== currentUser.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied',
          });
        }
      } else if (currentUserRole === 'ADMIN') {
        // Admins can access users in their organization
        if (targetUser.organizationId !== currentUser.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied',
          });
        }
      }
      // SUPER_ADMIN can access any user

      return result.data;
    }),

  addUserRole: branchAdminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.string(),
      organizationId: z.number(),
      branchId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get the current user's profile to determine their permissions
      const currentUserProfile = await userService.getProfile(ctx.user.id);
      if (!currentUserProfile.success || !currentUserProfile.data) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Unable to verify user permissions',
        });
      }

      const currentUser = currentUserProfile.data;
      const currentUserRole = currentUser.roles?.[0]?.role;

      // Apply role-based restrictions
      if (currentUserRole === 'BRANCH_ADMIN') {
        // Branch admins can only add roles within their branch and organization
        if (input.organizationId !== currentUser.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied: You can only manage roles within your organization',
          });
        }
        
        // Force the branchId to be the current user's branch for branch admins
        input.branchId = currentUser.branchId!;
        
        // Branch admins cannot create ADMIN or SUPER_ADMIN roles
        if (['ADMIN', 'SUPER_ADMIN'].includes(input.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Branch admins cannot assign admin roles',
          });
        }
      } else if (currentUserRole === 'ADMIN') {
        // Admins can add roles within their organization
        if (input.organizationId !== currentUser.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied: You can only manage roles within your organization',
          });
        }
      }
      // SUPER_ADMIN can add any role

      // Check if user already has this role in the same branch
      const targetUserResult = await userService.getUserById(input.userId);
      if (!targetUserResult.success || !targetUserResult.data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Target user not found',
        });
      }

      const targetUser = targetUserResult.data;
      const existingRole = targetUser.roles.find((role: any) => 
        role.role === input.role && 
        role.branchId === input.branchId &&
        role.organizationId === input.organizationId
      );

      if (existingRole) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `User already has the ${input.role} role in this branch`,
        });
      }

      const result = await userService.addUserRole({
        ...input,
        branchId: input.branchId || undefined
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to add user role',
        });
      }

      return result.data;
    }),

  removeUserRole: branchAdminProcedure
    .input(z.object({
      userId: z.number(),
      roleId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get the current user's profile to determine their permissions
      const currentUserProfile = await userService.getProfile(ctx.user.id);
      if (!currentUserProfile.success || !currentUserProfile.data) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Unable to verify user permissions',
        });
      }

      const currentUser = currentUserProfile.data;
      const currentUserRole = currentUser.roles?.[0]?.role;

      // Get the target user to check permissions
      const targetUserResult = await userService.getUserById(input.userId);
      if (!targetUserResult.success || !targetUserResult.data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Target user not found',
        });
      }

      const targetUser = targetUserResult.data;

      // Apply role-based access control
      if (currentUserRole === 'BRANCH_ADMIN') {
        // Branch admins can only remove roles for users in their branch
        if (targetUser.branchId !== currentUser.branchId ||
          targetUser.organizationId !== currentUser.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied: You can only manage roles within your branch',
          });
        }
      } else if (currentUserRole === 'ADMIN') {
        // Admins can remove roles for users in their organization
        if (targetUser.organizationId !== currentUser.organizationId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied: You can only manage roles within your organization',
          });
        }
      }
      // SUPER_ADMIN can remove any role

      const result = await userService.removeUserRole(input.userId, input.roleId);

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to remove user role',
        });
      }

      return { success: true };
    }),

  activateUser: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await userService.reactivateProfile(input.id);

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to activate user',
        });
      }

      return result.data;
    }),

  deactivateUser: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await userService.deactivateProfile(input.id);

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to deactivate user',
        });
      }

      return { success: true };
    }),

  getAvailableFilters: protectedProcedure
    .query(async ({ ctx }) => {
      const result = await userService.getAvailableFilters(ctx.user.id);
      
      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to fetch available filters',
        });
      }
      
      return result.data;
    }),

  changeUserPassword: branchAdminProcedure
    .input(z.object({
      userId: z.number(),
      newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await userService.changeUserPassword(
        input.userId, 
        input.newPassword, 
        ctx.user.id
      );
      
      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to change password',
        });
      }
      
      return result.data;
    }),
});