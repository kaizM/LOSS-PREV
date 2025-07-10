import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlayCircle, StickyNote } from "lucide-react";
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
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/transactions", { ...filters, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.transactionType) params.append('transactionType', filters.transactionType);
      if (filters.status) params.append('status', filters.status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
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
                  data?.transactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedTransactions.includes(transaction.id)}
                          onCheckedChange={() => handleTransactionSelect(transaction.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {format(new Date(transaction.date), "yyyy-MM-dd")}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(transaction.date), "HH:mm:ss")}
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {data && data.total > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(page * limit, data.total)}
                  </span>{" "}
                  of <span className="font-medium">{data.total}</span> results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.ceil(data.total / limit) }, (_, i) => i + 1)
                    .slice(Math.max(0, page - 3), Math.min(Math.ceil(data.total / limit), page + 2))
                    .map((pageNum) => (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(Math.ceil(data.total / limit), p + 1))}
                    disabled={page === Math.ceil(data.total / limit)}
                  >
                    Next
                  </Button>
                </div>
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
