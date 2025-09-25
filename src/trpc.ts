import { initTRPC, TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';
import { IncomingMessage, ServerResponse } from 'http';

// JWT Payload interface for type safety
interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  organizationId: number;
  branchId?: number;
  tokenId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// User context interface
export interface User {
  id: number;
  email: string;
  role: string;
  organizationId: number;
  branchId: number | undefined;
  tokenId: string;
  type: 'access' | 'refresh';
}

// Create context options interface
interface CreateContextOptions {
  req: IncomingMessage;
  res: ServerResponse;
}

// Create context for tRPC
export const createContext = async (opts: CreateContextOptions) => {
  const { req } = opts;
  const timestamp = new Date().toISOString();
  
  // Extract token from Authorization header
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  let user: User | null = null;
  if (token) {
    try {
      const jwtSecret = process.env.JWT_ACCESS_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_ACCESS_SECRET environment variable is not set');
      }
      
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      
      // Map JWT payload to expected user format
      if (decoded && decoded.userId) {
        const newUser: User = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          organizationId: decoded.organizationId,
          branchId: decoded.branchId,
          tokenId: decoded.tokenId,
          type: decoded.type
        };
        user = newUser;
        console.log(`🔐 AUTH SUCCESS: ${timestamp} - User: ${newUser.id} (${newUser.email}) - Role: ${newUser.role}`);
      }
    } catch (error: any) {
      const errorMsg = error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError || error instanceof jwt.NotBeforeError
        ? `Invalid token: ${error.message}`
        : error.message;
      const clientIP = (req as any).socket?.remoteAddress || (req as any).connection?.remoteAddress || 'unknown';
      console.log(`🔐 AUTH FAILED: ${timestamp} - ${errorMsg} - IP: ${clientIP}`);
      // Token is invalid, but we'll let individual procedures decide if auth is required
    }
  } else {
    const clientIP = (req as any).socket?.remoteAddress || (req as any).connection?.remoteAddress || 'unknown';
    console.log(`🔐 NO AUTH: ${timestamp} - No token provided - IP: ${clientIP}`);
  }
  
  return {
    user,
    req,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC with global middleware for logging
const t = initTRPC.context<Context>().create();

// Logging middleware
const loggingMiddleware = t.middleware(async ({ path, type, next, input, ctx }) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const userId = ctx.user?.id || 'anonymous';
  const userRole = ctx.user?.role || 'none';
  
  console.log(`🔍 tRPC CALL: ${timestamp} - ${type.toUpperCase()} ${path} - User: ${userId} (${userRole}) - Input:`, JSON.stringify(input));
  
  const result = await next();
  
  const duration = Date.now() - start;
  
  if (result.ok) {
    console.log(`✅ tRPC SUCCESS: ${path} - ${duration}ms - User: ${userId}`);
  } else {
    const errorMessage = 'error' in result ? (result as any).error?.message || 'Unknown error' : 'Unknown error';
    console.log(`❌ tRPC ERROR: ${path} - ${duration}ms - User: ${userId} - Error:`, errorMessage);
  }
  
  return result;
});

// Base router and procedure with logging
export const router = t.router;
export const publicProcedure = t.procedure.use(loggingMiddleware);

// Auth middleware
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.user.id) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource. Please provide a valid authorization token.',
    });
  }
  
  // Verify token type is access token
  if (ctx.user.type !== 'access') {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid token type. Access token required.',
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Protected procedure that requires authentication with logging
export const protectedProcedure = t.procedure.use(loggingMiddleware).use(isAuthenticated);

// Role-based middleware (assumes authentication already checked)
export const requireRole = (roles: string[]) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.user?.role || !roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Insufficient permissions. Required roles: ${roles.join(', ')}. Current role: ${ctx.user?.role || 'none'}`,
      });
    }
    
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  });

// Admin procedure with authentication and logging
export const adminProcedure = t.procedure.use(loggingMiddleware).use(isAuthenticated).use(requireRole(['ADMIN', 'SUPER_ADMIN']));

// Teacher procedure (includes admin) with authentication and logging
export const teacherProcedure = t.procedure.use(loggingMiddleware).use(isAuthenticated).use(requireRole(['TEACHER', 'ADMIN', 'SUPER_ADMIN']));

// Branch admin procedure with authentication and logging
export const branchAdminProcedure = t.procedure.use(loggingMiddleware).use(isAuthenticated).use(requireRole(['BRANCH_ADMIN', 'ADMIN', 'SUPER_ADMIN']));

// Accountant procedure with authentication and logging
export const accountantProcedure = t.procedure.use(loggingMiddleware).use(isAuthenticated).use(requireRole(['ACCOUNTANT', 'BRANCH_ADMIN', 'ADMIN', 'SUPER_ADMIN']));

// Staff procedure with authentication and logging
export const staffProcedure = t.procedure.use(loggingMiddleware).use(isAuthenticated).use(requireRole(['STAFF', 'BRANCH_ADMIN', 'ADMIN', 'SUPER_ADMIN']));

// Parent procedure with authentication and logging
export const parentProcedure = t.procedure.use(loggingMiddleware).use(isAuthenticated).use(requireRole(['PARENT', 'TEACHER', 'BRANCH_ADMIN', 'ADMIN', 'SUPER_ADMIN']));

// Student procedure with authentication and logging
export const studentProcedure = t.procedure.use(loggingMiddleware).use(isAuthenticated).use(requireRole(['STUDENT', 'PARENT', 'TEACHER', 'BRANCH_ADMIN', 'ADMIN', 'SUPER_ADMIN']));

export { TRPCError };