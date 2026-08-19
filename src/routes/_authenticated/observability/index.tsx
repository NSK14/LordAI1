import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SystemHealth } from "@/lib/phase2/types";

export const Route = createFileRoute("/_authenticated/observability/")({
  component: ObservabilityPage,
});

function ObservabilityPage() {
  const { data: health } = useQuery({
    queryKey: ["observability", "health"],
    queryFn: async (): Promise<SystemHealth> => {
      const res = await fetch("/api/observability/health");
      if (!res.ok) throw new Error("Failed to fetch health");
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 30000,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Health</h1>
        <p className="text-muted-foreground">AI gateway, providers, and system metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Status</div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                health?.status === "healthy"
                  ? "default"
                  : health?.status === "degraded"
                    ? "secondary"
                    : "destructive"
              }
            >
              {health?.status ?? "loading..."}
            </Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Providers</div>
          <div className="space-y-1">
            {health?.providers &&
              Object.entries(health.providers).map(([name, status]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{name}</span>
                  <Badge variant={status.status === "healthy" ? "default" : "secondary"}>
                    {status.status}
                  </Badge>
                </div>
              ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Circuit Breakers</div>
          <div className="space-y-1">
            {health?.circuitBreakers &&
              Object.entries(health.circuitBreakers).map(([name, status]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{name}</span>
                  <Badge variant={status.state === "closed" ? "default" : "destructive"}>
                    {status.state}
                  </Badge>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
