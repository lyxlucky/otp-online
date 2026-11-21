import { pgTable, uuid, text, integer, timestamp, boolean, bigint, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const otpEntries = pgTable('otp_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  issuer: text('issuer'),
  account: text('account'),
  secretCipher: text('secret_cipher').notNull(),
  secretIv: text('secret_iv').notNull(),
  secretTag: text('secret_tag').notNull(),
  algorithm: text('algorithm').default('SHA1').notNull(),
  digits: integer('digits').default(6).notNull(),
  period: integer('period').default(30).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  favorite: boolean('favorite').default(false).notNull(),
  adminOnly: boolean('admin_only').default(false).notNull(),
  restoreKey: text('restore_key').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const passkeys = pgTable('passkeys', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  publicKey: text('public_key').notNull(),
  counter: bigint('counter', { mode: 'number' }).default(0).notNull(),
  label: text('label').notNull(),
  rpId: text('rp_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('passkeys_user_idx').on(table.userId, table.rpId)]);

export const passkeyChallenges = pgTable('passkey_challenges', {
  challenge: text('challenge').primaryKey(),
  purpose: text('purpose').notNull(),
  origin: text('origin').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => [index('passkey_challenges_expiry_idx').on(table.expiresAt)]);

export const recoveryCodes = pgTable('recovery_codes', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  hashes: text('hashes').array().notNull(),
});

export type User = typeof users.$inferSelect;
export type OtpEntry = typeof otpEntries.$inferSelect;
export type NewOtpEntry = typeof otpEntries.$inferInsert;
