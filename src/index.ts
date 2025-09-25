import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { createContext, router } from './trpc.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/user.js';
import { studentRouter } from './routes/student.js';
import { teacherRouter } from './routes/teacher.js';
import { classRouter, sectionRouter } from './routes/class.js';
import { subjectsRouter } from './routes/subject.js';
import { attendanceRouter } from './routes/attendance.js';
import { organizationRouter } from './routes/organization.js';
import { feeRouter } from './routes/fee.js';
import { branchesRouter } from './routes/branches.js';
import { academicYearRouter } from './routes/academicYear.js';
import { departmentRouter } from './routes/department.js';
import { staffRouter } from './routes/staff.js';
import { statisticsRouter } from './routes/statistics.js';
import { calendarRouter } from './routes/calendar.js';
import { noticeBoardRouter } from './routes/noticeBoard.js';
// Removed deprecated feeStructure routes
import { feeTypesRouter } from './routes/feeTypes.js';
import { feeItemsRouter } from './routes/feeItems.js';
import * as dotenv from 'dotenv';
import morgan from 'morgan';

// Load environment variables
dotenv.config();

// Custom Morgan format for detailed logging
morgan.token('user-id', (req) => {
  return (req as any).user?.id || 'anonymous';
});

morgan.token('timestamp', () => {
  return new Date().toISOString();
});

morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    return JSON.stringify((req as any).body || {});
  }
  return '';
});

// Custom Morgan format
const morganFormat = ':timestamp :method :url :status :res[content-length] - :response-time ms - User: :user-id :body';

// Create Morgan middleware
const logger = morgan(morganFormat, {
  stream: {
    write: (message: string) => {
      console.log(`📊 REQUEST: ${message.trim()}`);
    }
  }
});

// Create main app router
const appRouter = router({
  auth: authRouter,
  user: userRouter,
  student: studentRouter,
  teacher: teacherRouter,
  classes: classRouter,
  sections: sectionRouter,
  subjects: subjectsRouter.subjects,
  subjectTeachers: subjectsRouter.teacherAssignments,
  assignments: subjectsRouter.assignments,
  academicYears: academicYearRouter,
  attendance: attendanceRouter,
  organization: organizationRouter,
  fee: feeRouter,
  branches: branchesRouter,
  departments: departmentRouter,
  staff: staffRouter,
  statistics: statisticsRouter,
  calendar: calendarRouter,
  noticeBoard: noticeBoardRouter,
  // Removed deprecated feeStructure router
  feeTypes: feeTypesRouter,
  feeItems: feeItemsRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;

// Create HTTP server
const server = createHTTPServer({
  router: appRouter,
  createContext,
  middleware: (req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientIP = req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    
    // Log incoming request
    console.log(`📊 REQUEST: ${timestamp} - ${method} ${url} - IP: ${clientIP} - User-Agent: ${userAgent}`);
    
    // Log request body for POST/PUT requests
    if (method === 'POST' || method === 'PUT') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        if (body && body.length > 0) {
          try {
            const parsedBody = JSON.parse(body);
            console.log(`📊 REQUEST BODY: ${timestamp} - ${JSON.stringify(parsedBody)}`);
          } catch (e) {
            console.log(`📊 REQUEST BODY: ${timestamp} - ${body.substring(0, 200)}...`);
          }
        }
      });
    }
    
    // Log response
    const originalEnd = res.end;
    res.end = ((...args: any[]) => {
      const duration = Date.now() - new Date(timestamp).getTime();
      console.log(`📊 RESPONSE: ${timestamp} - ${method} ${url} - Status: ${res.statusCode} - ${duration}ms`);
      return (originalEnd as any).apply(res, args);
    }) as any;
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    next();
  },
});

const port = process.env.PORT || 3001;

server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});