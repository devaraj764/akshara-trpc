// Export all services for easy importing
export { StudentService } from './studentService';
export { TeacherService } from './teacherService';
export { AttendanceService } from './attendanceService';
export { OrganizationService } from './organizationService';
export { ClassService } from './classService';
export { FeeService } from './feeService';
export { authService } from './authService';
export { userService } from './userService';

// Re-export common types
export type { ServiceResponse } from '../types.db.js';