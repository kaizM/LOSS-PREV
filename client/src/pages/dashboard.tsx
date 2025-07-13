import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Shield, User, LogOut, FileSpreadsheet, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsOverview from "@/components/stats-overview";
import UploadSection from "@/components/upload-section";
import FilterControls from "@/components/filter-controls";
import TransactionTable from "@/components/transaction-table";
import CameraIntegration from "@/components/camera-integration";
import { BulkAIAnalysisDisplay } from "@/components/ai-analysis-display";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    search: "",
    transactionType: "",
    status: "",
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      window.location.reload();
    } catch (error) {
      console.error("Logout error:", error);
      window.location.reload();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Loss Prevention Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                <span>Store #{user?.storeId || "001"}</span> | <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                {user?.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Manager profile" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || "Manager"
                  }
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <StatsOverview />
            </div>
            <div className="lg:col-span-1">
              <BulkAIAnalysisDisplay />
            </div>
          </div>
          
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="upload">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Upload Data
              </TabsTrigger>
              <TabsTrigger value="cameras">
                <Camera className="h-4 w-4 mr-2" />
                Camera System
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="transactions" className="space-y-6">
              <FilterControls onFilterChange={setFilters} />
              <TransactionTable filters={filters} />
            </TabsContent>
            
            <TabsContent value="upload" className="space-y-6">
              <UploadSection />
            </TabsContent>
            
            <TabsContent value="cameras" className="space-y-6">
              <CameraIntegration />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
