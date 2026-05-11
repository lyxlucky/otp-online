import { pgTable, uuid, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';

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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type OtpEntry = typeof otpEntries.$inferSelect;
export type NewOtpEntry = typeof otpEntries.$inferInsert;
