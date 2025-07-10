import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Video, Settings, Check, X, Loader2, Camera } from "lucide-react";

interface CameraConfig {
  id: string;
  name: string;
  ip: string;
  port: number;
  username: string;
  password: string;
  channel: number;
  status: "connected" | "disconnected" | "testing";
}

export default function CameraIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cameras, setCameras] = useState<CameraConfig[]>([]);
  const [newCamera, setNewCamera] = useState({
    name: "",
    ip: "",
    port: 8000,
    username: "admin",
    password: "",
    channel: 1,
  });

  const addCameraMutation = useMutation({
    mutationFn: async (camera: Omit<CameraConfig, "id" | "status">) => {
      return apiRequest("POST", "/api/cameras", camera);
    },
    onSuccess: (data) => {
      toast({
        title: "Camera Added",
        description: "Camera configuration saved successfully.",
      });
      setCameras(prev => [...prev, { ...data, status: "disconnected" }]);
      setNewCamera({
        name: "",
        ip: "",
        port: 8000,
        username: "admin",
        password: "",
        channel: 1,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Camera",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testCameraMutation = useMutation({
    mutationFn: async (cameraId: string) => {
      return apiRequest("POST", `/api/cameras/${cameraId}/test`);
    },
    onSuccess: (data, cameraId) => {
      setCameras(prev => prev.map(cam => 
        cam.id === cameraId 
          ? { ...cam, status: data.connected ? "connected" : "disconnected" }
          : cam
      ));
      toast({
        title: data.connected ? "Camera Connected" : "Connection Failed",
        description: data.message,
        variant: data.connected ? "default" : "destructive",
      });
    },
    onError: (error, cameraId) => {
      setCameras(prev => prev.map(cam => 
        cam.id === cameraId ? { ...cam, status: "disconnected" } : cam
      ));
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddCamera = () => {
    if (!newCamera.name || !newCamera.ip || !newCamera.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    addCameraMutation.mutate(newCamera);
  };

  const handleTestCamera = (cameraId: string) => {
    setCameras(prev => prev.map(cam => 
      cam.id === cameraId ? { ...cam, status: "testing" } : cam
    ));
    testCameraMutation.mutate(cameraId);
  };

  const getStatusBadge = (status: CameraConfig["status"]) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Connected</Badge>;
      case "disconnected":
        return <Badge className="bg-red-100 text-red-800"><X className="h-3 w-3 mr-1" />Disconnected</Badge>;
      case "testing":
        return <Badge className="bg-yellow-100 text-yellow-800"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Testing...</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  // Pre-populate with DVR info from uploaded images
  useEffect(() => {
    const dvrConfig = {
      name: "Main DVR System",
      ip: "gngpalacios.alibiddns.com",
      port: 8000,
      username: "admin",
      password: "",
      channel: 1,
    };
    setNewCamera(dvrConfig);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>Camera System Integration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="camera-name">Camera/DVR Name</Label>
              <Input
                id="camera-name"
                value={newCamera.name}
                onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
                placeholder="e.g., Main DVR System"
              />
            </div>
            <div>
              <Label htmlFor="camera-ip">IP Address/Domain</Label>
              <Input
                id="camera-ip"
                value={newCamera.ip}
                onChange={(e) => setNewCamera({ ...newCamera, ip: e.target.value })}
                placeholder="192.168.0.5 or domain.com"
              />
            </div>
            <div>
              <Label htmlFor="camera-port">Port</Label>
              <Input
                id="camera-port"
                type="number"
                value={newCamera.port}
                onChange={(e) => setNewCamera({ ...newCamera, port: parseInt(e.target.value) })}
                placeholder="8000"
              />
            </div>
            <div>
              <Label htmlFor="camera-channel">Channel</Label>
              <Input
                id="camera-channel"
                type="number"
                value={newCamera.channel}
                onChange={(e) => setNewCamera({ ...newCamera, channel: parseInt(e.target.value) })}
                placeholder="1-32"
                min="1"
                max="32"
              />
            </div>
            <div>
              <Label htmlFor="camera-username">Username</Label>
              <Input
                id="camera-username"
                value={newCamera.username}
                onChange={(e) => setNewCamera({ ...newCamera, username: e.target.value })}
                placeholder="admin"
              />
            </div>
            <div>
              <Label htmlFor="camera-password">Password</Label>
              <Input
                id="camera-password"
                type="password"
                value={newCamera.password}
                onChange={(e) => setNewCamera({ ...newCamera, password: e.target.value })}
                placeholder="Enter camera password"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleAddCamera}
              disabled={addCameraMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {addCameraMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 mr-2" />
                  Add Camera
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {cameras.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Configured Cameras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cameras.map((camera) => (
                <div
                  key={camera.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Camera className="h-8 w-8 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">{camera.name}</h3>
                      <p className="text-sm text-gray-500">
                        {camera.ip}:{camera.port} (Channel {camera.channel})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(camera.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestCamera(camera.id)}
                      disabled={testCameraMutation.isPending}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 rounded-full p-2">
              <Video className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">DVR System Detected</h3>
              <p className="text-sm text-blue-700 mt-1">
                Based on your uploaded configuration, I've detected an ALI-QVR5132H DVR system with 32 channels.
                The system is accessible at gngpalacios.alibiddns.com:8000. Configure the connection above to
                integrate live video feeds with your transaction reviews.
              </p>
              <div className="mt-3 text-xs text-blue-600 space-y-1">
                <div>• Model: ALI-QVR5132H (32 channels)</div>
                <div>• HTTP Port: 80, RTSP Port: 1050, Main Port: 8000</div>
                <div>• HTTPS Port: 443</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}