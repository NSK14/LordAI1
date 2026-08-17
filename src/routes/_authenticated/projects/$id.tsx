import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  MessageSquare,
  BookOpen,
  StickyNote,
  ListTodo,
  Brain,
  FolderOpen,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/lord/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useProject,
  useProjectNotes,
  useProjectTasks,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useProjectActivity,
} from "@/lib/brain/projects";
import { useMemories } from "@/lib/memory";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";

const TABS = [
  { id: "overview", label: "Overview", icon: FolderOpen },
  { id: "chats", label: "Chats", icon: MessageSquare },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "memories", label: "Memories", icon: Brain },
] as const;

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({
    meta: [{ title: "LORD — Project" }, { name: "description", content: "Project workspace." }],
  }),
  component: ProjectWorkspace,
});

function ProjectWorkspace() {
  const { id } = useParams({ from: "/_authenticated/projects/$id" });
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const { data: project, isLoading: projectLoading } = useProject(user?.id ?? null, id);
  const { data: notes } = useProjectNotes(user?.id ?? null, id);
  const { data: tasks } = useProjectTasks(user?.id ?? null, id);
  const { data: memories } = useMemories(user?.id ?? null);
  const { data: activity } = useProjectActivity(user?.id ?? null, id);
  const createNote = useCreateNote(user?.id ?? null, id);
  const updateNote = useUpdateNote(user?.id ?? null, id);
  const deleteNote = useDeleteNote(user?.id ?? null, id);
  const createTask = useCreateTask(user?.id ?? null, id);
  const updateTask = useUpdateTask(user?.id ?? null, id);
  const deleteTask = useDeleteTask(user?.id ?? null, id);

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim() || !user?.id) return;
    try {
      await createNote.mutateAsync({ title: newNoteTitle.trim(), content: newNoteContent.trim() });
      setNewNoteTitle("");
      setNewNoteContent("");
      toast.success("Note created");
    } catch {
      toast.error("Failed to create note");
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !user?.id) return;
    try {
      await createTask.mutateAsync({ title: newTaskTitle.trim() });
      setNewTaskTitle("");
      toast.success("Task created");
    } catch {
      toast.error("Failed to create task");
    }
  };

  const toggleTaskStatus = async (task: { id: string; status: string }) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      await updateTask.mutateAsync({ id: task.id, patch: { status: newStatus } });
    } catch {
      toast.error("Failed to update task");
    }
  };

  if (projectLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="h-64 rounded bg-muted" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Project not found</h2>
          <Button onClick={() => navigate({ to: "/projects" })}>Back to Projects</Button>
        </div>
      </AppShell>
    );
  }

  const projectMemories =
    memories?.filter((m) => {
      if (!id) return true;
      return !m.project_id || m.project_id === id;
    }) ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/projects" })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Projects
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: project.color }}
            >
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                {project.description ?? "No description"}
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard title="Notes" value={notes?.length ?? 0} icon={StickyNote} />
              <StatCard title="Tasks" value={tasks?.length ?? 0} icon={ListTodo} />
              <StatCard title="Memories" value={projectMemories.length} icon={Brain} />
            </div>
            {activity && activity.length > 0 && (
              <Card className="p-5">
                <h3 className="mb-4 font-semibold text-white">Recent Activity</h3>
                <div className="space-y-3">
                  {activity.slice(0, 10).map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{a.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="chats" className="space-y-4">
            <Card className="p-5">
              <h3 className="mb-4 font-semibold text-white">Project Chats</h3>
              <p className="text-sm text-muted-foreground">
                Chats linked to this project will appear here. Start a new chat and select this
                project to get started.
              </p>
              <Button asChild className="mt-4 gap-2">
                <Link to="/chat" search={{ projectId: id }}>
                  <Plus className="h-4 w-4" /> New Chat
                </Link>
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4">
            <Card className="p-5">
              <h3 className="mb-4 font-semibold text-white">Knowledge Base</h3>
              <p className="text-sm text-muted-foreground">
                Upload documents, URLs, and other sources to build your project's knowledge base.
              </p>
              <Button className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Upload Knowledge
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-white">Notes</h3>
              </div>
              <div className="mb-4 space-y-2">
                <Input
                  placeholder="Note title"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Write your note..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                />
                <Button onClick={handleCreateNote} disabled={!newNoteTitle.trim()} size="sm">
                  Add Note
                </Button>
              </div>
              <div className="space-y-3">
                {notes?.map((note) => (
                  <Card key={note.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-white">{note.title}</h4>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {note.content}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              updateNote.mutate({
                                id: note.id,
                                patch: { isPinned: !note.isPinned },
                              })
                            }
                          >
                            {note.isPinned ? "Unpin" : "Pin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteNote.mutate(note.id)}
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))}
                {notes?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No notes yet. Create your first note above.
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-white">Tasks</h3>
              </div>
              <div className="mb-4 flex gap-2">
                <Input
                  placeholder="Task title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                />
                <Button onClick={handleCreateTask} disabled={!newTaskTitle.trim()}>
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {tasks?.map((task) => (
                  <Card
                    key={task.id}
                    className={cn(
                      "flex items-center justify-between p-3 cursor-pointer transition-colors",
                      task.status === "done" && "opacity-60",
                    )}
                    onClick={() => toggleTaskStatus(task)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-4 w-4 rounded border-2 flex items-center justify-center",
                          task.status === "done"
                            ? "bg-primary border-primary"
                            : "border-muted-foreground",
                        )}
                      >
                        {task.status === "done" && (
                          <span className="text-[10px] text-primary-foreground">✓</span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-sm",
                          task.status === "done" && "line-through text-muted-foreground",
                        )}
                      >
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          getPriorityStyles(task.priority),
                        )}
                      >
                        {task.priority}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              updateTask.mutate({
                                id: task.id,
                                patch: { status: task.status === "done" ? "todo" : "done" },
                              })
                            }
                          >
                            {task.status === "done" ? "Mark as todo" : "Mark as done"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteTask.mutate(task.id)}
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))}
                {tasks?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No tasks yet. Add your first task above.
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="memories" className="space-y-4">
            <Card className="p-5">
              <h3 className="mb-4 font-semibold text-white">Project Memories</h3>
              <div className="space-y-3">
                {projectMemories.map((memory) => (
                  <div
                    key={memory.id}
                    className="flex items-start justify-between rounded-lg border border-border/50 p-3"
                  >
                    <div>
                      <p className="text-sm text-white line-clamp-2">{memory.content}</p>
                      <span className="text-xs text-muted-foreground">{memory.category}</span>
                    </div>
                    {memory.pinned && <span className="text-xs text-yellow-500">Pinned</span>}
                  </div>
                ))}
                {projectMemories.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No memories for this project yet. Memories are created automatically during
                    conversations.
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
    </Card>
  );
}

function getPriorityStyles(priority: string): string {
  switch (priority) {
    case "high":
      return "bg-red-500/20 text-red-400";
    case "medium":
      return "bg-yellow-500/20 text-yellow-400";
    case "low":
      return "bg-green-500/20 text-green-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}
