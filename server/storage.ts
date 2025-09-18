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

    // Atualiza estoque do material
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
      .limit(1000);
  }
}

// Export final storage instance
let storageInstance: IStorage = new InMemoryStorage();
if (databaseClient) {
  storageInstance = new DatabaseStorage();
}
export { storageInstance as storage };
