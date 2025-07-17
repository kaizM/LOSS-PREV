import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { Brain, AlertTriangle, CheckCircle, Eye, TrendingUp, Users } from 'lucide-react';

interface AIAnalysisResult {
  isSuspicious: boolean;
  suspiciousScore: number;
  flags: string[];
  explanation: string;
  recommendations: string[];
}

interface AIAnalysisProps {
  transactionId?: string | number;
  className?: string;
}

export function AIAnalysisDisplay({ transactionId, className = '' }: AIAnalysisProps) {
  const [showDetails, setShowDetails] = useState(false);

  const {
    data: analysisData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['ai-analysis', transactionId],
    queryFn: async () => {
      if (!transactionId) return null;
      const response = await apiRequest('POST', '/api/ai/analyze-transaction', { transactionId });
      return response.json();
    },
    enabled: !!transactionId
  });

  const analysis = analysisData?.analysis as AIAnalysisResult | undefined;

  if (!transactionId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center text-sm">
            <Brain className="h-4 w-4 mr-2" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a transaction to view AI analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center text-sm">
            <Brain className="h-4 w-4 mr-2 animate-spin" />
            Analyzing Transaction...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !analysis) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center text-sm">
            <Brain className="h-4 w-4 mr-2" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load AI analysis. {error?.message || 'Please try again.'}
            </AlertDescription>
          </Alert>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getRiskText = (score: number) => {
    if (score >= 80) return 'High Risk';
    if (score >= 50) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <Brain className="h-4 w-4 mr-2" />
            AI Analysis
          </div>
          <Badge variant={analysis.isSuspicious ? 'destructive' : 'default'}>
            {analysis.isSuspicious ? 'Suspicious' : 'Normal'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Risk Score</span>
            <span className="text-sm font-bold">{analysis.suspiciousScore}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getRiskColor(analysis.suspiciousScore)}`}
              style={{ width: `${analysis.suspiciousScore}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {getRiskText(analysis.suspiciousScore)}
          </p>
        </div>

        {/* Flags */}
        {analysis.flags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Red Flags
            </h4>
            <div className="flex flex-wrap gap-1">
              {analysis.flags.map((flag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {flag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI Explanation */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center">
            <Eye className="h-4 w-4 mr-1" />
            AI Explanation
          </h4>
          <p className="text-sm text-muted-foreground">
            {analysis.explanation}
          </p>
        </div>

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Recommendations
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {analysis.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        {/* Analysis Details Toggle */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
          <span className="text-xs text-muted-foreground">
            Analyzed: {new Date(analysisData.timestamp).toLocaleString()}
          </span>
        </div>

        {showDetails && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-medium">Analysis Details</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Transaction ID:</strong> {transactionId}</p>
              <p><strong>Model:</strong> GPT-4o (Gas Station Expert)</p>
              <p><strong>Analysis Type:</strong> Pattern-based fraud detection</p>
              <p><strong>Confidence:</strong> {analysis.suspiciousScore >= 70 ? 'High' : analysis.suspiciousScore >= 40 ? 'Medium' : 'Low'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BulkAIAnalysisDisplay({ className = '' }: { className?: string }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const bulkAnalysisMutation = useMutation({
    mutationFn: async () => {
      setIsAnalyzing(true);
      const response = await apiRequest('POST', '/api/ai/bulk-analyze', {});
      const result = await response.json();
      setAnalysisResult(result);
      return result;
    },
    onError: (error) => {
      console.error('Bulk analysis failed:', error);
    },
    onSettled: () => {
      setIsAnalyzing(false);
    }
  });

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Bulk AI Analysis
          </div>
          <Button
            onClick={() => bulkAnalysisMutation.mutate()}
            disabled={isAnalyzing}
            size="sm"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze All'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!analysisResult && !isAnalyzing && (
          <p className="text-sm text-muted-foreground">
            Run bulk analysis to identify patterns and high-risk transactions across your data.
          </p>
        )}

        {isAnalyzing && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 animate-spin" />
              <span className="text-sm">Analyzing transactions...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        )}

        {analysisResult && (
          <div className="space-y-4">
            {analysisResult.message ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {analysisResult.message}
                </AlertDescription>
              </Alert>
            ) : analysisResult.analysis && analysisResult.analysis.summary ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {analysisResult.analysis.summary.totalSuspicious}
                    </div>
                    <div className="text-xs text-muted-foreground">Suspicious</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {analysisResult.analysis.summary.highRiskCount}
                    </div>
                    <div className="text-xs text-muted-foreground">High Risk</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Common Issues
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {analysisResult.analysis.summary.commonFlags.slice(0, 6).map((flag: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {flag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {analysisResult.analysis.summary.employeeRisks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      Employee Risk Analysis
                    </h4>
                    <div className="space-y-1">
                      {analysisResult.analysis.summary.employeeRisks.slice(0, 3).map((employee: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-xs">
                          <span>{employee.employee}</span>
                          <Badge variant={employee.riskScore >= 70 ? 'destructive' : employee.riskScore >= 40 ? 'default' : 'secondary'}>
                            {employee.riskScore}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Analysis completed: {new Date(analysisResult.timestamp).toLocaleString()}
                </p>
              </>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Unable to display analysis results. Please try again.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}