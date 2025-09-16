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
import { db } from "./db";
import { eq, and, desc, gte, lte, sql, count } from "drizzle-orm";

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
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
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
    const [user] = await db
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

    const [user] = await db
      .insert(users)
      .values({
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
    return await db.select().from(materials).orderBy(materials.name);
  }

  async getMaterial(id: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [newMaterial] = await db.insert(materials).values(material).returning();
    return newMaterial;
  }

  async updateMaterial(id: string, material: Partial<InsertMaterial>): Promise<Material> {
    const [updatedMaterial] = await db
      .update(materials)
      .set({ ...material, updatedAt: new Date() })
      .where(eq(materials.id, id))
      .returning();
    return updatedMaterial;
  }

  async deleteMaterial(id: string): Promise<void> {
    await db.delete(materials).where(eq(materials.id, id));
  }

  async updateMaterialStock(materialId: string, newStock: number): Promise<void> {
    await db
      .update(materials)
      .set({ currentStock: newStock, updatedAt: new Date() })
      .where(eq(materials.id, materialId));
  }
  
  // Stock movement operations
  async getStockMovements(materialId?: string): Promise<StockMovement[]> {
    const query = db
      .select()
      .from(stockMovements)
      .orderBy(desc(stockMovements.createdAt));
    
    if (materialId) {
      return await query.where(eq(stockMovements.materialId, materialId));
    }
    
    return await query;
  }

  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    const [newMovement] = await db.insert(stockMovements).values(movement).returning();
    
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
    const query = db
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
    return await db.query.requisitions.findMany({
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
    const [newRequisition] = await db.insert(requisitions).values(requisition).returning();
    return newRequisition;
  }

  async updateRequisition(id: string, requisition: Partial<InsertRequisition>): Promise<Requisition> {
    const [updatedRequisition] = await db
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
    const requisition = await db.query.requisitions.findFirst({
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

    const [signedRequisition] = await db
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
    
    const [totalRequisitions] = await db
      .select({ count: count() })
      .from(requisitions)
      .where(whereClause ? and(
          gte(requisitions.createdAt, startDate!),
          lte(requisitions.createdAt, endDate!)
        ) : undefined);
    
    const [totalMovements] = await db
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
    return await db
      .select()
      .from(materials)
      .where(sql`${materials.currentStock} <= ${materials.minimumStock}`);
  }
  
  // Audit operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(1000); // Limit to prevent excessive data loading
  }
}

export const storage = new DatabaseStorage();
