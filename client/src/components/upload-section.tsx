import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileSpreadsheet, Video, Upload } from "lucide-react";

export default function UploadSection() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const posUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("posFile", file);
      return apiRequest("POST", "/api/upload/pos", formData);
    },
    onSuccess: async (response) => {
      const result = await response.json();
      let description = result.message;
      
      // Add AI analysis summary if available
      if (result.aiAnalysis) {
        description += `\n\nAI Analysis: ${result.aiAnalysis.totalSuspicious} suspicious transactions found, ${result.aiAnalysis.highRiskCount} high-risk cases escalated`;
      }
      
      toast({
        title: "POS Data Uploaded",
        description,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const videoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("videoFile", file);
      return apiRequest("POST", "/api/upload/video", formData);
    },
    onSuccess: async (response) => {
      const result = await response.json();
      toast({
        title: "Video Uploaded",
        description: "Video file uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onPosDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      posUploadMutation.mutate(file);
    }
  }, [posUploadMutation]);

  const onVideoDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      videoUploadMutation.mutate(file);
    }
  }, [videoUploadMutation]);

  const {
    getRootProps: getPosRootProps,
    getInputProps: getPosInputProps,
    isDragActive: isPosActive,
  } = useDropzone({
    onDrop: onPosDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const {
    getRootProps: getVideoRootProps,
    getInputProps: getVideoInputProps,
    isDragActive: isVideoActive,
  } = useDropzone({
    onDrop: onVideoDrop,
    accept: {
      "video/mp4": [".mp4"],
      "video/avi": [".avi"],
      "video/mov": [".mov"],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* POS Data Upload */}
      <Card className="bg-white rounded-lg shadow">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
            <FileSpreadsheet className="h-5 w-5 mr-2" />
            Upload POS Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getPosRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
              ${isPosActive 
                ? "border-primary bg-primary/5" 
                : "border-gray-300 hover:border-primary hover:bg-gray-50"
              }`}
          >
            <input {...getPosInputProps()} />
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              {isPosActive ? "Drop your POS file here" : "Drag and drop your POS report file here"}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports CSV, Excel files up to 50MB
            </p>
            <Button 
              variant="outline" 
              disabled={posUploadMutation.isPending}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <Upload className="h-4 w-4 mr-2" />
              {posUploadMutation.isPending ? "Uploading..." : "Choose File"}
            </Button>
          </div>
          {posUploadMutation.isPending && (
            <div className="mt-4">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-500 mt-2">Processing POS data...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Upload */}
      <Card className="bg-white rounded-lg shadow">
        <CardHeader>
          <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
            <Video className="h-5 w-5 mr-2" />
            Upload Video Clips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getVideoRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
              ${isVideoActive 
                ? "border-primary bg-primary/5" 
                : "border-gray-300 hover:border-primary hover:bg-gray-50"
              }`}
          >
            <input {...getVideoInputProps()} />
            <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              {isVideoActive ? "Drop your video files here" : "Drag and drop video files here"}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports MP4, AVI files up to 100MB
            </p>
            <Button 
              variant="outline" 
              disabled={videoUploadMutation.isPending}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <Upload className="h-4 w-4 mr-2" />
              {videoUploadMutation.isPending ? "Uploading..." : "Choose Files"}
            </Button>
          </div>
          {videoUploadMutation.isPending && (
            <div className="mt-4">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-500 mt-2">Uploading video...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
