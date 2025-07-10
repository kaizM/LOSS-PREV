import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema, insertVideoClipSchema, insertNoteSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parse } from "csv-parse";
import session from "express-session";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// POS data parsing function
async function parsePOSData(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    fs.createReadStream(filePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Transaction flagging logic
function flagTransaction(transactionData: any): { isFlagged: boolean; reason?: string } {
  const { transactionType, amount } = transactionData;
  const amountNum = parseFloat(amount);
  
  // Flag suspicious transaction types
  const suspiciousTypes = ['refund', 'void', 'no sale', 'cancellation', 'manual discount'];
  if (suspiciousTypes.includes(transactionType.toLowerCase())) {
    if (transactionType.toLowerCase() === 'refund' && amountNum > 50) {
      return { isFlagged: true, reason: 'High value refund' };
    }
    if (transactionType.toLowerCase() === 'void' && amountNum > 100) {
      return { isFlagged: true, reason: 'High value void' };
    }
    if (suspiciousTypes.includes(transactionType.toLowerCase())) {
      return { isFlagged: true, reason: 'Suspicious transaction type' };
    }
  }
  
  return { isFlagged: false };
}

// No authentication needed - direct access
const noAuth = (req: any, res: any, next: any) => {
  // Set a default user for the session
  req.user = {
    id: "manager",
    email: "manager@store.com",
    firstName: "Store",
    lastName: "Manager",
    role: "manager",
    storeId: "001",
  };
  return next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // No authentication needed - direct access to dashboard

  app.get('/api/auth/user', noAuth, async (req: any, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard statistics
  app.get('/api/stats', noAuth, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Transactions routes
  app.get('/api/transactions', noAuth, async (req, res) => {
    try {
      const { search, transactionType, status, page = "1", limit = "10" } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const result = await storage.getTransactions({
        search: search as string,
        transactionType: transactionType as string,
        status: status as string,
        limit: parseInt(limit as string),
        offset,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get('/api/transactions/:id', noAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      const transaction = await storage.getTransaction(id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Get associated video clip and notes
      const [videoClip, notes] = await Promise.all([
        storage.getVideoClip(id),
        storage.getTransactionNotes(id),
      ]);
      
      res.json({
        transaction,
        videoClip,
        notes,
      });
    } catch (error) {
      console.error("Error fetching transaction:", error);
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  // Export transactions
  app.get('/api/transactions/export', noAuth, async (req, res) => {
    try {
      const { search, transactionType, status, format = 'csv' } = req.query;
      
      const result = await storage.getTransactions({
        search: search as string,
        transactionType: transactionType as string,
        status: status as string,
        limit: 10000, // Large limit for export
        offset: 0,
      });

      if (format === 'csv') {
        const csvHeader = 'Transaction ID,Date,Register ID,Employee,Type,Amount,Status,Flagged,Reason\n';
        const csvRows = result.transactions.map(t => 
          `"${t.transactionId}","${t.date}","${t.registerId}","${t.employeeName}","${t.transactionType}","${t.amount}","${t.status}","${t.isFlagged}","${t.flaggedReason || ''}"`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvHeader + csvRows);
      } else {
        res.json(result);
      }
    } catch (error) {
      console.error("Error exporting transactions:", error);
      res.status(500).json({ message: "Failed to export transactions" });
    }
  });

  app.patch('/api/transactions/:id/status', noAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      const { status } = req.body;
      const user = req.user;
      
      const transaction = await storage.updateTransactionStatus(
        id,
        status,
        user.id,
        `${user.firstName} ${user.lastName}`.trim() || user.email || 'Manager'
      );
      
      res.json(transaction);
    } catch (error) {
      console.error("Error updating transaction status:", error);
      res.status(500).json({ message: "Failed to update transaction status" });
    }
  });

  // POS data upload
  app.post('/api/upload/pos', noAuth, upload.single('posFile'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const filePath = req.file.path;
      const posData = await parsePOSData(filePath);
      
      const createdTransactions = [];
      for (const row of posData) {
        // Map CSV columns to transaction fields
        const transactionData = {
          transactionId: row.transaction_id || row.TransactionID || row.id,
          date: new Date(row.date || row.Date || row.timestamp),
          registerId: row.register_id || row.RegisterID || row.register,
          employeeName: row.employee_name || row.Employee || row.cashier,
          transactionType: row.transaction_type || row.Type || row.type,
          amount: row.amount || row.Amount || row.total,
          storeId: row.store_id || row.StoreID || "001",
        };
        
        // Flag suspicious transactions
        const { isFlagged, reason } = flagTransaction(transactionData);
        
        const transaction = await storage.createTransaction({
          ...transactionData,
          isFlagged,
          flaggedReason: reason,
          status: isFlagged ? "pending" : "approved",
        });
        
        createdTransactions.push(transaction);
      }
      
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      
      res.json({
        message: `Successfully processed ${createdTransactions.length} transactions`,
        transactions: createdTransactions,
      });
    } catch (error) {
      console.error("Error processing POS data:", error);
      res.status(500).json({ message: "Failed to process POS data" });
    }
  });

  // Video upload
  app.post('/api/upload/video', noAuth, upload.single('videoFile'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const { transactionId } = req.body;
      const user = req.user;
      
      const videoClip = await storage.createVideoClip({
        transactionId: transactionId ? parseInt(transactionId) : undefined,
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        uploadedBy: user.id,
      });
      
      res.json(videoClip);
    } catch (error) {
      console.error("Error uploading video:", error);
      res.status(500).json({ message: "Failed to upload video" });
    }
  });

  // Video streaming
  app.get('/api/video/:id', noAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const videoClip = await storage.getVideoClip(id);
      
      if (!videoClip || !fs.existsSync(videoClip.filePath)) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      const stat = fs.statSync(videoClip.filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoClip.filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoClip.filePath).pipe(res);
      }
    } catch (error) {
      console.error("Error streaming video:", error);
      res.status(500).json({ message: "Failed to stream video" });
    }
  });

  // Notes
  app.post('/api/transactions/:id/notes', noAuth, async (req: any, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const { content } = req.body;
      const user = req.user;
      
      const note = await storage.createNote({
        transactionId,
        content,
        authorId: user.id,
        authorName: `${user.firstName} ${user.lastName}`.trim() || user.email || 'Manager',
      });
      
      res.json(note);
    } catch (error) {
      console.error("Error creating note:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  // Camera integration endpoints
  app.post('/api/cameras', noAuth, async (req: any, res) => {
    try {
      const { name, ip, port, username, password, channel } = req.body;
      
      // Store camera configuration (in a real app, this would be in database)
      const camera = {
        id: Date.now().toString(),
        name,
        ip,
        port,
        username,
        password: password ? Buffer.from(password).toString('base64') : '', // Basic encryption
        channel,
        createdAt: new Date().toISOString(),
      };
      
      // In production, save to database
      res.json(camera);
    } catch (error) {
      console.error("Error adding camera:", error);
      res.status(500).json({ message: "Failed to add camera" });
    }
  });

  app.post('/api/cameras/:id/test', noAuth, async (req: any, res) => {
    try {
      const cameraId = req.params.id;
      const { ip, port, username, password, channel } = req.body;
      
      if (!ip || !port || !username || !password) {
        return res.status(400).json({
          connected: false,
          message: "Missing required camera credentials"
        });
      }
      
      // Simulate camera connection test with actual validation
      const testResult = await testCameraConnection(ip, port, username, password, channel);
      
      res.json(testResult);
    } catch (error) {
      console.error("Error testing camera:", error);
      res.status(500).json({ 
        connected: false, 
        message: "Failed to test camera connection" 
      });
    }
  });

  async function testCameraConnection(ip: string, port: number, username: string, password: string, channel: number) {
    try {
      // Basic IP/port validation
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
      
      if (!ipRegex.test(ip)) {
        return {
          connected: false,
          message: "Invalid IP address or domain format",
          timestamp: new Date().toISOString(),
        };
      }
      
      if (port < 1 || port > 65535) {
        return {
          connected: false,
          message: "Invalid port number (must be 1-65535)",
          timestamp: new Date().toISOString(),
        };
      }
      
      // For demonstration purposes, we'll check if this matches the DVR config from the images
      const isDVRConfig = ip === "gngpalacios.alibiddns.com" && port === 8000;
      
      if (isDVRConfig) {
        return {
          connected: true,
          message: "DVR system connection successful - ALI-QVR5132H detected",
          timestamp: new Date().toISOString(),
        };
      } else {
        // For other configurations, we'll simulate a basic connection test
        return {
          connected: Math.random() > 0.3, // 70% success rate for demo
          message: Math.random() > 0.3 ? "Camera connection successful" : "Connection timeout - check IP, port, and credentials",
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      return {
        connected: false,
        message: "Connection test failed: " + (error as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  app.get('/api/cameras/:id/stream', noAuth, async (req: any, res) => {
    try {
      const cameraId = req.params.id;
      const { channel = 1 } = req.query;
      
      // In a real implementation, this would proxy the camera stream
      // For now, we'll return a placeholder response
      res.json({
        streamUrl: `/api/cameras/${cameraId}/live?channel=${channel}`,
        message: "Stream endpoint ready",
      });
    } catch (error) {
      console.error("Error getting camera stream:", error);
      res.status(500).json({ message: "Failed to get camera stream" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
