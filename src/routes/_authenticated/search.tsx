import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Search as SearchIcon,
  Brain,
  MessageSquare,
  BookOpen,
  StickyNote,
  ListTodo,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/lord/AppShell";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { globalSearch } from "@/lib/brain/search";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { SearchResult, EntityType } from "@/lib/brain/types";

const ENTITY_ICONS: Record<EntityType, typeof SearchIcon> = {
  conversation: MessageSquare,
  message: MessageSquare,
  memory: Brain,
  knowledge_chunk: BookOpen,
  note: StickyNote,
  task: ListTodo,
  artifact: BookOpen,
  document: BookOpen,
};

const ENTITY_LABELS: Record<EntityType, string> = {
  conversation: "Chat",
  message: "Message",
  memory: "Memory",
  knowledge_chunk: "Knowledge",
  note: "Note",
  task: "Task",
  artifact: "Artifact",
  document: "Document",
};

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "LORD — Search" },
      { name: "description", content: "Search across your AI workspace." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { user } = useCurrentUser();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", user?.id, debounced],
    enabled: !!user?.id && debounced.length > 1,
    queryFn: async () => {
      const results = await globalSearch({
        userId: user!.id,
        query: debounced,
        limit: 20,
      });
      return results;
    },
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-6">Search</h1>
        <div className="relative mb-8">
          <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across memories, knowledge, chats, notes, tasks..."
            className="pl-10 h-12 text-base"
            autoFocus
          />
        </div>

        {isLoading && debounced.length > 1 && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="h-20 animate-pulse bg-muted/50" />
            ))}
          </div>
        )}

        {!isLoading && data && data.length > 0 && (
          <div className="space-y-3">
            {data.map((result: SearchResult) => {
              const Icon = ENTITY_ICONS[result.entityType] ?? SearchIcon;
              return (
                <Card
                  key={result.id}
                  className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => {
                    if (result.entityType === "memory") {
                      window.location.assign(`/memory`);
                    } else if (result.entityType === "knowledge_chunk") {
                      window.location.assign(`/projects/${result.projectId}`);
                    } else if (result.entityType === "task") {
                      window.location.assign(`/projects/${result.projectId}`);
                    } else if (result.entityType === "conversation") {
                      window.location.assign(`/chat`);
                    } else {
                      window.location.assign(`/projects/${result.projectId}`);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {ENTITY_LABELS[result.entityType]}
                        </Badge>
                        {result.projectId && (
                          <span className="text-xs text-muted-foreground">Project</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {Math.round((result.similarity ?? 0) * 100)}% match
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white line-clamp-1">
                        {result.title ?? result.content.slice(0, 80)}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {result.content}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {!isLoading && debounced.length > 1 && data?.length === 0 && (
          <Card className="p-10 text-center">
            <SearchIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No results found for "{debounced}"</p>
          </Card>
        )}

        {debounced.length <= 1 && !data && (
          <Card className="p-10 text-center">
            <SearchIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Type at least 2 characters to search across your workspace.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
