import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Video, FileText, Users } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Shield className="h-16 w-16 text-primary mr-4" />
            <h1 className="text-4xl font-bold text-gray-900">Loss Prevention Dashboard</h1>
          </div>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Automated intelligent loss prevention system for retail environments. 
            Detect suspicious transactions and review security footage with ease.
          </p>
          <Button onClick={handleLogin} size="lg" className="bg-primary hover:bg-primary/90">
            Sign In to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>POS Data Analysis</CardTitle>
              <CardDescription>
                Automatically detect suspicious transactions from POS data including refunds, voids, and cancellations
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Video className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Video Integration</CardTitle>
              <CardDescription>
                Upload and review security footage matched to flagged transactions for comprehensive analysis
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Manager Review</CardTitle>
              <CardDescription>
                Streamlined review process with approval workflows, notes, and audit trails for accountability
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900">Smart Flagging</h3>
              <p className="text-sm text-gray-600">Automatically flag suspicious transactions</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900">Video Review</h3>
              <p className="text-sm text-gray-600">Match transactions with security footage</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900">Audit Trail</h3>
              <p className="text-sm text-gray-600">Complete history of all review actions</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900">Real-time Stats</h3>
              <p className="text-sm text-gray-600">Dashboard with key metrics and alerts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
