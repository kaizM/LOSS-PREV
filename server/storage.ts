import {
  users,
  transactions,
  videoClips,
  notes,
  auditLogs,
  type User,
  type UpsertUser,
  type Transaction,
  type InsertTransaction,
  type VideoClip,
  type InsertVideoClip,
  type Note,
  type InsertNote,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, count } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Transaction operations
  getTransactions(filters?: {
    search?: string;
    transactionType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: Transaction[]; total: number }>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: number, status: string, performedBy: string, performedByName: string): Promise<Transaction>;
  
  // Video operations
  getVideoClip(transactionId: number): Promise<VideoClip | undefined>;
  createVideoClip(videoClip: InsertVideoClip): Promise<VideoClip>;
  
  // Notes operations
  getTransactionNotes(transactionId: number): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  
  // Audit log operations
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  
  // Statistics
  getStats(): Promise<{
    pendingReview: number;
    flaggedToday: number;
    approved: number;
    videoClips: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
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

  // Transaction operations
  async getTransactions(filters: {
    search?: string;
    transactionType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ transactions: Transaction[]; total: number }> {
    const { search, transactionType, status, limit = 10, offset = 0 } = filters;
    
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(transactions.employeeName, `%${search}%`),
          ilike(transactions.transactionId, `%${search}%`),
          ilike(transactions.registerId, `%${search}%`)
        )
      );
    }
    if (transactionType) {
      conditions.push(eq(transactions.transactionType, transactionType));
    }
    if (status) {
      conditions.push(eq(transactions.status, status));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [transactionsResult, totalResult] = await Promise.all([
      db.select()
        .from(transactions)
        .where(whereClause)
        .orderBy(desc(transactions.date))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() })
        .from(transactions)
        .where(whereClause),
    ]);
    
    return {
      transactions: transactionsResult,
      total: totalResult[0]?.count || 0,
    };
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return transaction;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async updateTransactionStatus(
    id: number,
    status: string,
    performedBy: string,
    performedByName: string
  ): Promise<Transaction> {
    const [transaction] = await db
      .update(transactions)
      .set({ status, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
    
    // Create audit log
    await this.createAuditLog({
      transactionId: id,
      action: status,
      newStatus: status,
      performedBy,
      performedByName,
      details: `Transaction status changed to ${status}`,
    });
    
    return transaction;
  }

  // Video operations
  async getVideoClip(transactionId: number): Promise<VideoClip | undefined> {
    const [videoClip] = await db
      .select()
      .from(videoClips)
      .where(eq(videoClips.transactionId, transactionId));
    return videoClip;
  }

  async createVideoClip(videoClip: InsertVideoClip): Promise<VideoClip> {
    const [newVideoClip] = await db
      .insert(videoClips)
      .values(videoClip)
      .returning();
    return newVideoClip;
  }

  // Notes operations
  async getTransactionNotes(transactionId: number): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(eq(notes.transactionId, transactionId))
      .orderBy(desc(notes.createdAt));
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [newNote] = await db
      .insert(notes)
      .values(note)
      .returning();
    return newNote;
  }

  // Audit log operations
  async createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog> {
    const [newAuditLog] = await db
      .insert(auditLogs)
      .values(auditLog)
      .returning();
    return newAuditLog;
  }

  // Statistics
  async getStats(): Promise<{
    pendingReview: number;
    flaggedToday: number;
    approved: number;
    videoClips: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [pendingReview] = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.status, "pending"));
    
    const [flaggedToday] = await db
      .select({ count: count() })
      .from(transactions)
      .where(and(
        eq(transactions.isFlagged, true),
        eq(transactions.date, today)
      ));
    
    const [approved] = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.status, "approved"));
    
    const [videoClipsCount] = await db
      .select({ count: count() })
      .from(videoClips);
    
    return {
      pendingReview: pendingReview.count,
      flaggedToday: flaggedToday.count,
      approved: approved.count,
      videoClips: videoClipsCount.count,
    };
  }
}

export const storage = new DatabaseStorage();
