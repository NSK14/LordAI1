import { store } from "@/lib/lord-store";
import { saveArtifact, saveProfile } from "./client";

const STUDY_PREFIX = "lord:study:";
const FLASHCARD_DECKS_PREFIX = "lord:flashcard:decks";
const FLASHCARD_MASTERY_PREFIX = "lord:flashcard:mastery";

export async function migrateLegacyStudyData(
  userId: string,
): Promise<{ decks: number; artifacts: number }> {
  let decks = 0;
  let artifacts = 0;

  try {
    const rawDecks = store.get<unknown[]>(FLASHCARD_DECKS_PREFIX, []);
    if (Array.isArray(rawDecks) && rawDecks.length > 0) {
      for (const deck of rawDecks) {
        if (!deck || typeof deck !== "object") continue;
        const deckRecord = deck as Record<string, unknown>;
        const cards = Array.isArray(deckRecord.cards)
          ? deckRecord.cards.map((card: unknown) => {
              const cardRecord = card as Record<string, unknown>;
              return {
                front: String(cardRecord.front ?? cardRecord.question ?? "Front"),
                back: String(cardRecord.back ?? cardRecord.answer ?? "Back"),
              };
            })
          : [];

        if (cards.length > 0) {
          await saveArtifact(userId, {
            conceptId: (deckRecord.conceptId as string | null) ?? null,
            type: "flashcards",
            title: String(deckRecord.title ?? "Migrated flashcards"),
            content: { cards },
            aiGenerated: false,
          });
          decks++;
          artifacts++;
        }
      }
    }
  } catch {
    // Migration is best-effort.
  }

  try {
    const rawMastery = store.get<unknown>(FLASHCARD_MASTERY_PREFIX, {});
    if (rawMastery && typeof rawMastery === "object") {
      const masteryRecord = rawMastery as Record<string, unknown>;
      const goals: string[] = [];
      for (const [deckId, mastery] of Object.entries(masteryRecord)) {
        if (!deckId || typeof mastery !== "object") continue;
        const masteryData = mastery as Record<string, unknown>;
        goals.push(
          `Review flashcards for ${deckId}: ${String(masteryData.interval ?? 0)} day interval`,
        );
      }
      if (goals.length > 0) {
        await saveProfile(userId, {
          goals: goals.slice(0, 5),
          interests: ["flashcards", "revision"],
        });
      }
    }
  } catch {
    // Migration is best-effort.
  }

  return { decks, artifacts };
}
