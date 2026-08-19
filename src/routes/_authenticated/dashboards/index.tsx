import { createFileRoute } from "@tanstack/react-router";
import {
  useDashboardStats,
  DashboardGrid,
  ActivityFeed,
} from "@/features/dashboards/dashboard-hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboards/")({
  component: DashboardsPage,
});

function DashboardsPage() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Unable to load dashboard stats.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your AI workspace at a glance</p>
      </div>
      <DashboardGrid stats={stats} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityFeed activities={stats.recentActivity} />
      </div>
    </div>
  );
}
