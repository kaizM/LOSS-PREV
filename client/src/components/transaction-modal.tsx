import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { CheckCircle, AlertTriangle, Flag, Play, Pause, SkipBack, SkipForward, X } from "lucide-react";
import type { Transaction } from "@shared/schema";

interface TransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionModal({ transaction, isOpen, onClose }: TransactionModalProps) {
  const [newNote, setNewNote] = useState("");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactionData, isLoading } = useQuery({
    queryKey: ["/api/transactions", transaction?.id],
    enabled: !!transaction?.id && isOpen,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      if (!transaction) throw new Error("No transaction selected");
      return apiRequest("PATCH", `/api/transactions/${transaction.id}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Transaction status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!transaction) throw new Error("No transaction selected");
      return apiRequest("POST", `/api/transactions/${transaction.id}/notes`, { content });
    },
    onSuccess: () => {
      toast({
        title: "Note Added",
        description: "Your note has been added successfully.",
      });
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", transaction?.id] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (status: string) => {
    updateStatusMutation.mutate({ status });
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNoteMutation.mutate(newNote.trim());
    }
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

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Transaction Review</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transaction Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-md">Transaction Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date & Time:</span>
                    <span className="font-medium">
                      {format(new Date(transaction.date), "yyyy-MM-dd HH:mm:ss")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Register:</span>
                    <span className="font-medium">{transaction.registerId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Employee:</span>
                    <span className="font-medium">{transaction.employeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction Type:</span>
                    <Badge className={getTransactionTypeBadgeVariant(transaction.transactionType)}>
                      {transaction.transactionType}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium text-lg">
                      ${parseFloat(transaction.amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-medium font-mono text-sm">
                      {transaction.transactionId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={getStatusBadgeVariant(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Video Player */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-md">Security Video</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative">
                    {transactionData?.videoClip ? (
                      <video
                        className="w-full h-full object-cover rounded-lg"
                        controls
                        src={`/api/video/${transaction.id}`}
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-gray-400 mb-2">No video available</div>
                        <div className="text-sm text-gray-500">
                          Video clip not uploaded for this transaction
                        </div>
                      </div>
                    )}
                  </div>
                  {transactionData?.videoClip && (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <SkipBack className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                        >
                          {isVideoPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-sm text-gray-500">
                        Duration: {transactionData.videoClip.duration || "Unknown"}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Review Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-md">Review Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => handleStatusUpdate("approved")}
                    disabled={updateStatusMutation.isPending}
                    className="bg-green-100 text-green-800 hover:bg-green-200"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approved
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate("investigate")}
                    disabled={updateStatusMutation.isPending}
                    className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Investigate
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate("escalate")}
                    disabled={updateStatusMutation.isPending}
                    className="bg-red-100 text-red-800 hover:bg-red-200"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Escalate
                  </Button>
                </div>

                {/* Notes Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Internal Notes
                  </label>
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add your review notes here..."
                    rows={3}
                    className="mb-2"
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={addNoteMutation.isPending || !newNote.trim()}
                    size="sm"
                  >
                    Add Note
                  </Button>
                </div>

                {/* Previous Notes */}
                {transactionData?.notes && transactionData.notes.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Previous Notes</h5>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {transactionData.notes.map((note) => (
                        <div key={note.id} className="bg-gray-50 p-3 rounded-md">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {note.authorName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(note.createdAt), "yyyy-MM-dd HH:mm")}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
