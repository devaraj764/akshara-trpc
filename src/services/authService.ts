import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';
import db from '../db/index.js';
import { users, userRoles, organizations, branches, roleEnum, addresses } from '../db/schema.js';
import type { ServiceResponse } from '../types.db.js';

// Types
export interface OrganizationSetup {
  academic_years?: any[];
  subjects?: any[];
  departments?: any[];
  grades?: any[];
  fee_types?: any[];
  fee_items?: any[];
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  role?: string | undefined;
  organizationName: string;
  organizationRegistrationNumber?: string | undefined;
  organizationAddress?: {
    addressLine1: string;
    addressLine2?: string;
    pincode?: string;
    cityVillage: string;
    district: string;
    state: string;
    country?: string;
  };
  organizationPhone?: string | undefined;
  organizationEmail?: string | undefined;
  branchId?: number | undefined;
  organizationSetup?: OrganizationSetup;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  displayName?: string | undefined;
  isActive: boolean;
  organizationId?: number | undefined;
  branchId?: number | undefined;
  meta?: any;
  role?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface AuthSession {
  user: User;
  tokens: TokenPair;
}

export interface RefreshTokenData {
  userId: number;
  tokenId: string;
  deviceInfo?: string | undefined;
  ipAddress?: string | undefined;
}

// Constants
const JWT_ACCESS_SECRET: string = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY: string = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY: string = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// Log warning if using default secrets
if (JWT_ACCESS_SECRET === 'your-access-secret-key' || JWT_REFRESH_SECRET === 'your-refresh-secret-key') {
  console.warn('⚠️  WARNING: Using default JWT secrets. Please set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables in production!');
}
const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 30 * 60 * 1000; // 30 minutes

// In-memory store for refresh tokens
const refreshTokenStore = new Map<string, RefreshTokenData>();
const blacklistedTokens = new Set<string>();
const loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();

class AuthService {
  /**
   * Generate a secure token pair (access + refresh)
   */
  private generateTokenPair(user: User, deviceInfo?: string): TokenPair {
    const tokenId = crypto.randomUUID();
    const now = new Date();
    
    // Generate access token with short expiry
    const accessTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role || 'STUDENT',
      organizationId: user.organizationId,
      branchId: user.branchId,
      tokenId,
      type: 'access'
    };
    
    const accessToken = jwt.sign(
      accessTokenPayload,
      JWT_ACCESS_SECRET,
      { 
        expiresIn: ACCESS_TOKEN_EXPIRY,
        issuer: 'akshara-server',
        audience: 'akshara-client'
      } as jwt.SignOptions
    );

    // Generate refresh token with longer expiry
    const refreshTokenPayload = {
      userId: user.id,
      tokenId,
      type: 'refresh',
      lastVerified: Math.floor(now.getTime() / 1000) // Timestamp when this token was created/verified
    };
    
    const refreshToken = jwt.sign(
      refreshTokenPayload,
      JWT_REFRESH_SECRET,
      { 
        expiresIn: REFRESH_TOKEN_EXPIRY,
        issuer: 'akshara-server',
        audience: 'akshara-client'
      } as jwt.SignOptions
    );

    // No need to store refresh token metadata in memory
    // JWT token is self-contained and includes all necessary data

    const expiresAt = new Date(now.getTime() + this.parseExpiry(ACCESS_TOKEN_EXPIRY));

    return {
      accessToken,
      refreshToken,
      expiresAt
    };
  }

