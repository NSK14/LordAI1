import type { LearningConcept, Mastery } from "./types";

export interface ConceptNode {
  concept: LearningConcept;
  mastery: Mastery | undefined;
  level: "mastered" | "learning" | "introduced" | "not-started" | "blocked";
  unlocked: boolean;
  children: string[];
  parents: string[];
  depth: number;
}

export interface ConceptGraph {
  nodes: Map<string, ConceptNode>;
  roots: string[];
  getChildren: (conceptId: string) => string[];
  getParents: (conceptId: string) => string[];
  getAncestors: (conceptId: string) => string[];
  getDescendants: (conceptId: string) => string[];
  getUnlockedNodes: () => ConceptNode[];
  getNextUnlocked: () => ConceptNode | undefined;
  getMasteryPath: (conceptId: string) => ConceptNode[];
}

export interface LearningPath {
  conceptId: string;
  title: string;
  subject: string;
  mastery: number;
  status: string;
  unlocked: boolean;
  prerequisites: string[];
}

export function buildConceptGraph(concepts: LearningConcept[], mastery: Mastery[]): ConceptGraph {
  const masteryMap = new Map(mastery.map((m) => [m.concept_id, m]));

  function getLevel(m: Mastery | undefined): ConceptNode["level"] {
    if (!m) return "not-started";
    if (m.score >= 0.8) return "mastered";
    if (m.score >= 0.6) return "learning";
    if (m.score >= 0.35) return "introduced";
    return "not-started";
  }

  function isUnlocked(concept: LearningConcept): boolean {
    return concept.prerequisites.every((p) => (masteryMap.get(p)?.score ?? 0) >= 0.55);
  }

  const nodes = new Map<string, ConceptNode>();
  const roots: string[] = [];

  for (const concept of concepts) {
    const m = masteryMap.get(concept.id);
    const parents = [...concept.prerequisites];
    const unlocked = isUnlocked(concept);

    nodes.set(concept.id, {
      concept,
      mastery: m,
      level: getLevel(m),
      unlocked,
      children: [],
      parents,
      depth: 0,
    });

    if (parents.length === 0) {
      roots.push(concept.id);
    }
  }

  for (const [id, node] of nodes) {
    for (const parentId of node.parents) {
      const parent = nodes.get(parentId);
      if (parent) {
        parent.children.push(id);
      }
    }
  }

  function computeDepth(conceptId: string): number {
    const node = nodes.get(conceptId);
    if (!node) return 0;
    if (node.depth > 0) return node.depth;
    if (node.parents.length === 0) {
      node.depth = 1;
      return 1;
    }
    const maxParentDepth = Math.max(...node.parents.map(computeDepth));
    node.depth = maxParentDepth + 1;
    return node.depth;
  }

  for (const id of nodes.keys()) {
    computeDepth(id);
  }

  return {
    nodes,
    roots,
    getChildren: (conceptId: string) => nodes.get(conceptId)?.children ?? [],
    getParents: (conceptId: string) => nodes.get(conceptId)?.parents ?? [],
    getAncestors: (conceptId: string): string[] => {
      const ancestors: string[] = [];
      const visited = new Set<string>();
      const queue = [...(nodes.get(conceptId)?.parents ?? [])];
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        ancestors.push(id);
        const node = nodes.get(id);
        if (node) queue.push(...node.parents);
      }
      return ancestors;
    },
    getDescendants: (conceptId: string): string[] => {
      const descendants: string[] = [];
      const visited = new Set<string>();
      const queue = [...(nodes.get(conceptId)?.children ?? [])];
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        descendants.push(id);
        const node = nodes.get(id);
        if (node) queue.push(...node.children);
      }
      return descendants;
    },
    getUnlockedNodes: () => Array.from(nodes.values()).filter((n) => n.unlocked),
    getNextUnlocked: () => {
      const unlocked = Array.from(nodes.values()).filter(
        (n) => n.unlocked && n.level !== "mastered",
      );
      unlocked.sort((a, b) => {
        if (a.level === "not-started" && b.level !== "not-started") return -1;
        if (a.level !== "not-started" && b.level === "not-started") return 1;
        return a.depth - b.depth;
      });
      return unlocked[0];
    },
    getMasteryPath: (conceptId: string): ConceptNode[] => {
      const ancestors = graph.getAncestors(conceptId);
      const path: ConceptNode[] = [];
      for (const ancestorId of ancestors) {
        const node = nodes.get(ancestorId);
        if (node) path.push(node);
      }
      const target = nodes.get(conceptId);
      if (target) path.push(target);
      return path.sort((a, b) => a.depth - b.depth);
    },
  };
}

let graph: ConceptGraph = {
  nodes: new Map(),
  roots: [],
  getChildren: () => [],
  getParents: () => [],
  getAncestors: () => [],
  getDescendants: () => [],
  getUnlockedNodes: () => [],
  getNextUnlocked: () => undefined,
  getMasteryPath: () => [],
};

export function updateGraph(concepts: LearningConcept[], mastery: Mastery[]): ConceptGraph {
  graph = buildConceptGraph(concepts, mastery);
  return graph;
}

export function getGraph(): ConceptGraph {
  return graph;
}

export function getLearningPath(concepts: LearningConcept[], mastery: Mastery[]): LearningPath[] {
  const g = updateGraph(concepts, mastery);
  const paths: LearningPath[] = [];

  for (const node of g.getUnlockedNodes()) {
    const { concept, mastery: m } = node;
    paths.push({
      conceptId: concept.id,
      title: concept.title,
      subject: concept.subject,
      mastery: m?.score ?? 0,
      status: node.level,
      unlocked: node.unlocked,
      prerequisites: concept.prerequisites,
    });
  }

  paths.sort((a, b) => {
    const order = { mastered: 0, learning: 1, introduced: 2, "not-started": 3, blocked: 4 };
    return (
      (order[a.status as keyof typeof order] ?? 5) - (order[b.status as keyof typeof order] ?? 5)
    );
  });

  return paths;
}

export function getNextUnlockedConcept(
  concepts: LearningConcept[],
  mastery: Mastery[],
): LearningConcept | undefined {
  const g = updateGraph(concepts, mastery);
  const next = g.getNextUnlocked();
  return next?.concept;
}

export function getBlockedConcepts(
  concepts: LearningConcept[],
  mastery: Mastery[],
): LearningConcept[] {
  const g = updateGraph(concepts, mastery);
  return Array.from(g.nodes.values())
    .filter((n) => !n.unlocked && n.level !== "mastered")
    .map((n) => n.concept);
}

export function getPrerequisiteChain(
  conceptId: string,
  concepts: LearningConcept[],
): LearningConcept[] {
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));
  const chain: LearningConcept[] = [];
  const visited = new Set<string>();
  let currentId: string | null = conceptId;

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const concept = conceptMap.get(currentId);
    if (!concept) break;
    chain.unshift(concept);
    const nextPrereq = concept.prerequisites.find((p) => !visited.has(p));
    currentId = nextPrereq ?? null;
  }

  return chain;
}
