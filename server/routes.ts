import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertMaterialSchema, insertStockMovementSchema, insertRequisitionSchema } from "@shared/schema";
import { z } from "zod";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(":");

  if (!salt || !key) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(key, "hex");

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}

const employeeRegistrationSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve conter pelo menos 6 caracteres"),
});

const employeeLoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

function sanitizeUser<T extends { passwordHash?: string | null }>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash: _password, ...rest } = user;
  return rest;
}

const employeeOnly: RequestHandler = async (req, res, next) => {
  try {
    const employeeId = req.session.employeeUserId;

    if (!employeeId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const user = await storage.getUser(employeeId);
    if (!user || user.role !== 'FUNCIONARIO') {
      delete req.session.employeeUserId;
      return res.status(403).json({ message: "Acesso restrito a funcionários" });
    }

    res.locals.employeeUser = user;
    next();
  } catch (error) {
    console.error("Error validating employee session:", error);
    res.status(500).json({ message: "Falha ao validar sessão do funcionário" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Employee self-service routes
  app.post('/api/employee/register', async (req, res) => {
    try {
      const payload = employeeRegistrationSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(payload.email);

      if (existingUser) {
        return res.status(400).json({ message: "E-mail já cadastrado" });
      }

      const passwordHash = await hashPassword(payload.password);
      const user = await storage.createEmployeeUser({
        name: payload.name,
        email: payload.email,
        passwordHash,
      });

      res.status(201).json(sanitizeUser(user));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }

      console.error("Error registering employee:", error);
      res.status(500).json({ message: "Falha ao cadastrar funcionário" });
    }
  });

  app.post('/api/employee/login', async (req, res) => {
    try {
      const payload = employeeLoginSchema.parse(req.body);
      const user = await storage.getUserByEmail(payload.email);

      if (!user || user.role !== 'FUNCIONARIO' || !user.passwordHash) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const isValidPassword = await verifyPassword(payload.password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      req.session.employeeUserId = user.id;
      res.json(sanitizeUser(user));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }

      console.error("Error logging in employee:", error);
      res.status(500).json({ message: "Falha ao realizar login" });
    }
  });

  app.post('/api/employee/logout', (req, res) => {
    delete req.session.employeeUserId;
    res.json({ message: "Logout realizado com sucesso" });
  });

  app.get('/api/employee/me', async (req, res) => {
    try {
      const employeeId = req.session.employeeUserId;

      if (!employeeId) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = await storage.getUser(employeeId);
      if (!user || user.role !== 'FUNCIONARIO') {
        delete req.session.employeeUserId;
        return res.status(403).json({ message: "Acesso restrito a funcionários" });
      }

      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error fetching employee profile:", error);
      res.status(500).json({ message: "Falha ao carregar perfil do funcionário" });
    }
  });

  app.get('/api/employee/requisitions', employeeOnly, async (req, res) => {
    try {
      const employeeId = req.session.employeeUserId!;
      const requisitions = await storage.getEmployeeRequisitionsWithDetails(employeeId);
      res.json(requisitions);
    } catch (error) {
      console.error("Error fetching employee requisitions:", error);
      res.status(500).json({ message: "Falha ao carregar requisições do funcionário" });
    }
  });

  app.post('/api/employee/requisitions/:id/sign', employeeOnly, async (req, res) => {
    try {
      const employeeId = req.session.employeeUserId!;
      const requisition = await storage.signRequisition(
        req.params.id,
        req.get('User-Agent'),
        req.ip,
        employeeId,
      );

      await storage.createAuditLog({
        userId: employeeId,
        action: 'SIGN',
        entityType: 'REQUISITION',
        entityId: req.params.id,
        changes: { status: 'ASSINADA' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json(requisition);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }

      if (error?.status === 400) {
        return res.status(400).json({ message: "Requisição já foi assinada" });
      }

      if (error?.status === 403) {
        return res.status(403).json({ message: "Você não tem permissão para assinar esta requisição" });
      }

      if (error?.status === 404) {
        return res.status(404).json({ message: "Requisição não encontrada" });
      }

      console.error("Error signing requisition for employee:", error);
      res.status(500).json({ message: "Falha ao assinar requisição" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Materials routes
  app.get('/api/materials', isAuthenticated, async (req, res) => {
    try {
      const materials = await storage.getMaterials();
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ message: "Failed to fetch materials" });
    }
  });

  app.get('/api/materials/:id', isAuthenticated, async (req, res) => {
    try {
      const material = await storage.getMaterial(req.params.id);
      if (!material) {
        return res.status(404).json({ message: "Material not found" });
      }
      res.json(material);
    } catch (error) {
      console.error("Error fetching material:", error);
      res.status(500).json({ message: "Failed to fetch material" });
    }
  });

  app.post('/api/materials', isAuthenticated, async (req: any, res) => {
    try {
      const materialData = insertMaterialSchema.parse(req.body);
      const material = await storage.createMaterial(materialData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'CREATE',
        entityType: 'MATERIAL',
        entityId: material.id,
        changes: materialData,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json(material);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating material:", error);
      res.status(500).json({ message: "Failed to create material" });
    }
  });

  app.put('/api/materials/:id', isAuthenticated, async (req: any, res) => {
    try {
      const materialData = insertMaterialSchema.partial().parse(req.body);
      const material = await storage.updateMaterial(req.params.id, materialData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'UPDATE',
        entityType: 'MATERIAL',
        entityId: req.params.id,
        changes: materialData,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json(material);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating material:", error);
      res.status(500).json({ message: "Failed to update material" });
    }
  });

  app.delete('/api/materials/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteMaterial(req.params.id);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'DELETE',
        entityType: 'MATERIAL',
        entityId: req.params.id,
        changes: null,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json({ message: "Material deleted successfully" });
    } catch (error) {
      console.error("Error deleting material:", error);
      res.status(500).json({ message: "Failed to delete material" });
    }
  });

  // Stock movements routes
  app.get('/api/stock-movements', isAuthenticated, async (req, res) => {
    try {
      const materialId = req.query.materialId as string | undefined;
      const movements = await storage.getStockMovements(materialId);
      res.json(movements);
    } catch (error) {
      console.error("Error fetching stock movements:", error);
      res.status(500).json({ message: "Failed to fetch stock movements" });
    }
  });

  app.post('/api/stock-movements', isAuthenticated, async (req: any, res) => {
    try {
      const movementData = insertStockMovementSchema.parse({
        ...req.body,
        userId: req.user.claims.sub,
      });
      const movement = await storage.createStockMovement(movementData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'CREATE',
        entityType: 'STOCK_MOVEMENT',
        entityId: movement.id,
        changes: movementData,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json(movement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating stock movement:", error);
      res.status(500).json({ message: "Failed to create stock movement" });
    }
  });

  // Requisitions routes
  app.get('/api/requisitions', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const employeeId = user?.role === 'FUNCIONARIO' ? req.user.claims.sub : undefined;
      const requisitions = await storage.getRequisitions(employeeId);
      res.json(requisitions);
    } catch (error) {
      console.error("Error fetching requisitions:", error);
      res.status(500).json({ message: "Failed to fetch requisitions" });
    }
  });

  app.post('/api/requisitions', isAuthenticated, async (req: any, res) => {
    try {
      const requisitionData = insertRequisitionSchema.parse({
        ...req.body,
        createdById: req.user.claims.sub,
      });
      const requisition = await storage.createRequisition(requisitionData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'CREATE',
        entityType: 'REQUISITION',
        entityId: requisition.id,
        changes: requisitionData,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json(requisition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating requisition:", error);
      res.status(500).json({ message: "Failed to create requisition" });
    }
  });

  app.post('/api/requisitions/:id/sign', isAuthenticated, async (req: any, res) => {
    try {
      const requisition = await storage.signRequisition(
        req.params.id,
        req.get('User-Agent'),
        req.ip
      );

      // Create audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: 'SIGN',
        entityType: 'REQUISITION',
        entityId: req.params.id,
        changes: { status: 'ASSINADA' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json(requisition);
    } catch (error: any) {
      if (error?.status) {
        return res.status(error.status).json({
          message: error.message || "Failed to sign requisition",
        });
      }

      console.error("Error signing requisition:", error);
      res.status(500).json({ message: "Failed to sign requisition" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const stats = await storage.getDashboardStats(startDate, endDate);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get('/api/dashboard/low-stock', isAuthenticated, async (req, res) => {
    try {
      const materials = await storage.getMaterialsWithLowStock();
      res.json(materials);
    } catch (error) {
      console.error("Error fetching low stock materials:", error);
      res.status(500).json({ message: "Failed to fetch low stock materials" });
    }
  });

  // Audit logs routes
  app.get('/api/audit-logs', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'ADMIN') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
