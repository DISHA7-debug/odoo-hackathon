const { z } = require('zod');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLES = ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'];
const USER_STATUSES = ['Active', 'Inactive'];
const DEPARTMENT_STATUSES = ['Active', 'Inactive'];
const ASSET_CONDITIONS = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];
const ASSET_STATUSES = [
  'Available', 'Allocated', 'Reserved', 'Under Maintenance',
  'Lost', 'Retired', 'Disposed',
];
const TRANSFER_DECISIONS = ['Approved', 'Rejected'];
const BOOKING_STATUSES = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'];
const MAINTENANCE_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const MAINTENANCE_STATUSES = [
  'Pending', 'Approved', 'Rejected', 'TechnicianAssigned', 'InProgress', 'Resolved',
];
const AUDIT_CYCLE_STATUSES = ['Open', 'Closed'];
const AUDIT_FINDING_RESULTS = ['Verified', 'Missing', 'Damaged'];

const timestampString = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
  'Invalid timestamp format, use ISO 8601 (e.g. 2026-07-13T09:30:00)'
);

function isValidCalendarDate(val) {
  const [year, month, day] = val.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
  );
}

const dateString = z
  .string()
  .min(1, 'Date is required')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD')
  .refine(isValidCalendarDate, 'Invalid date value');

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  email: z.string().regex(EMAIL_REGEX, 'Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().regex(EMAIL_REGEX, 'Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const departmentCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  head_user_id: z.number().int().positive().nullable().optional(),
  parent_department_id: z.number().int().positive().nullable().optional(),
  status: z.enum(DEPARTMENT_STATUSES).optional(),
});

const departmentUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  head_user_id: z.number().int().positive().nullable().optional(),
  parent_department_id: z.number().int().positive().nullable().optional(),
  status: z.enum(DEPARTMENT_STATUSES).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  custom_fields: z.record(z.unknown()).optional(),
});

const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  custom_fields: z.record(z.unknown()).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

const roleUpdateSchema = z.object({
  role: z.enum(ROLES, { message: 'Invalid role value' }),
});

const assetCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(160),
  category_id: z.number().int().positive('category_id is required'),
  serial_number: z.string().max(80).optional(),
  acquisition_date: dateString.optional(),
  acquisition_cost: z.number({ invalid_type_error: 'acquisition_cost must be a number' }).nonnegative('acquisition_cost cannot be negative').optional(),
  condition: z.enum(ASSET_CONDITIONS).optional(),
  location: z.string().max(160).optional(),
  photo_url: z.string().url().optional().or(z.literal('')),
  is_bookable: z.boolean().optional(),
});

const allocateSchema = z.object({
  employee_id: z.number().int().positive('employee_id is required'),
  department_id: z.number().int().positive().nullable().optional(),
  expected_return_date: dateString.refine(
    (val) => new Date(val) >= new Date(new Date().toISOString().slice(0, 10)),
    { message: 'expected_return_date cannot be in the past' }
  ),
});

const returnSchema = z.object({
  condition_checkin_notes: z.string().optional(),
});

const transferRequestSchema = z.object({
  to_user_id: z.number().int().positive('to_user_id is required'),
});

const transferDecisionSchema = z.object({
  decision: z.enum(TRANSFER_DECISIONS, { message: 'Invalid decision value' }),
});

const bookingCreateSchema = z.object({
  resource_asset_id: z.number().int().positive('resource_asset_id is required'),
  start_time: timestampString,
  end_time: timestampString,
});

const maintenanceCreateSchema = z.object({
  asset_id: z.number().int().positive('asset_id is required'),
  issue_description: z.string().min(1, 'issue_description is required'),
  priority: z.enum(MAINTENANCE_PRIORITIES, { message: 'Invalid priority value' }),
  photo_url: z.string().url().optional().or(z.literal('')),
});

const maintenanceStatusSchema = z.object({
  status: z.enum(MAINTENANCE_STATUSES, { message: 'Invalid status value' }),
  technician: z.string().min(1).max(120).optional(),
});

const auditCycleCreateSchema = z.object({
  scope_department_id: z.number().int().positive().nullable().optional(),
  scope_location: z.string().max(160).optional(),
  date_range_start: dateString,
  date_range_end: dateString,
});

const auditAssignAuditorSchema = z.object({
  auditor_id: z.number().int().positive('auditor_id is required'),
});

const auditFindingSchema = z.object({
  asset_id: z.number().int().positive('asset_id is required'),
  result: z.enum(AUDIT_FINDING_RESULTS, { message: 'Invalid result value' }),
  notes: z.string().optional(),
});

module.exports = {
  ROLES,
  USER_STATUSES,
  DEPARTMENT_STATUSES,
  ASSET_CONDITIONS,
  ASSET_STATUSES,
  signupSchema,
  loginSchema,
  departmentCreateSchema,
  departmentUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  roleUpdateSchema,
  assetCreateSchema,
  allocateSchema,
  returnSchema,
  transferRequestSchema,
  transferDecisionSchema,
  BOOKING_STATUSES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  AUDIT_CYCLE_STATUSES,
  AUDIT_FINDING_RESULTS,
  bookingCreateSchema,
  maintenanceCreateSchema,
  maintenanceStatusSchema,
  auditCycleCreateSchema,
  auditAssignAuditorSchema,
  auditFindingSchema,
};
