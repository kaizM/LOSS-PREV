import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PlayCircle, StickyNote, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import TransactionModal from "./transaction-modal";
// FilterControls removed - now handled by parent component
import type { Transaction } from "@shared/schema";

interface TransactionTableProps {
  filters: {
    search: string;
    transactionType: string;
    status: string;
  };
}

export default function TransactionTable({ filters }: TransactionTableProps) {
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/transactions", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.transactionType) params.append('transactionType', filters.transactionType);
      if (filters.status) params.append('status', filters.status);
      
      const response = await fetch(`/api/transactions?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    refetchInterval: 30000,
  });

  const handleTransactionSelect = (transactionId: number) => {
    setSelectedTransactions(prev =>
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTransactions.length === data?.transactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(data?.transactions.map(t => t.id) || []);
    }
  };

  const handleReviewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const toggleDateExpansion = (dateKey: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const isDateExpanded = (dateKey: string) => {
    return expandedDates.has(dateKey);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "investigate":
        return "bg-blue-100 text-blue-800";
      case "escalate":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTransactionTypeBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case "refund":
        return "bg-red-100 text-red-800";
      case "void":
        return "bg-orange-100 text-orange-800";
      case "no sale":
        return "bg-gray-100 text-gray-800";
      case "cancellation":
        return "bg-purple-100 text-purple-800";
      case "manual discount":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  // Group transactions by date and sort by date (newest first)
  const groupTransactionsByDate = (transactions: Transaction[]) => {
    const groups = new Map<string, Transaction[]>();
    
    transactions.forEach(transaction => {
      const dateKey = format(new Date(transaction.date), 'yyyy-MM-dd');
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(transaction);
    });
    
    // Sort dates in descending order (newest first) and sort transactions within each date
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, transactions]) => [
        date,
        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      ] as [string, Transaction[]]);
  };

  if (error) {
    return (
      <Card className="bg-white rounded-lg shadow">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-red-600">Error loading transactions: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white rounded-lg shadow overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-gray-200">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Flagged Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedTransactions.length === data?.transactions.length && data?.transactions.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Register</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Transaction Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9} className="h-16">
                        <div className="flex items-center space-x-4">
                          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No transactions found matching the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  groupTransactionsByDate(data?.transactions || []).map(([dateKey, transactions]) => (
                    <React.Fragment key={dateKey}>
                      {/* Date Header Row */}
                      <TableRow 
                        className="bg-blue-50 hover:bg-blue-100 cursor-pointer" 
                        onClick={() => toggleDateExpansion(dateKey)}
                      >
                        <TableCell colSpan={9} className="py-4 px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {isDateExpanded(dateKey) ? (
                                <ChevronDown className="h-5 w-5 text-blue-700" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-blue-700" />
                              )}
                              <h3 className="text-lg font-semibold text-blue-900">
                                {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
                              </h3>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-blue-100 text-blue-800">
                                {transactions.length} transactions
                              </Badge>
                              <Badge className="bg-red-100 text-red-800">
                                {transactions.filter(t => t.status === 'pending').length} pending
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Transactions for this date */}
                      {isDateExpanded(dateKey) && transactions.map((transaction) => (
                        <TableRow key={transaction.id} className="hover:bg-gray-50">
                          <TableCell>
                            <Checkbox
                              checked={selectedTransactions.includes(transaction.id)}
                              onCheckedChange={() => handleTransactionSelect(transaction.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-900">
                              {format(new Date(transaction.date), "HH:mm:ss")}
                            </div>
                            <div className="text-xs text-gray-500">
                              {transaction.transactionId}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-900">
                            {transaction.registerId}
                          </TableCell>
                          <TableCell className="text-sm text-gray-900">
                            {transaction.employeeName}
                          </TableCell>
                          <TableCell>
                            <Badge className={getTransactionTypeBadgeVariant(transaction.transactionType)}>
                              {transaction.transactionType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-900 font-medium">
                            ${parseFloat(transaction.amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeVariant(transaction.status)}>
                              {transaction.status === "pending" ? "Pending Review" : transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary/80"
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReviewTransaction(transaction)}
                                className="text-primary hover:text-primary/80"
                              >
                                Review
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:text-gray-800"
                              >
                                <StickyNote className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Summary */}
          {data && data.total > 0 && (
            <div className="flex items-center justify-center px-6 py-4 border-t">
              <div className="text-sm text-gray-600">
                Showing all {data.total} transactions
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
