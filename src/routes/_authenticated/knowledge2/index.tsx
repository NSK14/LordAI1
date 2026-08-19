import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Network, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/knowledge2/")({
  component: Knowledge2Page,
});

function Knowledge2Page() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge 2.0</h1>
        <p className="text-muted-foreground">
          Knowledge graph, entities, and cross-document reasoning
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Entity Extraction</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Automatically extract entities from your knowledge base with semantic understanding.
          </p>
          <Button variant="outline" className="w-full">
            <Sparkles className="h-4 w-4 mr-2" />
            Extract Entities
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <Network className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Knowledge Graph</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Visualize relationships between concepts, people, and documents.
          </p>
          <Button variant="outline" className="w-full">
            <Network className="h-4 w-4 mr-2" />
            View Graph
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Cross-Document Reasoning</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Connect insights across multiple documents and sources.
          </p>
          <Button variant="outline" className="w-full">
            <Sparkles className="h-4 w-4 mr-2" />
            Run Analysis
          </Button>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Recent Entities</h3>
        <div className="flex flex-wrap gap-2">
          {["React", "TypeScript", "Supabase", "AI Gateway", "Knowledge Graph"].map((entity) => (
            <Badge key={entity} variant="secondary" className="px-3 py-1">
              {entity}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
