import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  oauthProvider: text('oauth_provider'),
  oauthId: text('oauth_id'),
  createdAt: integer('created_at').notNull(),
});

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  docLength: integer('doc_length').notNull().default(0),
  timestamp: integer('timestamp').notNull(),
  classification: text('classification').notNull().default('General'),
}, (t) => ({
  userIdIdx: index('documents_user_idx').on(t.userId),
  userUrlUnq: uniqueIndex('documents_user_url_unq').on(t.userId, t.url),
}));

export const invertedIndex = sqliteTable('inverted_index', {
  term: text('term').notNull(),
  docId: text('doc_id').notNull(),
  weight: real('weight').notNull(),
  userId: text('user_id').notNull(),
}, (t) => ({
  termDocPk: uniqueIndex('ii_term_doc_unq').on(t.term, t.docId),
  termIdx: index('ii_term_idx').on(t.term),
  userIdIdx: index('ii_user_idx').on(t.userId),
}));

export const searchLogs = sqliteTable('search_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  query: text('query').notNull(),
  resultCount: integer('result_count').notNull(),
  responseMs: integer('response_ms').notNull(),
  timestamp: integer('timestamp').notNull(),
}, (t) => ({
  userIdIdx: index('sl_user_idx').on(t.userId),
}));

export const crawlFailures = sqliteTable('crawl_failures', {
  url: text('url').primaryKey(),
  userId: text('user_id').notNull(),
  domain: text('domain').notNull(),
  reason: text('reason').notNull(),
  statusCode: integer('status_code'),
  retryCount: integer('retry_count').notNull().default(0),
  timestamp: integer('timestamp').notNull(),
}, (t) => ({
  userIdIdx: index('cf_user_idx').on(t.userId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
