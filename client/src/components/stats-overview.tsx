import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Flag, CheckCircle, Video } from "lucide-react";

export default function StatsOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-full mr-5"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      title: "Pending Review",
      value: stats?.pendingReview || 0,
      icon: AlertTriangle,
      color: "text-yellow-600",
    },
    {
      title: "Flagged Today",
      value: stats?.flaggedToday || 0,
      icon: Flag,
      color: "text-red-600",
    },
    {
      title: "Approved",
      value: stats?.approved || 0,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "Video Clips",
      value: stats?.videoClips || 0,
      icon: Video,
      color: "text-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {statItems.map((item) => (
        <Card key={item.title} className="bg-white rounded-lg shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <item.icon className={`h-8 w-8 ${item.color}`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {item.title}
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {item.value}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
