import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  FileText,
  MessageSquare,
  FolderOpen,
  Brain,
  BookOpen,
  Settings,
  Command,
  ArrowRight,
  Layers,
  Palette,
  Zap,
  Trash2,
  RefreshCw,
  Edit3,
  Copy,
  Share2,
  Download,
  Upload,
  Plus,
  Star,
  Archive,
  Filter,
  Clock,
  Tag,
  BarChart3,
  Users,
  Shield,
  Bell,
  HelpCircle,
  ChevronRight,
  X,
  CornerDownLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type CommandGroup =
  "navigation" | "recent" | "actions" | "search" | "settings" | "assistants";

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string[];
  group: CommandGroup;
  keywords: string[];
  action: () => void;
  badge?: string;
  disabled?: boolean;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  recentItems?: CommandItem[];
  placeholder?: string;
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const navigateTo = useCallback(
    (path: string) => {
      navigate({ to: path });
      setOpen(false);
    },
    [navigate],
  );

  return { open, setOpen, navigateTo };
}

const GROUP_LABELS: Record<CommandGroup, string> = {
  navigation: "Navigate",
  recent: "Recent",
  actions: "Actions",
  search: "Search",
  settings: "Settings",
  assistants: "Assistants",
};

const GROUP_ORDER: CommandGroup[] = [
  "recent",
  "navigation",
  "actions",
  "search",
  "assistants",
  "settings",
];

export function CommandPalette({
  open,
  onOpenChange,
  items,
  recentItems = [],
  placeholder = "Search everything...",
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return [...recentItems, ...items];
    const q = query.toLowerCase().trim();
    const all = [...recentItems, ...items];
    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q)),
    );
  }, [query, items, recentItems]);

  const grouped = useMemo(() => {
    const map = new Map<CommandGroup, CommandItem[]>();
    for (const item of filteredItems) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    const ordered: [CommandGroup, CommandItem[]][] = [];
    for (const group of GROUP_ORDER) {
      if (map.has(group)) ordered.push([group, map.get(group)!]);
    }
    return ordered;
  }, [filteredItems]);

  const flatItems = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flatItems[selectedIndex];
        if (item && !item.disabled) {
          item.action();
          onOpenChange(false);
        }
      }
    },
    [flatItems, selectedIndex, onOpenChange],
  );

  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      if (selected) {
        selected.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        className="relative z-10 w-full max-w-2xl mx-4 bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-base"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground bg-muted rounded border border-border">
            <CornerDownLeft className="h-3 w-3" />
          </kbd>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2 scroll-smooth">
          {grouped.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {grouped.map(([group, groupItems]) => (
                <div key={group}>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {GROUP_LABELS[group]}
                  </div>
                  <div className="space-y-0.5">
                    {groupItems.map((item) => {
                      const globalIndex = flatItems.indexOf(item);
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          data-selected={isSelected}
                          disabled={item.disabled}
                          onClick={() => {
                            if (!item.disabled) {
                              item.action();
                              onOpenChange(false);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                            isSelected
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-muted/50 text-foreground",
                            item.disabled && "opacity-50 cursor-not-allowed",
                          )}
                        >
                          <span className="shrink-0 text-muted-foreground">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{item.label}</span>
                              {item.badge && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                          {item.shortcut && (
                            <div className="flex items-center gap-1 shrink-0">
                              {item.shortcut.map((key, i) => (
                                <kbd
                                  key={i}
                                  className="px-1.5 py-0.5 text-[10px] text-muted-foreground bg-muted rounded border border-border"
                                >
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          )}
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" />
              to select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded border border-border text-[10px]">
                ↑↓
              </kbd>
              to navigate
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {filteredItems.length} result{filteredItems.length !== 1 ? "s" : ""}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

export function createCommandItem(item: Omit<CommandItem, "id">): CommandItem {
  return {
    ...item,
    id: `${item.group}-${item.label.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 7)}`,
  };
}

export function navigationCommand(
  label: string,
  path: string,
  options?: { icon?: React.ReactNode; description?: string; keywords?: string[] },
): CommandItem {
  return createCommandItem({
    label,
    description: options?.description,
    icon: options?.icon ?? <ArrowRight className="h-4 w-4" />,
    group: "navigation",
    keywords: options?.keywords ?? [label.toLowerCase()],
    action: () => {
      window.location.hash = path;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    },
  });
}

export function actionCommand(
  label: string,
  action: () => void,
  options?: {
    icon?: React.ReactNode;
    description?: string;
    shortcut?: string[];
    keywords?: string[];
  },
): CommandItem {
  return createCommandItem({
    label,
    description: options?.description,
    icon: options?.icon ?? <Zap className="h-4 w-4" />,
    shortcut: options?.shortcut,
    group: "actions",
    keywords: options?.keywords ?? [label.toLowerCase()],
    action,
  });
}
