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
};
