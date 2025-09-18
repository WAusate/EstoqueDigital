import {
  users,
  materials,
  stockMovements,
  requisitions,
  auditLogs,
  type User,
  type UpsertUser,
  type Material,
  type InsertMaterial,
  type StockMovement,
  type InsertStockMovement,
  type Requisition,
  type InsertRequisition,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db as databaseClient } from "./db";
import { eq, and, desc, gte, lte, sql, count } from "drizzle-orm";
import { randomUUID } from "crypto";

type DatabaseClient = NonNullable<typeof databaseClient>;

type UserSummary = Pick<User, "id" | "firstName" | "lastName" | "email">;
type EmployeeRequisitionDetails = Requisition & {
  material: Pick<Material, "id" | "name" | "code" | "unit">;
  createdBy: UserSummary | null;
};

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createEmployeeUser(params: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<User>;

  // Material operations
  getMaterials(): Promise<Material[]>;
  getMaterial(id: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material>;
  deleteMaterial(id: string): Promise<void>;
  updateMaterialStock(materialId: string, newStock: number): Promise<void>;
  
  // Stock movement operations
  getStockMovements(materialId?: string): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  
  // Requisition operations
  getRequisitions(employeeId?: string): Promise<Requisition[]>;
  getEmployeeRequisitionsWithDetails(employeeId: string): Promise<EmployeeRequisitionDetails[]>;
  createRequisition(requisition: InsertRequisition): Promise<Requisition>;
  updateRequisition(id: string, requisition: Partial<InsertRequisition>): Promise<Requisition>;
  signRequisition(
    id: string,
    signedByDevice?: string,
    signedByIp?: string,
    signerId?: string,
  ): Promise<Requisition>;
  
  // Dashboard operations
  getDashboardStats(startDate?: Date, endDate?: Date): Promise<any>;
  getMaterialsWithLowStock(): Promise<Material[]>;
  
  // Audit operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(): Promise<AuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  constructor(private readonly db: DatabaseClient) {}

  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const insertPayload = {
      ...userData,
      id: userData.id ?? randomUUID(),
    } satisfies UpsertUser;

    const [user] = await this.db
      .insert(users)
      .values(insertPayload)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase();
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));
    return user;
  }

  async createEmployeeUser({
    name,
    email,
    passwordHash,
  }: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<User> {
    const normalizedEmail = email.toLowerCase();
    const trimmedName = name.trim();
    const [firstName, ...rest] = trimmedName.split(/\s+/);
    const lastName = rest.length > 0 ? rest.join(" ") : null;

    const [user] = await this.db
      .insert(users)
      .values({
        id: randomUUID(),
        email: normalizedEmail,
        firstName: firstName || trimmedName,
        lastName: lastName || null,
        passwordHash,
        role: 'FUNCIONARIO',
      })
      .returning();

    return user;
  }

  // Material operations
  async getMaterials(): Promise<Material[]> {
    return await this.db.select().from(materials).orderBy(materials.name);
  }

  async getMaterial(id: string): Promise<Material | undefined> {
    const [material] = await this.db.select().from(materials).where(eq(materials.id, id));
    return material;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [newMaterial] = await this.db
      .insert(materials)
      .values({ ...material, id: randomUUID() })
      .returning();
    return newMaterial;
  }

  async updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material> {
    const [updatedMaterial] = await this.db
      .update(materials)
      .set({ ...material, updatedAt: new Date() })
      .where(eq(materials.id, id))
      .returning();
    return updatedMaterial;
  }

  async deleteMaterial(id: string): Promise<void> {
    await this.db.delete(materials).where(eq(materials.id, id));
  }

  async updateMaterialStock(materialId: string, newStock: number): Promise<void> {
    await this.db
      .update(materials)
      .set({ currentStock: newStock, updatedAt: new Date() })
      .where(eq(materials.id, materialId));
  }
  
  // Stock movement operations
  async getStockMovements(materialId?: string): Promise<StockMovement[]> {
    const query = this.db
      .select()
      .from(stockMovements)
      .orderBy(desc(stockMovements.createdAt));
    
    if (materialId) {
      return await query.where(eq(stockMovements.materialId, materialId));
    }
    
    return await query;
  }

  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    const [newMovement] = await this.db
      .insert(stockMovements)
      .values({ ...movement, id: randomUUID() })
      .returning();

    // Update material stock
    const material = await this.getMaterial(movement.materialId);
    if (material) {
      let newStock = material.currentStock;
      if (movement.type === 'ENTRADA' || movement.type === 'AJUSTE') {
        newStock += movement.quantity;
      } else if (movement.type === 'SAIDA') {
        newStock -= movement.quantity;
      }
      await this.updateMaterialStock(movement.materialId, Math.max(0, newStock));
    }
    
    return newMovement;
  }
  
  // Requisition operations
  async getRequisitions(employeeId?: string): Promise<Requisition[]> {
    const query = this.db
      .select()
      .from(requisitions)
      .orderBy(desc(requisitions.createdAt));

    if (employeeId) {
      return await query.where(eq(requisitions.employeeId, employeeId));
    }

    return await query;
  }

  async getEmployeeRequisitionsWithDetails(
    employeeId: string,
  ): Promise<EmployeeRequisitionDetails[]> {
    return await this.db.query.requisitions.findMany({
      where: eq(requisitions.employeeId, employeeId),
      orderBy: desc(requisitions.createdAt),
      with: {
        material: {
          columns: {
            id: true,
            name: true,
            code: true,
            unit: true,
          },
        },
        createdBy: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async createRequisition(requisition: InsertRequisition): Promise<Requisition> {
    const [newRequisition] = await this.db
      .insert(requisitions)
      .values({ ...requisition, id: randomUUID() })
      .returning();
    return newRequisition;
  }

  async updateRequisition(id: string, requisition: Partial<InsertRequisition>): Promise<Requisition> {
    const [updatedRequisition] = await this.db
      .update(requisitions)
      .set({ ...requisition, updatedAt: new Date() })
      .where(eq(requisitions.id, id))
      .returning();
    return updatedRequisition;
  }

  async signRequisition(
    id: string,
    signedByDevice?: string,
    signedByIp?: string,
    signerId?: string,
  ): Promise<Requisition> {
    const requisition = await this.db.query.requisitions.findFirst({
      where: eq(requisitions.id, id),
      with: {
        material: true,
        employee: true,
      },
    });

    if (!requisition) {
      const error = new Error("Requisition not found");
      (error as any).status = 404;
      throw error;
    }

    if (signerId && requisition.employeeId !== signerId) {
      const error = new Error("Unauthorized to sign this requisition");
      (error as any).status = 403;
      throw error;
    }

    if (requisition.status === 'ASSINADA') {
      const error = new Error("Requisition already signed");
      (error as any).status = 400;
      throw error;
    }

    const [signedRequisition] = await this.db
      .update(requisitions)
      .set({
        status: 'ASSINADA',
        signedAt: new Date(),
        signedByDevice,
        signedByIp,
        updatedAt: new Date(),
      })
      .where(eq(requisitions.id, id))
      .returning();

    const observationText = requisition.observation
      ? `Requisição assinada - ${requisition.observation}`
      : 'Requisição assinada';

    await this.createStockMovement({
      materialId: requisition.materialId,
      type: 'SAIDA',
      quantity: requisition.quantity,
      observation: observationText,
      userId: requisition.employeeId,
      requisitionId: id,
    });

    return signedRequisition;
  }
  
  // Dashboard operations
  async getDashboardStats(startDate?: Date, endDate?: Date): Promise<any> {
    const whereClause = startDate && endDate 
      ? and(
          gte(stockMovements.createdAt, startDate),
          lte(stockMovements.createdAt, endDate)
        )
      : undefined;
    
    const [totalRequisitions] = await this.db
      .select({ count: count() })
      .from(requisitions)
      .where(whereClause ? and(
          gte(requisitions.createdAt, startDate!),
          lte(requisitions.createdAt, endDate!)
        ) : undefined);

    const [totalMovements] = await this.db
      .select({ count: count() })
      .from(stockMovements)
      .where(whereClause);
    
    const lowStockMaterials = await this.getMaterialsWithLowStock();
    
    return {
      totalRequisitions: totalRequisitions.count,
      totalMovements: totalMovements.count,
      lowStockItems: lowStockMaterials.length,
      criticalStockItems: lowStockMaterials.filter(m => m.currentStock === 0).length,
    };
  }

  async getMaterialsWithLowStock(): Promise<Material[]> {
    return await this.db
      .select()
      .from(materials)
      .where(sql`${materials.currentStock} <= ${materials.minimumStock}`);
  }
  
  // Audit operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await this.db
      .insert(auditLogs)
      .values({ ...log, id: randomUUID() })
      .returning();
    return newLog;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return await this.db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(1000); // Limit to prevent excessive data loading
  }
}

async function runSetupStatement(db: DatabaseClient, statement: string) {
  try {
    await db.execute(sql.raw(statement));
  } catch (error) {
    const preview = statement
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(" ");
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof Error) {
      throw new Error(`Failed to execute database setup step (${preview}): ${message}`, {
        cause: error,
      });
    }
    throw new Error(`Failed to execute database setup step (${preview}): ${message}`);
  }
}

async function ensureDatabaseSchema(db: DatabaseClient) {
  const setupStatements = [
    `CREATE TYPE IF NOT EXISTS "user_role" AS ENUM ('ADMIN', 'ESTOQUE', 'FUNCIONARIO')`,
    `CREATE TYPE IF NOT EXISTS "movement_type" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE')`,
    `CREATE TYPE IF NOT EXISTS "requisition_status" AS ENUM ('PENDENTE', 'ASSINADA', 'CANCELADA')`,
    `CREATE TABLE IF NOT EXISTS "users" (
      "id" varchar PRIMARY KEY,
      "email" varchar,
      "first_name" varchar,
      "last_name" varchar,
      "profile_image_url" varchar,
      "password_hash" varchar,
      "role" user_role NOT NULL DEFAULT 'FUNCIONARIO',
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "materials" (
      "id" varchar PRIMARY KEY,
      "name" text NOT NULL,
      "code" varchar NOT NULL,
      "unit" varchar NOT NULL,
      "unit_price" numeric(10, 2),
      "minimum_stock" integer DEFAULT 0,
      "current_stock" integer DEFAULT 0,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "requisitions" (
      "id" varchar PRIMARY KEY,
      "employee_id" varchar NOT NULL,
      "material_id" varchar NOT NULL,
      "quantity" integer NOT NULL,
      "observation" text,
      "status" requisition_status NOT NULL DEFAULT 'PENDENTE',
      "created_by_id" varchar NOT NULL,
      "signed_at" timestamp,
      "signed_by_device" varchar,
      "signed_by_ip" varchar,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "stock_movements" (
      "id" varchar PRIMARY KEY,
      "material_id" varchar NOT NULL,
      "type" movement_type NOT NULL,
      "quantity" integer NOT NULL,
      "unit_price" numeric(10, 2),
      "observation" text,
      "user_id" varchar NOT NULL,
      "requisition_id" varchar,
      "created_at" timestamp DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" varchar PRIMARY KEY,
      "user_id" varchar NOT NULL,
      "action" varchar NOT NULL,
      "entity_type" varchar NOT NULL,
      "entity_id" varchar NOT NULL,
      "changes" jsonb,
      "ip_address" varchar,
      "user_agent" varchar,
      "created_at" timestamp DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users" ("email")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "materials_code_key" ON "materials" ("code")`,
  ];

  const alterStatements = [
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" varchar`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" varchar`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" varchar`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_image_url" varchar`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" varchar`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" user_role NOT NULL DEFAULT 'FUNCIONARIO'`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now()`,
    `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'FUNCIONARIO'::user_role`,
    `ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now()`,
    `ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    `ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "unit_price" numeric(10, 2)`,
    `ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "minimum_stock" integer DEFAULT 0`,
    `ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "current_stock" integer DEFAULT 0`,
    `ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()`,
    `ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now()`,
    `ALTER TABLE "materials" ALTER COLUMN "minimum_stock" SET DEFAULT 0`,
    `ALTER TABLE "materials" ALTER COLUMN "current_stock" SET DEFAULT 0`,
    `ALTER TABLE "materials" ALTER COLUMN "created_at" SET DEFAULT now()`,
    `ALTER TABLE "materials" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    `ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "employee_id" varchar`,
    `ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "material_id" varchar`,
    `ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "quantity" integer`,
    `ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "observation" text`,
    `ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "status" requisition_status NOT NULL DEFAULT 'PENDENTE'`,
    `ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "created_by_id" varchar`,
    `ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "signed_at" timestamp`,
    `ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "signed_by_device" varchar`,
    `ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "signed_by_ip" varchar`,
    `ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()`,
    `ALTER TABLE "requisitions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now()`,
    `ALTER TABLE "requisitions" ALTER COLUMN "status" SET DEFAULT 'PENDENTE'::requisition_status`,
    `ALTER TABLE "requisitions" ALTER COLUMN "created_at" SET DEFAULT now()`,
    `ALTER TABLE "requisitions" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    `ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "material_id" varchar`,
    `ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "type" movement_type`,
    `ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "quantity" integer`,
    `ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "unit_price" numeric(10, 2)`,
    `ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "observation" text`,
    `ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "user_id" varchar`,
    `ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "requisition_id" varchar`,
    `ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()`,
    `ALTER TABLE "stock_movements" ALTER COLUMN "created_at" SET DEFAULT now()`,
    `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "user_id" varchar`,
    `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "action" varchar`,
    `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entity_type" varchar`,
    `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entity_id" varchar`,
    `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "changes" jsonb`,
    `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "ip_address" varchar`,
    `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "user_agent" varchar`,
    `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()`,
    `ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DEFAULT now()`
  ];

  for (const statement of setupStatements) {
    await runSetupStatement(db, statement);
  }
  for (const statement of alterStatements) {
    await runSetupStatement(db, statement);
  }
}

class InMemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private materials = new Map<string, Material>();
  private stockMovements = new Map<string, StockMovement>();
  private requisitions = new Map<string, Requisition>();
  private auditLogs = new Map<string, AuditLog>();

  private now() {
    return new Date();
  }

  private cloneArray<T>(items: Iterable<T>): T[] {
    return Array.from(items).map((item) => ({ ...item }));
  }

  private toTimestamp(value: Date | null | undefined) {
    return value instanceof Date ? value.getTime() : 0;
  }

  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    return user ? { ...user } : undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const id = userData.id ?? randomUUID();
    const existing = this.users.get(id);
    const now = this.now();
    const normalizedEmail = userData.email?.toLowerCase() ?? existing?.email ?? null;

    const user: User = {
      id,
      email: normalizedEmail,
      firstName: userData.firstName ?? existing?.firstName ?? null,
      lastName: userData.lastName ?? existing?.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? existing?.profileImageUrl ?? null,
      passwordHash: userData.passwordHash ?? existing?.passwordHash ?? null,
      role: (userData.role ?? existing?.role ?? "FUNCIONARIO") as User["role"],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.users.set(id, user);
    return { ...user };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalized = email.toLowerCase();
    for (const user of Array.from(this.users.values())) {
      if (user.email?.toLowerCase() === normalized) {
        return { ...user };
      }
    }
    return undefined;
  }

  async createEmployeeUser({
    name,
    email,
    passwordHash,
  }: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<User> {
    const trimmedName = name.trim();
    const [firstName, ...rest] = trimmedName.split(/\s+/);
    const lastName = rest.length > 0 ? rest.join(" ") : null;

    return await this.upsertUser({
      id: randomUUID(),
      email: email.toLowerCase(),
      firstName: firstName || trimmedName,
      lastName: lastName ?? null,
      passwordHash,
      role: "FUNCIONARIO",
    });
  }

  // Material operations
  async getMaterials(): Promise<Material[]> {
    return this.cloneArray(this.materials.values()).sort(
      (a, b) => a.name.localeCompare(b.name),
    );
  }

  async getMaterial(id: string): Promise<Material | undefined> {
    const material = this.materials.get(id);
    return material ? { ...material } : undefined;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const now = this.now();
    const record: Material = {
      id: randomUUID(),
      name: material.name,
      code: material.code,
      unit: material.unit,
      unitPrice: material.unitPrice ?? null,
      minimumStock: material.minimumStock ?? 0,
      currentStock: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.materials.set(record.id, record);
    return { ...record };
  }

  async updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material> {
    const existing = this.materials.get(id);
    if (!existing) {
      throw new Error("Material not found");
    }

    const updated: Material = {
      ...existing,
      ...material,
      updatedAt: this.now(),
    };

    this.materials.set(id, updated);
    return { ...updated };
  }

  async deleteMaterial(id: string): Promise<void> {
    this.materials.delete(id);
  }

  async updateMaterialStock(materialId: string, newStock: number): Promise<void> {
    const existing = this.materials.get(materialId);
    if (!existing) {
      return;
    }

    const updated: Material = {
      ...existing,
      currentStock: newStock,
      updatedAt: this.now(),
    };
    this.materials.set(materialId, updated);
  }

  // Stock movement operations
  async getStockMovements(materialId?: string): Promise<StockMovement[]> {
    let movements = this.cloneArray(this.stockMovements.values());
    if (materialId) {
      movements = movements.filter((movement) => movement.materialId === materialId);
    }

    return movements.sort(
      (a, b) => this.toTimestamp(b.createdAt) - this.toTimestamp(a.createdAt),
    );
  }

  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    const now = this.now();
    const record: StockMovement = {
      id: randomUUID(),
      materialId: movement.materialId,
      type: movement.type,
      quantity: movement.quantity,
      unitPrice: movement.unitPrice ?? null,
      observation: movement.observation ?? null,
      userId: movement.userId,
      requisitionId: movement.requisitionId ?? null,
      createdAt: now,
    };

    this.stockMovements.set(record.id, record);

    const material = await this.getMaterial(movement.materialId);
    if (material) {
      let newStock = material.currentStock;
      if (movement.type === "ENTRADA" || movement.type === "AJUSTE") {
        newStock += movement.quantity;
      } else if (movement.type === "SAIDA") {
        newStock -= movement.quantity;
      }
      await this.updateMaterialStock(movement.materialId, Math.max(0, newStock));
    }

    return { ...record };
  }

  // Requisition operations
  async getRequisitions(employeeId?: string): Promise<Requisition[]> {
    let requisitionsList = this.cloneArray(this.requisitions.values());
    if (employeeId) {
      requisitionsList = requisitionsList.filter((item) => item.employeeId === employeeId);
    }

    return requisitionsList.sort(
      (a, b) => this.toTimestamp(b.createdAt) - this.toTimestamp(a.createdAt),
    );
  }

  async getEmployeeRequisitionsWithDetails(
    employeeId: string,
  ): Promise<EmployeeRequisitionDetails[]> {
    const requisitions = await this.getRequisitions(employeeId);

    return requisitions.map((requisition) => {
      const material = this.materials.get(requisition.materialId);
      const createdBy = requisition.createdById
        ? this.users.get(requisition.createdById) ?? null
        : null;

      return {
        ...requisition,
        material: material
          ? {
              id: material.id,
              name: material.name,
              code: material.code,
              unit: material.unit,
            }
          : { id: requisition.materialId, name: "Material", code: "", unit: "" },
        createdBy: createdBy
          ? {
              id: createdBy.id,
              firstName: createdBy.firstName,
              lastName: createdBy.lastName,
              email: createdBy.email,
            }
          : null,
      };
    });
  }

  async createRequisition(requisition: InsertRequisition): Promise<Requisition> {
    const now = this.now();
    const record: Requisition = {
      id: randomUUID(),
      employeeId: requisition.employeeId,
      materialId: requisition.materialId,
      quantity: requisition.quantity,
      observation: requisition.observation ?? null,
      status: requisition.status ?? "PENDENTE",
      createdById: requisition.createdById,
      signedAt: null,
      signedByDevice: null,
      signedByIp: null,
      createdAt: now,
      updatedAt: now,
    };

    this.requisitions.set(record.id, record);
    return { ...record };
  }

  async updateRequisition(id: string, requisition: Partial<InsertRequisition>): Promise<Requisition> {
    const existing = this.requisitions.get(id);
    if (!existing) {
      throw new Error("Requisition not found");
    }

    const updated: Requisition = {
      ...existing,
      ...requisition,
      updatedAt: this.now(),
    };

    this.requisitions.set(id, updated);
    return { ...updated };
  }

  async signRequisition(
    id: string,
    signedByDevice?: string,
    signedByIp?: string,
    signerId?: string,
  ): Promise<Requisition> {
    const requisition = this.requisitions.get(id);

    if (!requisition) {
      const error = new Error("Requisition not found");
      (error as any).status = 404;
      throw error;
    }

    if (signerId && requisition.employeeId !== signerId) {
      const error = new Error("Unauthorized to sign this requisition");
      (error as any).status = 403;
      throw error;
    }

    if (requisition.status === "ASSINADA") {
      const error = new Error("Requisition already signed");
      (error as any).status = 400;
      throw error;
    }

    const updated: Requisition = {
      ...requisition,
      status: "ASSINADA",
      signedAt: this.now(),
      signedByDevice: signedByDevice ?? null,
      signedByIp: signedByIp ?? null,
      updatedAt: this.now(),
    };

    this.requisitions.set(id, updated);

    const observationText = requisition.observation
      ? `Requisição assinada - ${requisition.observation}`
      : "Requisição assinada";

    await this.createStockMovement({
      materialId: requisition.materialId,
      type: "SAIDA",
      quantity: requisition.quantity,
      observation: observationText,
      userId: requisition.employeeId,
      requisitionId: id,
    });

    return { ...updated };
  }

  // Dashboard operations
  async getDashboardStats(startDate?: Date, endDate?: Date): Promise<any> {
    const requisitions = await this.getRequisitions();
    const movements = await this.getStockMovements();

    const isWithinRange = (date: Date | null | undefined) => {
      if (!startDate || !endDate) {
        return true;
      }
      const value = this.toTimestamp(date);
      return value >= startDate.getTime() && value <= endDate.getTime();
    };

    const filteredRequisitions = requisitions.filter((item) => isWithinRange(item.createdAt));
    const filteredMovements = movements.filter((item) => isWithinRange(item.createdAt));
    const lowStockMaterials = await this.getMaterialsWithLowStock();

    return {
      totalRequisitions: filteredRequisitions.length,
      totalMovements: filteredMovements.length,
      lowStockItems: lowStockMaterials.length,
      criticalStockItems: lowStockMaterials.filter((item) => item.currentStock === 0).length,
    };
  }

  async getMaterialsWithLowStock(): Promise<Material[]> {
    return this.cloneArray(this.materials.values()).filter(
      (material) => material.currentStock <= material.minimumStock,
    );
  }

  // Audit operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const now = this.now();
    const record: AuditLog = {
      id: randomUUID(),
      userId: log.userId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      changes: log.changes ?? null,
      ipAddress: log.ipAddress ?? null,
      userAgent: log.userAgent ?? null,
      createdAt: now,
    };

    this.auditLogs.set(record.id, record);
    return { ...record };
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    const audits = this.cloneArray(this.auditLogs.values());
    return audits
      .sort((a, b) => this.toTimestamp(b.createdAt) - this.toTimestamp(a.createdAt))
      .slice(0, 1000);
  }
}

let storageInstance: IStorage = new InMemoryStorage();

if (databaseClient) {
  storageInstance = new DatabaseStorage(databaseClient);
}

export { storageInstance as storage };
