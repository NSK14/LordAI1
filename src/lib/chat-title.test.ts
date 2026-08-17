import { describe, it, expect } from "vitest";
import { generateChatTitle, shouldGenerateTitle } from "@/lib/chat-title";

describe("generateChatTitle", () => {
  it("returns null for pure greetings", () => {
    expect(generateChatTitle("")).toBeNull();
    expect(generateChatTitle("   ")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(generateChatTitle("")).toBeNull();
    expect(generateChatTitle("   ")).toBeNull();
  });

  it("extracts meaningful words from a prompt", () => {
    expect(generateChatTitle("Help me build a React portfolio website.")).toBe(
      "Build a React Portfolio Website",
    );
  });

  it("strips leading filler phrases", () => {
    expect(generateChatTitle("Can you explain quantum computing?")).toBe(
      "Explain Quantum Computing",
    );
    expect(generateChatTitle("Tell me about Docker containers")).toBe("About Docker Containers");
  });

  it("handles questions naturally", () => {
    expect(generateChatTitle("How do I fix my Next.js authentication?")).toBe("I Fix My Next Js");
  });

  it("handles comparisons", () => {
    expect(generateChatTitle("Compare PostgreSQL and MongoDB.")).toBe(
      "Compare Postgresql and Mongodb",
    );
  });

  it("handles code-related requests", () => {
    expect(generateChatTitle("Write a Python web scraper.")).toBe("Write a Python Web Scraper");
  });

  it("limits to 5 words", () => {
    expect(
      generateChatTitle("I need help with understanding the basics of machine learning algorithms"),
    ).toBe("Help with Understanding the Basics");
  });

  it("handles markdown and URLs gracefully", () => {
    expect(generateChatTitle("Check out https://example.com for more info")).toBe(
      "Check Out Https Example Com",
    );
  });

  it("applies Title Case with minor words lowercased", () => {
    expect(generateChatTitle("the basics of react hooks")).toBe("The Basics of React Hooks");
  });

  it("preserves the first word capitalization", () => {
    expect(generateChatTitle("react server components vs client components")).toBe(
      "React Server Components Vs Client",
    );
  });

  it("handles empty strings and null-like input", () => {
    expect(generateChatTitle("   ")).toBeNull();
  });
});

describe("shouldGenerateTitle", () => {
  it("returns true for null/undefined/empty", () => {
    expect(shouldGenerateTitle(null)).toBe(true);
    expect(shouldGenerateTitle(undefined)).toBe(true);
    expect(shouldGenerateTitle("")).toBe(true);
  });

  it("returns true for default titles", () => {
    expect(shouldGenerateTitle("untitled")).toBe(true);
    expect(shouldGenerateTitle("new chat")).toBe(true);
    expect(shouldGenerateTitle("New Conversation")).toBe(true);
  });

  it("returns false for custom titles", () => {
    expect(shouldGenerateTitle("My Custom Title")).toBe(false);
    expect(shouldGenerateTitle("React Dashboard")).toBe(false);
  });
});
