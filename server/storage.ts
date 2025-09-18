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

  // ... (restante das implementações de DatabaseStorage iguais às que você já tem)
}

// InMemoryStorage definido aqui (igual ao que já existe na sua versão codex)
// ...

// Export final storage instance
let storageInstance: IStorage = new InMemoryStorage();
if (databaseClient) {
  storageInstance = new DatabaseStorage();
}
export { storageInstance as storage };
