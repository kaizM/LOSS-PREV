import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Video, Camera, CheckCircle, XCircle, Loader2, Play } from "lucide-react";

interface FeedTestResult {
  success: boolean;
  message: string;
  feedUrl?: string;
  streamUrl?: string;
  system?: string;
  channels?: number;
  timestamp: string;
}

export default function CameraFeedTest() {
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<FeedTestResult | null>(null);
  const [cameraConfig, setCameraConfig] = useState({
    ip: "192.168.0.5",
    port: 80,
    username: "admin",
    password: "",
    channel: 1,
  });

  const feedTestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cameras/test-feed", cameraConfig);
      const result = await response.json();
      setTestResult(result);
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Feed Test Successful" : "Feed Test Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof typeof cameraConfig, value: string | number) => {
    setCameraConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestFeed = () => {
    feedTestMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Camera className="h-5 w-5 mr-2" />
            Camera Feed Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ip">DVR IP Address</Label>
              <Input
                id="ip"
                value={cameraConfig.ip}
                onChange={(e) => handleInputChange("ip", e.target.value)}
                placeholder="192.168.0.5"
              />
            </div>
            <div>
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                value={cameraConfig.port}
                onChange={(e) => handleInputChange("port", parseInt(e.target.value) || 80)}
                placeholder="80"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={cameraConfig.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="admin"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={cameraConfig.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Enter DVR password"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="channel">Camera Channel</Label>
              <Input
                id="channel"
                type="number"
                value={cameraConfig.channel}
                onChange={(e) => handleInputChange("channel", parseInt(e.target.value) || 1)}
                min="1"
                max="32"
                placeholder="1"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleTestFeed}
                disabled={feedTestMutation.isPending}
                className="w-full"
              >
                {feedTestMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Test Feed
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 mr-2 text-red-500" />
              )}
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                {testResult.message}
              </AlertDescription>
            </Alert>
            
            {testResult.success && (
              <div className="space-y-3">
                {testResult.system && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">System:</span>
                    <Badge variant="outline">{testResult.system}</Badge>
                  </div>
                )}
                
                {testResult.channels && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Channels:</span>
                    <Badge>{testResult.channels}</Badge>
                  </div>
                )}
                
                {testResult.feedUrl && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Snapshot URL:</span>
                    <div className="p-2 bg-gray-100 rounded text-xs font-mono break-all">
                      {testResult.feedUrl}
                    </div>
                  </div>
                )}
                
                {testResult.streamUrl && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Stream URL:</span>
                    <div className="p-2 bg-gray-100 rounded text-xs font-mono break-all">
                      {testResult.streamUrl}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground">
                  Tested at: {new Date(testResult.timestamp).toLocaleString()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Video className="h-5 w-5 mr-2" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>1. Enter your ALIBI DVR credentials (IP: 192.168.0.5)</p>
            <p>2. Try different ports: 80, 8000, or 8080</p>
            <p>3. Select camera channel (1-32)</p>
            <p>4. Click "Test Feed" to check connectivity</p>
            <p>5. If successful, you'll see the feed URLs for integration</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}