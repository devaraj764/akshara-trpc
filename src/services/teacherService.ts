import { StaffService } from './staffService.js';
import type { ServiceResponse } from '../types.db.js';

/**
 * Teacher Service - Wraps StaffService for teacher-specific operations
 * Teachers are essentially staff members with employeeType = 'TEACHER'
 */
export class TeacherService {
  /**
   * Get all teachers for an organization or branch
   */
  static async getAllTeachers(
    organizationId: number,
    branchId?: number,
    includeDeleted: boolean = false
  ): Promise<ServiceResponse<any[]>> {
    try {
      const result = await StaffService.getAllStaff(organizationId, branchId, includeDeleted);
      
      if (!result.success) {
        return result;
      }

      // Filter only teachers
      const teachers = result.data?.filter(staff => staff.employeeType === 'TEACHER') || [];
      
      return {
        success: true,
        data: teachers
      };
    } catch (error) {
      console.error('Error fetching teachers:', error);
      return {
        success: false,
        error: 'Failed to fetch teachers'
      };
    }
  }

  /**
   * Get teacher by ID
   */
  static async getTeacherById(
    teacherId: number,
    userBranchId?: number
  ): Promise<ServiceResponse<any>> {
    try {
      const result = await StaffService.getStaffById(teacherId, userBranchId);
      
      if (!result.success) {
        return result;
      }

      // Ensure it's a teacher
      if (result.data?.employeeType !== 'TEACHER') {
        return {
          success: false,
          error: 'Teacher not found'
        };
      }

      return result;
    } catch (error) {
      console.error('Error fetching teacher:', error);
      return {
        success: false,
        error: 'Failed to fetch teacher'
      };
    }
  }

  /**
   * Create a new teacher
   */
  static async createTeacher(
    teacherData: any,
    userBranchId?: number
  ): Promise<ServiceResponse<any>> {
    try {
      // Force employee type to TEACHER
      const data = {
        ...teacherData,
        employeeType: 'TEACHER'
      };

      return await StaffService.createStaff(data, userBranchId);
    } catch (error) {
      console.error('Error creating teacher:', error);
      return {
        success: false,
        error: 'Failed to create teacher'
      };
    }
  }

  /**
   * Update teacher
   */
  static async updateTeacher(
    teacherData: any,
    userBranchId?: number
  ): Promise<ServiceResponse<any>> {
    try {
      // Ensure we're updating a teacher
      const existingResult = await this.getTeacherById(teacherData.id, userBranchId);
      if (!existingResult.success) {
        return existingResult;
      }

      return await StaffService.updateStaff(teacherData, userBranchId);
    } catch (error) {
      console.error('Error updating teacher:', error);
      return {
        success: false,
        error: 'Failed to update teacher'
      };
    }
  }

  /**
   * Delete teacher (soft delete)
   */
  static async deleteTeacher(
    teacherId: number,
    userBranchId?: number
  ): Promise<ServiceResponse<void>> {
    try {
      // Ensure we're deleting a teacher
      const existingResult = await this.getTeacherById(teacherId, userBranchId);
      if (!existingResult.success) {
        return existingResult;
      }

      return await StaffService.deleteStaff(teacherId, userBranchId);
    } catch (error) {
      console.error('Error deleting teacher:', error);
      return {
        success: false,
        error: 'Failed to delete teacher'
      };
    }
  }

  /**
   * Restore deleted teacher
   */
  static async restoreTeacher(
    teacherId: number,
    userBranchId?: number
  ): Promise<ServiceResponse<any>> {
    try {
      return await StaffService.restoreStaff(teacherId, userBranchId);
    } catch (error) {
      console.error('Error restoring teacher:', error);
      return {
        success: false,
        error: 'Failed to restore teacher'
      };
    }
  }
}