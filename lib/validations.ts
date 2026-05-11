import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(64),
  password: z.string().min(1, '密码不能为空').max(128),
});

export const entryCreateSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(120),
  secret: z
    .string()
    .min(8, 'Secret 至少 8 字符')
    .max(512)
    .transform((s) => s.replace(/\s+/g, '').toUpperCase()),
  issuer: z.string().max(120).optional().nullable(),
  account: z.string().max(120).optional().nullable(),
  algorithm: z.enum(['SHA1', 'SHA256', 'SHA512']).optional(),
  digits: z.coerce.number().int().min(6).max(8).optional(),
  period: z.coerce.number().int().min(15).max(120).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const entryUpdateSchema = entryCreateSchema.partial();

export type EntryCreateInput = z.infer<typeof entryCreateSchema>;
export type EntryUpdateInput = z.infer<typeof entryUpdateSchema>;
