import { integer, sqliteTable, text, index, primaryKey } from 'drizzle-orm/sqlite-core';
export const documentFolders = sqliteTable('document_folders',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),name:text('name').notNull(),parentId:text('parent_id'),createdAt:text('created_at').notNull()
},t=>[index('folders_owner').on(t.ownerId)]);
export const documents=sqliteTable('documents',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),folderId:text('folder_id'),linkedTask:text('linked_task'),name:text('name').notNull(),category:text('category').notNull().default('Uncategorized'),extension:text('extension').notNull(),mime:text('mime').notNull(),size:integer('size').notNull(),objectKey:text('object_key').notNull(),createdAt:text('created_at').notNull()
},t=>[index('documents_owner').on(t.ownerId)]);

export const plannerEvents = sqliteTable('planner_events', {
  owner: text('owner_id').notNull(),
  id: text('event_id').notNull(),
  payload: text('payload'),
  revision: integer('revision').notNull(),
}, table => [primaryKey({columns: [table.owner, table.id]})]);