  /**
   * Parse expiry string to milliseconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60 * 1000; // Default 15 minutes

    const [, value, unit] = match;
    const num = parseInt(value || '15');

    switch (unit) {
      case 's': return num * 1000;
      case 'm': return num * 60 * 1000;
      case 'h': return num * 60 * 60 * 1000;
      case 'd': return num * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000;
    }
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): { valid: boolean; message?: string | undefined } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!/(?=.*\d)/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character (@$!%*?&)' };
    }

    return { valid: true };
  }

  /**
   * Check rate limiting for login attempts
   */
  private checkRateLimit(email: string): { allowed: boolean; message?: string | undefined } {
    const attempts = loginAttempts.get(email);
    
    if (!attempts) return { allowed: true };
    
    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
    
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
      if (timeSinceLastAttempt < LOCKOUT_TIME) {
        const remainingTime = Math.ceil((LOCKOUT_TIME - timeSinceLastAttempt) / 60000);
        return { 
          allowed: false, 
          message: `Account locked. Try again in ${remainingTime} minutes.` 
        };
      } else {
        // Reset attempts after lockout period
        loginAttempts.delete(email);
        return { allowed: true };
      }
    }
    
    return { allowed: true };
  }

  /**
   * Record login attempt
   */
  private recordLoginAttempt(email: string, successful: boolean): void {
    if (successful) {
      loginAttempts.delete(email);
      return;
    }

    const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: new Date() };
    attempts.count++;
    attempts.lastAttempt = new Date();
    loginAttempts.set(email, attempts);
  }

  /**
   * Sign up with email and password (ADMIN only - creates user with roles)
   */
  async signUp({ email, password, fullName, role = 'ADMIN', organizationName, organizationRegistrationNumber, organizationAddress, organizationPhone, organizationEmail, branchId, organizationSetup }: SignUpData, deviceInfo?: string): Promise<ServiceResponse<AuthSession>> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, error: 'Invalid email format' };
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.valid) {
        return { success: false, error: passwordValidation.message || 'Invalid password' };
      }

      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      
      if (existingUser.length > 0) {
        return { success: false, error: 'User already exists' };
      }

      // Create organization with address using transaction
      const organization = await db.transaction(async (tx) => {
        // Create address if provided
        let addressId: number | undefined;
        if (organizationAddress) {
          const addressResult = await tx.insert(addresses).values({
            addressLine1: organizationAddress.addressLine1,
            addressLine2: organizationAddress.addressLine2 || null,
            pincode: organizationAddress.pincode || null,
            cityVillage: organizationAddress.cityVillage,
            district: organizationAddress.district,
            state: organizationAddress.state,
            country: organizationAddress.country || 'India',
          }).returning({ id: addresses.id });
          addressId = addressResult[0]?.id;
        }

        // Prepare meta object with setup if provided
        const metaData: any = {};
        if (organizationSetup) {
          metaData.setup = organizationSetup;
        }

        // Create organization
        const newOrg = await tx.insert(organizations).values({
          name: organizationName,
          registrationNumber: organizationRegistrationNumber || null,
          contactPhone: organizationPhone || null,
          contactEmail: organizationEmail || null,
          addressId: addressId || null,
          meta: Object.keys(metaData).length > 0 ? metaData : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).returning();

        const org = newOrg[0];
        if (!org) {
          throw new Error('Failed to create organization');
        }
        return org;
      });

      if (!organization) {
        return { success: false, error: 'Failed to create organization' };
      }

      // Hash password with salt
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Determine branch assignment based on role
      let assignedBranchId = null;
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        // Non-admin roles require branch assignment
        if (!branchId) {
          return { success: false, error: `${role} role requires a branch assignment` };
        }
        assignedBranchId = branchId;
      }

      // Create user with the new organization
      const newUsers = await db.insert(users).values({
        email: email.toLowerCase(),
        passwordHash,
        displayName: fullName,
        organizationId: organization.id,
        branchId: assignedBranchId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).returning();

      const user = newUsers[0];
      if (!user) {
        return { success: false, error: 'Failed to create user' };
      }

      // Create user role entry based on assigned role
      try {
        await db.insert(userRoles).values({
          userId: user.id,
          role: role as any,
          organizationId: organization.id,
          branchId: assignedBranchId,
          createdAt: new Date().toISOString()
        });
      } catch (roleError: any) {
        console.error('Failed to create user role:', roleError);
        return { success: false, error: 'Failed to assign user role' };
      }

      // Create token pair
      const userObj: User = {
        id: user.id,
        email: user.email,
        displayName: user.displayName || undefined,
        isActive: user.isActive,
        organizationId: organization.id,
        branchId: assignedBranchId || undefined,
        meta: user.meta,
        role: role
      };

      const tokens = this.generateTokenPair(userObj, deviceInfo);

      return {
        success: true,
        data: {
          user: userObj,
          tokens
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn({ email, password }: SignInData, deviceInfo?: string, ipAddress?: string): Promise<ServiceResponse<AuthSession>> {
    try {
      // Check rate limiting
      const rateLimitCheck = this.checkRateLimit(email.toLowerCase());
      if (!rateLimitCheck.allowed) {
        return { success: false, error: rateLimitCheck.message || 'Rate limit exceeded' };
      }

      // Find user by email
      const userResult = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      
      if (userResult.length === 0) {
        this.recordLoginAttempt(email.toLowerCase(), false);
        return { success: false, error: 'Invalid email or password' };
      }

      const user = userResult[0];
      if (!user) {
        this.recordLoginAttempt(email.toLowerCase(), false);
        return { success: false, error: 'Invalid email or password' };
      }
      
      // Check if user is active
      if (!user.isActive || user.isDeleted) {
        return { success: false, error: 'Account is deactivated' };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        this.recordLoginAttempt(email.toLowerCase(), false);
        return { success: false, error: 'Invalid email or password' };
      }

      // Record successful login
      this.recordLoginAttempt(email.toLowerCase(), true);

      // Fetch user roles from userRoles table
      const userRoleResult = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
      let userRole: any = 'STUDENT'; // Default role - use valid enum value
      
      if (userRoleResult.length > 0) {
        // If user has multiple roles, prioritize in this order: SUPER_ADMIN, ADMIN, BRANCH_ADMIN, ACCOUNTANT, TEACHER, PARENT, STAFF, STUDENT
        const rolePriority = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT', 'TEACHER', 'PARENT', 'STAFF', 'STUDENT'];
        const userRoles = userRoleResult.map(r => r.role);
        
        for (const priority of rolePriority) {
          if (userRoles.includes(priority as any)) {
            userRole = priority;
            break;
          }
        }
      } else {
        // If no roles found in userRoles table, this indicates a data consistency issue
        console.warn(`User ${user.id} has no roles in userRoles table. This may cause login issues.`);
      }

      // Check if user role is allowed to login
      const allowedLoginRoles = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT', 'TEACHER', 'PARENT'];
      if (!allowedLoginRoles.includes(userRole)) {
        return { 
          success: false, 
          error: 'This account type is not authorized to access the system. Please contact your administrator.' 
        };
      }

      // For branch-level users, check if their branch is active
      if (['BRANCH_ADMIN', 'ACCOUNTANT', 'TEACHER'].includes(userRole) && user.branchId) {
        const branchResult = await db.select()
          .from(branches)
          .where(eq(branches.id, user.branchId))
          .limit(1);
        
        if (branchResult.length === 0) {
          return { 
            success: false, 
            error: 'Your branch could not be found. Please contact your administrator.' 
          };
        }
        
        const branch = branchResult[0];
        if (branch.status !== 'ACTIVE') {
          return { 
            success: false, 
            error: 'Your branch has been disabled. Please contact your administrator.' 
          };
        }
      }

      // Create user object
      const userObj: User = {
        id: user.id,
        email: user.email,
        displayName: user.displayName || undefined,
        isActive: user.isActive,
        organizationId: user.organizationId || undefined,
        branchId: user.branchId || undefined,
        meta: user.meta,
        role: userRole
      };

      // Generate token pair
      const tokens = this.generateTokenPair(userObj, deviceInfo);
      
      // Update refresh token store with IP
      if (ipAddress) {
        const decoded = jwt.decode(tokens.refreshToken) as any;
        if (decoded?.tokenId) {
          const tokenData = refreshTokenStore.get(decoded.tokenId);
          if (tokenData) {
            tokenData.ipAddress = ipAddress;
            refreshTokenStore.set(tokenData.tokenId, tokenData);
          }
        }
      }

      return {
        success: true,
        data: {
          user: userObj,
          tokens
        }
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string, deviceInfo?: string): Promise<ServiceResponse<TokenPair>> {
    try {
      // Verify refresh token
      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
          return { success: false, error: 'Refresh token has expired' };
        }
        return { success: false, error: 'Invalid refresh token format' };
      }
      
      if (decoded.type !== 'refresh') {
        return { success: false, error: 'Invalid token type' };
      }

      // Get user from database to check lastVerifiedAt
      const userResult = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
      
      if (userResult.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const user = userResult[0];
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      if (!user.isActive || user.isDeleted) {
        return { success: false, error: 'Account is deactivated' };
      }

      // Check if token is still valid based on user's lastVerifiedAt timestamp
      if (user.lastVerifiedAt && decoded.lastVerified) {
        const userLastVerified = new Date(user.lastVerifiedAt).getTime() / 1000;
        const tokenLastVerified = decoded.lastVerified;
        
        // If user was verified after this token was created, token is invalid
        if (userLastVerified > tokenLastVerified) {
          return { success: false, error: 'Invalid refresh token' };
        }
      }

      // Fetch user roles from userRoles table - use same logic as sign-in
      const userRoleResult = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
      let userRole: any = 'STUDENT'; // Default role - use valid enum value
      
      if (userRoleResult.length > 0) {
        // If user has multiple roles, prioritize in this order: SUPER_ADMIN, ADMIN, BRANCH_ADMIN, ACCOUNTANT, TEACHER, PARENT, STAFF, STUDENT
        const rolePriority = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT', 'TEACHER', 'PARENT', 'STAFF', 'STUDENT'];
        const userRoles = userRoleResult.map(r => r.role);
        
        for (const priority of rolePriority) {
          if (userRoles.includes(priority as any)) {
            userRole = priority;
            break;
          }
        }
      }

      // Create user object
      const userObj: User = {
        id: user.id,
        email: user.email,
        displayName: user.displayName || undefined,
        isActive: user.isActive,
        organizationId: user.organizationId || undefined,
        branchId: user.branchId || undefined,
        meta: user.meta,
        role: userRole
      };

      // Generate new token pair BEFORE invalidating old one (prevents race conditions)
      const newTokens = this.generateTokenPair(userObj, deviceInfo);

      // Update user's lastVerifiedAt to invalidate older tokens
      try {
        await db.update(users)
          .set({ 
            lastVerifiedAt: new Date().toISOString()
          })
          .where(eq(users.id, user.id));
      } catch (error) {
        console.error('Failed to update user lastVerifiedAt:', error);
        // Continue anyway - token generation succeeded
      }

      return {
        success: true,
        data: newTokens
      };
    } catch (err: any) {
      console.error('Refresh token error:', err);
      return { success: false, error: 'Invalid refresh token' };
    }
  }

  /**
   * Verify access token
   */
  async verifyToken(token: string): Promise<ServiceResponse<User>> {
    try {

      // Verify access token
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as any;
      
      if (decoded.type !== 'access') {
        return { success: false, error: 'Invalid token type' };
      }

      // Get user from database
      const userResult = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
      
      if (userResult.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const user = userResult[0];
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      if (!user.isActive || user.isDeleted) {
        return { success: false, error: 'Account is deactivated' };
      }

      // Fetch user roles from userRoles table to get the current role
      const userRoleResult = await db.select().from(userRoles).where(eq(userRoles.userId, user.id)).limit(1);
      let userRole = 'user'; // Default role
      if (userRoleResult.length > 0 && userRoleResult[0]) {
        // Convert database role enum to lowercase with underscores for consistency with tRPC
        const dbRole = userRoleResult[0].role;
        userRole = dbRole.toLowerCase(); // SUPER_ADMIN -> super_admin, ADMIN -> admin
      }

      return {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          displayName: user.displayName || undefined,
          isActive: user.isActive,
          organizationId: user.organizationId || undefined,
          branchId: user.branchId || undefined,
          meta: user.meta,
          role: userRole
        }
      };
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return { success: false, error: 'Token has expired' };
      }
      return { success: false, error: 'Invalid token' };
    }
  }

  /**
   * Sign out and invalidate tokens
   */
  async signOut(refreshToken?: string): Promise<ServiceResponse<void>> {
    try {
      if (refreshToken) {
        const decoded = jwt.decode(refreshToken) as any;
        if (decoded?.userId) {
          // Update user's lastVerifiedAt to invalidate current tokens
          await db.update(users)
            .set({ 
              lastVerifiedAt: new Date().toISOString()
            })
            .where(eq(users.id, decoded.userId));
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Sign out failed' };
    }
  }

  /**
   * Sign out from all devices
   */
  async signOutAllDevices(userId: number): Promise<ServiceResponse<void>> {
    try {
      // Update user's lastVerifiedAt to invalidate all current tokens
      await db.update(users)
        .set({ 
          lastVerifiedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Sign out failed' };
    }
  }

  /**
   * Change password
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<ServiceResponse<void>> {
    try {
      // Validate new password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return { success: false, error: passwordValidation.message || 'Invalid password' };
      }

      // Get user
      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (userResult.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const user = userResult[0];
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      // Update password
      await db.update(users)
        .set({ 
          passwordHash: newPasswordHash,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId));

      // Sign out from all devices (force re-login)
      await this.signOutAllDevices(userId);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Password change failed' };
    }
  }

  /**
   * Reset password (would integrate with email service)
   */
  async resetPassword(email: string): Promise<ServiceResponse<void>> {
    try {
      // Find user by email
      const userResult = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      
      if (userResult.length === 0) {
        // Don't reveal if email exists or not for security
        return { success: true };
      }

      // TODO: Generate reset token and send email
      // For now, just return success
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Password reset failed' };
    }
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: number): Promise<ServiceResponse<any[]>> {
    try {
      const sessions = [];
      for (const [tokenId, tokenData] of Array.from(refreshTokenStore.entries())) {
        if (tokenData.userId === userId) {
          sessions.push({
            tokenId,
            deviceInfo: tokenData.deviceInfo,
            ipAddress: tokenData.ipAddress
          });
        }
      }
      return { success: true, data: sessions };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to get sessions' };
    }
  }

  /**
   * Cleanup expired tokens (should be run periodically)
   */
  cleanupExpiredTokens(): void {
    // Clean up blacklisted tokens (keep only recent ones)
    if (blacklistedTokens.size > 10000) {
      blacklistedTokens.clear();
    }

    // Clean up old login attempts
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [email, attempts] of Array.from(loginAttempts.entries())) {
      if (attempts.lastAttempt.getTime() < oneHourAgo) {
        loginAttempts.delete(email);
      }
    }
  }

  /**
   * Get total count of users in the system
   */
  async getUserCount(): Promise<number> {
    try {
      const result = await db.select().from(users);
      return result.length;
    } catch (error) {
      console.error('Error getting user count:', error);
      return 0;
    }
  }

  /**
   * Initial system setup - creates first super admin and organization
   */
  async initialSetup({ email, password, fullName, organizationName }: {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
  }): Promise<ServiceResponse<AuthSession>> {
    try {
      // Check if system is already initialized
      const userCount = await this.getUserCount();
      if (userCount > 0) {
        return { success: false, error: 'System already initialized' };
      }

      // Use the regular signUp method which creates organization and user together
      const signUpData: SignUpData = {
        email,
        password,
        fullName,
        organizationName: organizationName,
        organizationRegistrationNumber: undefined,
        organizationAddress: undefined,
        organizationPhone: undefined,
        organizationEmail: undefined
      };

      return await this.signUp(signUpData);
    } catch (error: any) {
      console.error('Error in initial setup:', error);
      return { success: false, error: error.message || 'Initial setup failed' };
    }
  }
}

export const authService = new AuthService();

// Clean up expired tokens every hour
setInterval(() => {
  authService.cleanupExpiredTokens();
}, 60 * 60 * 1000);