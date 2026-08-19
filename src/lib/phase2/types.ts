import type { Database } from "@/integrations/supabase/types";

export type { Database };

export type ProjectId = string;
export type UserId = string;
export type ArtifactId = string;
export type CanvasId = string;
export type ConversationId = string;
export type KnowledgeSourceId = string;
export type FileId = string;
export type TaskId = string;
export type NoteId = string;
export type AssistantId = string;

export interface Phase2Entity {
  id: string;
  userId: UserId;
  projectId: ProjectId | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
    requestId?: string;
  } | null;
}

export type ArtifactType =
  | "document"
  | "markdown"
  | "rich_text"
  | "code"
  | "html"
  | "react_component"
  | "table"
  | "mermaid"
  | "flowchart"
  | "mind_map"
  | "note"
  | "study_guide"
  | "research_report";

export interface ArtifactVersion {
  id: string;
  artifactId: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
}

export interface CanvasArtifact extends Phase2Entity {
  projectId: ProjectId | null;
  title: string;
  type: ArtifactType;
  content: string;
  metadata: Record<string, unknown>;
  version: number;
  parentVersionId: string | null;
  isArchived: boolean;
  isShared: boolean;
  shareToken: string | null;
  language?: string;
  tags: string[];
}

export interface ContextStrategy {
  id: string;
  name: string;
  mode: "chat" | "study" | "coding" | "research" | "planning" | "writing";
  tokenBudget: number;
  memoryWeight: number;
  knowledgeWeight: number;
  recencyWeight: number;
  importanceWeight: number;
  similarityWeight: number;
  compressionRatio: number;
}

export interface RankedContextItem {
  id: string;
  type: "memory" | "knowledge" | "chat" | "note" | "task";
  content: string;
  score: number;
  recencyScore: number;
  importanceScore: number;
  similarityScore: number;
  projectRelevanceScore: number;
  tokens: number;
  metadata: Record<string, unknown>;
}

export interface CommandPaletteAction {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  category: "navigation" | "action" | "command" | "search";
  keywords: string[];
  action: () => void | Promise<void>;
  requiresAuth?: boolean;
  badge?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: ConversationId;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  parentMessageId: string | null;
  branchFromMessageId: string | null;
  isEdited: boolean;
  editedAt: string | null;
  isRegenerated: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Conversation {
  id: ConversationId;
  userId: UserId;
  projectId: ProjectId | null;
  title: string;
  folderId: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  tags: string[];
  summary?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
}

export interface KnowledgeEntity {
  id: string;
  sourceId: KnowledgeSourceId;
  type: "person" | "organization" | "location" | "concept" | "event" | "product" | "other";
  name: string;
  description?: string;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface KnowledgeRelation {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationType: string;
  confidence: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface FileRecord {
  id: FileId;
  userId: UserId;
  projectId: ProjectId | null;
  name: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  thumbnailPath: string | null;
  isPinned: boolean;
  isArchived: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FileVersion {
  id: string;
  fileId: FileId;
  content: string | null;
  sizeBytes: number;
  mimeType: string;
  storagePath: string;
  createdAt: string;
  createdBy: string;
}

export interface TaskRecord {
  id: TaskId;
  userId: UserId;
  projectId: ProjectId | null;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  completedAt?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NoteRecord {
  id: NoteId;
  userId: UserId;
  projectId: ProjectId | null;
  title: string;
  content: string;
  isPinned: boolean;
  isArchived: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantDefinition {
  id: AssistantId;
  userId: UserId;
  name: string;
  description: string;
  type: "research" | "coding" | "writing" | "study" | "planner" | "document" | "debug";
  systemPrompt: string;
  capabilities: string[];
  isDefault: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalConversations: number;
  totalMessages: number;
  totalArtifacts: number;
  totalKnowledgeSources: number;
  totalMemories: number;
  totalTasks: number;
  totalNotes: number;
  totalFiles: number;
  recentActivity: ActivityItem[];
  tokenUsageToday: number;
  tokenUsageThisWeek: number;
  modelUsageBreakdown: Record<string, number>;
}

export interface ActivityItem {
  id: string;
  userId: UserId;
  projectId: ProjectId | null;
  action: string;
  entityType: string;
  entityId: string;
  entityTitle?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "down";
  providers: Record<string, { status: string; latencyMs: number; lastCheck: string }>;
  circuitBreakers: Record<string, { state: string; failures: number; lastFailure: string | null }>;
  memory: { used: number; total: number };
  embeddingQueue: { pending: number; processing: number; failed: number };
  backgroundJobs: { pending: number; running: number; failed: number };
  lastUpdated: string;
}
