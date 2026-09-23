const { z } = require('zod');

/**
 * Express middleware factory — validates req.body against a Zod schema.
 * Returns 400 with field-level error messages on failure.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ message: errors[0].message, errors });
    }
    req.body = result.data; // use coerced/trimmed values
    next();
  };
}

// ── Schemas ────────────────────────────────────────────────────────────────────

const signupSchema = z.object({
  username: z
    .string({ required_error: 'Username is required' })
    .min(2, 'Username must be at least 2 characters')
    .max(50, 'Username must be under 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores')
    .transform((v) => v.trim()),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .transform((v) => v.trim().toLowerCase()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be under 100 characters'),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .transform((v) => v.trim().toLowerCase()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

const createConversationSchema = z.object({
  type: z.enum(['direct', 'group'], {
    required_error: 'type is required',
    invalid_type_error: 'type must be "direct" or "group"',
  }),
  name: z.string().max(100).optional().nullable(),
  memberIds: z
    .array(z.string().uuid('Invalid member ID'))
    .min(1, 'At least one member is required'),
}).refine(
  (data) => data.type !== 'group' || (data.name && data.name.trim().length > 0),
  { message: 'Group name is required', path: ['name'] }
);

module.exports = {
  validate,
  signupSchema,
  loginSchema,
  createConversationSchema,
};
