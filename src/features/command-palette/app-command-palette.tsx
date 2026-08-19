import {
  useCommandPalette,
  CommandPalette as CommandPaletteComponent,
  navigationCommand,
  actionCommand,
} from "@/features/command-palette/command-palette";
import {
  Search,
  MessageSquare,
  FolderOpen,
  Brain,
  BookOpen,
  Settings,
  Command,
  FileText,
  Plus,
  Star,
  Archive,
  Home,
  BarChart3,
  Palette,
  Shield,
  HelpCircle,
  Zap,
  Trash2,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function useAppCommandPalette() {
  const { open, setOpen, navigateTo } = useCommandPalette();
  const navigate = useNavigate();

  const items = [
    navigationCommand("Home", "/", {
      icon: <Home className="h-4 w-4" />,
      description: "Go to home dashboard",
    }),
    navigationCommand("Chat", "/chat", {
      icon: <MessageSquare className="h-4 w-4" />,
      description: "Open chat",
    }),
    navigationCommand("Projects", "/projects", {
      icon: <FolderOpen className="h-4 w-4" />,
      description: "View projects",
    }),
    navigationCommand("Canvas", "/canvas", {
      icon: <Palette className="h-4 w-4" />,
      description: "AI Canvas",
    }),
    navigationCommand("Knowledge", "/knowledge", {
      icon: <BookOpen className="h-4 w-4" />,
      description: "Knowledge base",
    }),
    navigationCommand("Memory", "/memory", {
      icon: <Brain className="h-4 w-4" />,
      description: "Memory engine",
    }),
    navigationCommand("Study", "/study", {
      icon: <BookOpen className="h-4 w-4" />,
      description: "Study platform",
    }),
    navigationCommand("Analytics", "/analytics", {
      icon: <BarChart3 className="h-4 w-4" />,
      description: "View analytics",
    }),
    navigationCommand("Settings", "/settings", {
      icon: <Settings className="h-4 w-4" />,
      description: "App settings",
    }),
    actionCommand("New Chat", () => navigateTo("/chat"), {
      icon: <Plus className="h-4 w-4" />,
      description: "Start a new conversation",
      shortcut: ["N"],
    }),
    actionCommand("New Project", () => navigateTo("/projects"), {
      icon: <Plus className="h-4 w-4" />,
      description: "Create a new project",
      shortcut: ["P"],
    }),
    actionCommand("New Artifact", () => navigateTo("/canvas"), {
      icon: <Plus className="h-4 w-4" />,
      description: "Create a new canvas artifact",
      shortcut: ["C"],
    }),
  ];

  return { open, setOpen, items };
}
