import OpenAI from "openai";
import type { Transaction } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

interface AIAnalysisResult {
  isSuspicious: boolean;
  suspiciousScore: number; // 0-100 scale
  flags: string[];
  explanation: string;
  recommendations: string[];
}

interface TransactionPattern {
  employeeId: string;
  patterns: {
    voidFrequency: number;
    refundFrequency: number;
    discountFrequency: number;
    averageTransactionAmount: number;
    workingHours: string[];
  };
}

export class AITransactionAnalyzer {
  private transactionPatterns: Map<string, TransactionPattern> = new Map();

  async analyzeTransaction(transaction: Transaction, recentTransactions: Transaction[]): Promise<AIAnalysisResult> {
    // If OpenAI is not available, use fallback analysis
    if (!openai) {
      console.warn('OpenAI API key not available, using fallback analysis');
      return this.fallbackAnalysis(transaction);
    }

    try {
      // Build context for AI analysis
      const context = this.buildAnalysisContext(transaction, recentTransactions);
      
      const prompt = `
You are an expert loss prevention analyst for gas stations. Analyze this transaction for suspicious activity.

GAS STATION CONTEXT:
- Common fraud: Employee voids, fake refunds, manual discounts, no-sales to pocket cash
- Red flags: Multiple voids by same employee, refunds without receipts, manual price overrides
- Suspicious patterns: Transactions during shift changes, unusual times, repetitive amounts
- Employee behavior: Same employee with multiple exceptions, avoiding cameras during transactions

TRANSACTION TO ANALYZE:
${JSON.stringify(transaction, null, 2)}

RECENT CONTEXT (last 50 transactions):
${JSON.stringify(recentTransactions.slice(0, 50), null, 2)}

ANALYSIS INSTRUCTIONS:
1. Assign suspicion score (0-100): 0=normal, 50=monitor, 80+=investigate immediately
2. Identify specific red flags from gas station loss prevention
3. Provide clear explanation of why it's suspicious
4. Give actionable recommendations

Respond in JSON format:
{
  "isSuspicious": boolean,
  "suspiciousScore": number,
  "flags": ["specific flag 1", "specific flag 2"],
  "explanation": "detailed explanation",
  "recommendations": ["action 1", "action 2"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a gas station loss prevention AI expert. Analyze transactions for fraud, theft, and suspicious employee behavior. Focus on patterns specific to gas station environments."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 1500
      });

      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        isSuspicious: analysis.isSuspicious || false,
        suspiciousScore: Math.max(0, Math.min(100, analysis.suspiciousScore || 0)),
        flags: Array.isArray(analysis.flags) ? analysis.flags : [],
        explanation: analysis.explanation || "No analysis available",
        recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : []
      };

    } catch (error) {
      console.error('AI Analysis Error:', error);
      
      // Check if it's a quota error
      if (error.code === 'insufficient_quota') {
        return {
          isSuspicious: false,
          suspiciousScore: 0,
          flags: ['quota_exceeded'],
          explanation: "OpenAI API quota exceeded. Please check your billing and usage limits at https://platform.openai.com/account/billing",
          recommendations: [
            "Add more credits to your OpenAI account",
            "Check your usage at https://platform.openai.com/account/usage",
            "Upgrade your OpenAI plan if needed"
          ]
        };
      }
      
      // Fallback to basic rule-based analysis
      return this.fallbackAnalysis(transaction);
    }
  }

  async analyzeBulkTransactions(transactions: Transaction[]): Promise<{
    results: (AIAnalysisResult & { transactionId: string })[];
    summary: {
      totalSuspicious: number;
      highRiskCount: number;
      commonFlags: string[];
      employeeRisks: { employee: string; riskScore: number; issues: string[] }[];
    };
  }> {
    const results: (AIAnalysisResult & { transactionId: string })[] = [];
    const employeeRisks: Map<string, { riskScore: number; issues: string[] }> = new Map();
    const flagCounts: Map<string, number> = new Map();

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (transaction) => {
        const analysis = await this.analyzeTransaction(transaction, transactions);
        
        // Track employee risks
        const employeeKey = `${transaction.employeeName} (${transaction.registerId})`;
        if (!employeeRisks.has(employeeKey)) {
          employeeRisks.set(employeeKey, { riskScore: 0, issues: [] });
        }
        const employeeRisk = employeeRisks.get(employeeKey)!;
        employeeRisk.riskScore += analysis.suspiciousScore;
        employeeRisk.issues.push(...analysis.flags);

        // Track flag frequency
        analysis.flags.forEach(flag => {
          flagCounts.set(flag, (flagCounts.get(flag) || 0) + 1);
        });

        return {
          ...analysis,
          transactionId: transaction.transactionId
        };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay to respect rate limits
      if (i + batchSize < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Calculate summary
    const suspiciousResults = results.filter(r => r.isSuspicious);
    const highRiskResults = results.filter(r => r.suspiciousScore >= 80);
    const commonFlags = Array.from(flagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([flag]) => flag);

    const employeeRiskArray = Array.from(employeeRisks.entries())
      .map(([employee, risk]) => ({
        employee,
        riskScore: Math.round(risk.riskScore / transactions.filter(t => `${t.employeeName} (${t.registerId})` === employee).length),
        issues: [...new Set(risk.issues)].slice(0, 5)
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    return {
      results,
      summary: {
        totalSuspicious: suspiciousResults.length,
        highRiskCount: highRiskResults.length,
        commonFlags,
        employeeRisks: employeeRiskArray
      }
    };
  }

  private buildAnalysisContext(transaction: Transaction, recentTransactions: Transaction[]): string {
    // Get employee's recent transaction history
    const employeeTransactions = recentTransactions.filter(
      t => t.employeeName === transaction.employeeName && t.registerId === transaction.registerId
    );

    // Calculate employee patterns
    const voidCount = employeeTransactions.filter(t => t.transactionType?.toLowerCase().includes('void')).length;
    const refundCount = employeeTransactions.filter(t => t.transactionType?.toLowerCase().includes('refund')).length;
    const discountCount = employeeTransactions.filter(t => t.transactionType?.toLowerCase().includes('discount')).length;

    return `
Employee Pattern Analysis:
- Recent voids: ${voidCount}
- Recent refunds: ${refundCount}
- Recent discounts: ${discountCount}
- Total recent transactions: ${employeeTransactions.length}
- Transaction time: ${new Date(transaction.date).toLocaleString()}
- Amount: $${transaction.amount}
- Type: ${transaction.transactionType}
`;
  }

  private fallbackAnalysis(transaction: Transaction): AIAnalysisResult {
    const flags: string[] = [];
    let suspiciousScore = 0;

    // Basic rule-based analysis as fallback
    const type = transaction.transactionType?.toLowerCase() || '';
    const amount = parseFloat(transaction.amount);
    const hour = new Date(transaction.date).getHours();

    if (type.includes('void')) {
      flags.push('Transaction void - requires verification');
      suspiciousScore += 30;
    }
    if (type.includes('refund')) {
      flags.push('Refund transaction - verify receipt');
      suspiciousScore += 25;
    }
    if (type.includes('discount')) {
      flags.push('Manual discount applied');
      suspiciousScore += 20;
    }
    if (amount > 100) {
      flags.push('High amount transaction');
      suspiciousScore += 15;
    }
    if (hour < 6 || hour > 22) {
      flags.push('Unusual transaction time');
      suspiciousScore += 10;
    }

    return {
      isSuspicious: suspiciousScore >= 30,
      suspiciousScore,
      flags,
      explanation: `Basic analysis flagged this transaction due to: ${flags.join(', ')}`,
      recommendations: ['Manual review recommended', 'Check security footage', 'Verify with employee']
    };
  }
}

export const aiAnalyzer = new AITransactionAnalyzer();