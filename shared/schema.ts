import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User role enum
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'ESTOQUE', 'FUNCIONARIO']);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default('FUNCIONARIO'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Materials table
export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: varchar("code").notNull().unique(),
  unit: varchar("unit").notNull(), // kg, un, l, etc.
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  minimumStock: integer("minimum_stock").notNull().default(0),
  currentStock: integer("current_stock").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Movement types enum
export const movementTypeEnum = pgEnum('movement_type', ['ENTRADA', 'SAIDA', 'AJUSTE']);

// Stock movements table
export const stockMovements = pgTable("stock_movements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  materialId: varchar("material_id").notNull().references(() => materials.id),
  type: movementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  observation: text("observation"),
  userId: varchar("user_id").notNull().references(() => users.id),
  requisitionId: varchar("requisition_id").references(() => requisitions.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Requisition status enum
export const requisitionStatusEnum = pgEnum('requisition_status', ['PENDENTE', 'ASSINADA', 'CANCELADA']);

// Requisitions table
export const requisitions = pgTable("requisitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => users.id),
  materialId: varchar("material_id").notNull().references(() => materials.id),
  quantity: integer("quantity").notNull(),
  observation: text("observation"),
  status: requisitionStatusEnum("status").notNull().default('PENDENTE'),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  signedAt: timestamp("signed_at"),
  signedByDevice: varchar("signed_by_device"),
  signedByIp: varchar("signed_by_ip"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  changes: jsonb("changes"),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  stockMovements: many(stockMovements),
  createdRequisitions: many(requisitions, { relationName: "creator" }),
  assignedRequisitions: many(requisitions, { relationName: "employee" }),
  auditLogs: many(auditLogs),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  stockMovements: many(stockMovements),
  requisitions: many(requisitions),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  material: one(materials, {
    fields: [stockMovements.materialId],
    references: [materials.id],
  }),
  user: one(users, {
    fields: [stockMovements.userId],
    references: [users.id],
  }),
  requisition: one(requisitions, {
    fields: [stockMovements.requisitionId],
    references: [requisitions.id],
  }),
}));

export const requisitionsRelations = relations(requisitions, ({ one, many }) => ({
  employee: one(users, {
    fields: [requisitions.employeeId],
    references: [users.id],
    relationName: "employee",
  }),
  createdBy: one(users, {
    fields: [requisitions.createdById],
    references: [users.id],
    relationName: "creator",
  }),
  material: one(materials, {
    fields: [requisitions.materialId],
    references: [materials.id],
  }),
  stockMovements: many(stockMovements),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true, updatedAt: true, currentStock: true });
export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({ id: true, createdAt: true });
export const insertRequisitionSchema = createInsertSchema(requisitions).omit({ id: true, createdAt: true, updatedAt: true, signedAt: true, signedByDevice: true, signedByIp: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;

export type Requisition = typeof requisitions.$inferSelect;
export type InsertRequisition = z.infer<typeof insertRequisitionSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
