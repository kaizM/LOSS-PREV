import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTransactionSchema, insertVideoClipSchema, insertNoteSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parse } from "csv-parse";

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

  // Dashboard statistics
  app.get('/api/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Transactions routes
  app.get('/api/transactions', isAuthenticated, async (req, res) => {
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

  app.get('/api/transactions/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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

  app.patch('/api/transactions/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const transaction = await storage.updateTransactionStatus(
        id,
        status,
        userId,
        `${user.firstName} ${user.lastName}`.trim() || user.email || 'Manager'
      );
      
      res.json(transaction);
    } catch (error) {
      console.error("Error updating transaction status:", error);
      res.status(500).json({ message: "Failed to update transaction status" });
    }
  });

  // POS data upload
  app.post('/api/upload/pos', isAuthenticated, upload.single('posFile'), async (req: any, res) => {
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
  app.post('/api/upload/video', isAuthenticated, upload.single('videoFile'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const { transactionId } = req.body;
      const userId = req.user.claims.sub;
      
      const videoClip = await storage.createVideoClip({
        transactionId: transactionId ? parseInt(transactionId) : undefined,
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        uploadedBy: userId,
      });
      
      res.json(videoClip);
    } catch (error) {
      console.error("Error uploading video:", error);
      res.status(500).json({ message: "Failed to upload video" });
    }
  });

  // Video streaming
  app.get('/api/video/:id', isAuthenticated, async (req, res) => {
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
  app.post('/api/transactions/:id/notes', isAuthenticated, async (req: any, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const { content } = req.body;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const note = await storage.createNote({
        transactionId,
        content,
        authorId: userId,
        authorName: `${user.firstName} ${user.lastName}`.trim() || user.email || 'Manager',
      });
      
      res.json(note);
    } catch (error) {
      console.error("Error creating note:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
