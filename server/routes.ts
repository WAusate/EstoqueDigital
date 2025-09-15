import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertMaterialSchema, insertStockMovementSchema, insertRequisitionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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
    } catch (error) {
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
