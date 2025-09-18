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
  private readonly db: DatabaseClient;

  constructor() {
    if (!databaseClient) {
      throw new Error(
        "Database connection is not configured. Set the DATABASE_URL environment variable to enable persistent storage.",
      );
    }
    this.db = databaseClient;
  }

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
        role: "FUNCIONARIO",
      })
      .returning();

    return user;
  }

  // Material operations
  async getMaterials(): Promise<Material[]> {
    return await this.db.select().from(materials).orderBy(materials.name);
  }

  async getMaterial(id: string): Promise<Material | undefined> {
    const [material] = await this.db
      .select()
      .from(materials)
      .where(eq(materials.id, id));
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
    const query = this.db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt));
    
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
    return newMovement;
  }

  // Requisition operations
  async getRequisitions(employeeId?: string): Promise<Requisition[]> {
    const query = this.db.select().from(requisitions).orderBy(desc(requisitions.createdAt));
    
    if (employeeId) {
      return await query.where(eq(requisitions.employeeId, employeeId));
    }
    
    return await query;
  }

  async getEmployeeRequisitionsWithDetails(employeeId: string): Promise<EmployeeRequisitionDetails[]> {
    return await this.db
      .select({
        id: requisitions.id,
        employeeId: requisitions.employeeId,
        materialId: requisitions.materialId,
        quantity: requisitions.quantity,
        observation: requisitions.observation,
        status: requisitions.status,
        createdById: requisitions.createdById,
        signedAt: requisitions.signedAt,
        signedByDevice: requisitions.signedByDevice,
        signedByIp: requisitions.signedByIp,
        createdAt: requisitions.createdAt,
        updatedAt: requisitions.updatedAt,
        material: {
          id: materials.id,
          name: materials.name,
          code: materials.code,
          unit: materials.unit,
        },
        createdBy: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(requisitions)
      .innerJoin(materials, eq(requisitions.materialId, materials.id))
      .leftJoin(users, eq(requisitions.createdById, users.id))
      .where(eq(requisitions.employeeId, employeeId))
      .orderBy(desc(requisitions.createdAt));
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
    const [signedRequisition] = await this.db
      .update(requisitions)
      .set({
        status: "ASSINADA",
        signedAt: new Date(),
        signedByDevice,
        signedByIp,
        updatedAt: new Date(),
      })
      .where(eq(requisitions.id, id))
      .returning();
    return signedRequisition;
  }

  // Dashboard operations
  async getDashboardStats(startDate?: Date, endDate?: Date): Promise<any> {
    let dateFilter = sql`true`;
    if (startDate && endDate) {
      dateFilter = and(
        gte(stockMovements.createdAt, startDate),
        lte(stockMovements.createdAt, endDate)
      ) || sql`true`;
    }

    const [totalMaterials] = await this.db
      .select({ count: count() })
      .from(materials);

    const [lowStockMaterials] = await this.db
      .select({ count: count() })
      .from(materials)
      .where(sql`current_stock <= minimum_stock`);

    const [pendingRequisitions] = await this.db
      .select({ count: count() })
      .from(requisitions)
      .where(eq(requisitions.status, "PENDENTE"));

    const [totalMovements] = await this.db
      .select({ count: count() })
      .from(stockMovements)
      .where(dateFilter);

    return {
      totalMaterials: totalMaterials.count,
      lowStockMaterials: lowStockMaterials.count,
      pendingRequisitions: pendingRequisitions.count,
      totalMovements: totalMovements.count,
    };
  }

  async getMaterialsWithLowStock(): Promise<Material[]> {
    return await this.db
      .select()
      .from(materials)
      .where(sql`current_stock <= minimum_stock`)
      .orderBy(materials.name);
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
      .orderBy(desc(auditLogs.createdAt));
  }
}

// In-memory storage implementation for fallback
export class InMemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private materials = new Map<string, Material>();
  private stockMovements = new Map<string, StockMovement>();
  private requisitions = new Map<string, Requisition>();
  private auditLogs = new Map<string, AuditLog>();

  constructor() {
    // Create a default admin user for development
    const adminUser: User = {
      id: randomUUID(),
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
      profileImageUrl: null,
      passwordHash: null,
      role: "ADMIN",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user: User = {
      ...userData,
      id: userData.id ?? randomUUID(),
      email: userData.email ?? null,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? null,
      passwordHash: userData.passwordHash ?? null,
      role: userData.role ?? "FUNCIONARIO",
      createdAt: userData.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase();
    return Array.from(this.users.values()).find(u => u.email?.toLowerCase() === normalizedEmail);
  }

  async createEmployeeUser({ name, email, passwordHash }: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<User> {
    const normalizedEmail = email.toLowerCase();
    const trimmedName = name.trim();
    const [firstName, ...rest] = trimmedName.split(/\s+/);
    const lastName = rest.length > 0 ? rest.join(" ") : null;

    const user: User = {
      id: randomUUID(),
      email: normalizedEmail,
      firstName: firstName || trimmedName,
      lastName,
      profileImageUrl: null,
      passwordHash,
      role: "FUNCIONARIO",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);
    return user;
  }

  // Material operations
  async getMaterials(): Promise<Material[]> {
    return Array.from(this.materials.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getMaterial(id: string): Promise<Material | undefined> {
    return this.materials.get(id);
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const newMaterial: Material = {
      name: material.name,
      code: material.code,
      unit: material.unit,
      unitPrice: material.unitPrice ?? null,
      minimumStock: material.minimumStock ?? 0,
      currentStock: material.currentStock ?? 0,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.materials.set(newMaterial.id, newMaterial);
    return newMaterial;
  }

  async updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material> {
    const existing = this.materials.get(id);
    if (!existing) throw new Error("Material not found");
    
    const updated: Material = {
      ...existing,
      ...material,
      updatedAt: new Date(),
    };
    this.materials.set(id, updated);
    return updated;
  }

  async deleteMaterial(id: string): Promise<void> {
    this.materials.delete(id);
  }

  async updateMaterialStock(materialId: string, newStock: number): Promise<void> {
    const material = this.materials.get(materialId);
    if (material) {
      material.currentStock = newStock;
      material.updatedAt = new Date();
      this.materials.set(materialId, material);
    }
  }

  // Stock movement operations
  async getStockMovements(materialId?: string): Promise<StockMovement[]> {
    let movements = Array.from(this.stockMovements.values());
    if (materialId) {
      movements = movements.filter(m => m.materialId === materialId);
    }
    return movements.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    const newMovement: StockMovement = {
      ...movement,
      id: randomUUID(),
      unitPrice: movement.unitPrice ?? null,
      observation: movement.observation ?? null,
      requisitionId: movement.requisitionId ?? null,
      createdAt: new Date(),
    };
    this.stockMovements.set(newMovement.id, newMovement);
    return newMovement;
  }

  // Requisition operations
  async getRequisitions(employeeId?: string): Promise<Requisition[]> {
    let reqs = Array.from(this.requisitions.values());
    if (employeeId) {
      reqs = reqs.filter(r => r.employeeId === employeeId);
    }
    return reqs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getEmployeeRequisitionsWithDetails(employeeId: string): Promise<EmployeeRequisitionDetails[]> {
    const reqs = Array.from(this.requisitions.values())
      .filter(r => r.employeeId === employeeId);
    
    return reqs.map(req => {
      const material = this.materials.get(req.materialId);
      const createdBy = this.users.get(req.createdById);
      
      return {
        ...req,
        material: material ? {
          id: material.id,
          name: material.name,
          code: material.code,
          unit: material.unit,
        } : { id: req.materialId, name: 'Unknown', code: 'UNK', unit: 'un' },
        createdBy: createdBy ? {
          id: createdBy.id,
          firstName: createdBy.firstName,
          lastName: createdBy.lastName,
          email: createdBy.email,
        } : null,
      };
    }).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createRequisition(requisition: InsertRequisition): Promise<Requisition> {
    const newRequisition: Requisition = {
      ...requisition,
      id: randomUUID(),
      observation: requisition.observation ?? null,
      status: requisition.status ?? "PENDENTE",
      signedAt: null,
      signedByDevice: null,
      signedByIp: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.requisitions.set(newRequisition.id, newRequisition);
    return newRequisition;
  }

  async updateRequisition(id: string, requisition: Partial<InsertRequisition>): Promise<Requisition> {
    const existing = this.requisitions.get(id);
    if (!existing) throw new Error("Requisition not found");
    
    const updated: Requisition = {
      ...existing,
      ...requisition,
      updatedAt: new Date(),
    };
    this.requisitions.set(id, updated);
    return updated;
  }

  async signRequisition(
    id: string,
    signedByDevice?: string,
    signedByIp?: string,
    signerId?: string,
  ): Promise<Requisition> {
    const existing = this.requisitions.get(id);
    if (!existing) throw new Error("Requisition not found");
    
    const signed: Requisition = {
      ...existing,
      status: "ASSINADA",
      signedAt: new Date(),
      signedByDevice: signedByDevice ?? null,
      signedByIp: signedByIp ?? null,
      updatedAt: new Date(),
    };
    this.requisitions.set(id, signed);
    return signed;
  }

  // Dashboard operations
  async getDashboardStats(startDate?: Date, endDate?: Date): Promise<any> {
    let movements = Array.from(this.stockMovements.values());
    
    if (startDate && endDate) {
      movements = movements.filter(m => 
        m.createdAt && startDate && endDate && m.createdAt >= startDate && m.createdAt <= endDate
      );
    }

    const totalMaterials = this.materials.size;
    const lowStockMaterials = Array.from(this.materials.values())
      .filter(m => m.currentStock <= m.minimumStock).length;
    const pendingRequisitions = Array.from(this.requisitions.values())
      .filter(r => r.status === "PENDENTE").length;

    return {
      totalMaterials,
      lowStockMaterials,
      pendingRequisitions,
      totalMovements: movements.length,
    };
  }

  async getMaterialsWithLowStock(): Promise<Material[]> {
    return Array.from(this.materials.values())
      .filter(m => m.currentStock <= m.minimumStock)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Audit operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const newLog: AuditLog = {
      ...log,
      id: randomUUID(),
      changes: log.changes ?? null,
      ipAddress: log.ipAddress ?? null,
      userAgent: log.userAgent ?? null,
      createdAt: new Date(),
    };
    this.auditLogs.set(newLog.id, newLog);
    return newLog;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }
}

// Export final storage instance
let storageInstance: IStorage = new InMemoryStorage();
if (databaseClient) {
  storageInstance = new DatabaseStorage();
}
export { storageInstance as storage };
