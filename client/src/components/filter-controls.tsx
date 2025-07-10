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
      transactionType,
      status,
    });
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Export functionality not implemented yet");
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
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Transaction Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Transaction Types</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
                <SelectItem value="void">Voids</SelectItem>
                <SelectItem value="no sale">No Sales</SelectItem>
                <SelectItem value="cancellation">Cancellations</SelectItem>
                <SelectItem value="manual discount">Manual Discounts</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
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
