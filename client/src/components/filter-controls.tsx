import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download } from "lucide-react";

interface FilterControlsProps {
  onFilterChange: (filters: {
    search: string;
    transactionType: string;
    status: string;
  }) => void;
}

export default function FilterControls({ onFilterChange }: FilterControlsProps) {
  const [search, setSearch] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [status, setStatus] = useState("");

  const handleFilterChange = () => {
    onFilterChange({
      search,
      transactionType: transactionType === "all" ? "" : transactionType,
      status: status === "all" ? "" : status,
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    // Auto-filter on search input
    onFilterChange({
      search: e.target.value,
      transactionType: transactionType === "all" ? "" : transactionType,
      status: status === "all" ? "" : status,
    });
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (transactionType && transactionType !== "all") params.append('transactionType', transactionType);
      if (status && status !== "all") params.append('status', status);
      params.append('format', 'csv');

      const response = await fetch(`/api/transactions/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
            <Select value={transactionType} onValueChange={(value) => {
              setTransactionType(value);
              onFilterChange({
                search,
                transactionType: value === "all" ? "" : value,
                status: status === "all" ? "" : status,
              });
            }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Transaction Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transaction Types</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
                <SelectItem value="void">Voids</SelectItem>
                <SelectItem value="no sale">No Sales</SelectItem>
                <SelectItem value="cancellation">Cancellations</SelectItem>
                <SelectItem value="manual discount">Manual Discounts</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => {
              setStatus(value);
              onFilterChange({
                search,
                transactionType: transactionType === "all" ? "" : transactionType,
                status: value === "all" ? "" : value,
              });
            }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="investigate">Investigate</SelectItem>
                <SelectItem value="escalate">Escalate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleFilterChange} className="bg-primary hover:bg-primary/90">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button onClick={handleExport} variant="outline" className="bg-gray-600 text-white hover:bg-gray-700">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
