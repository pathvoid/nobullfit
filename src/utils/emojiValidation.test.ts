import { describe, it, expect } from "vitest";
import { containsEmoji } from "./emojiValidation";

describe("emojiValidation", () => {
    describe("containsEmoji", () => {
        it("should detect common emojis", () => {
            expect(containsEmoji("Hello 😀")).toBe(true);
            expect(containsEmoji("👍")).toBe(true);
            expect(containsEmoji("❤️")).toBe(true);
            expect(containsEmoji("🎉")).toBe(true);
        });

        it("should detect emojis in text", () => {
            expect(containsEmoji("This is great! 🎊")).toBe(true);
            expect(containsEmoji("I love it ❤️ so much")).toBe(true);
            expect(containsEmoji("Test 👍 test")).toBe(true);
        });

        it("should return false for text without emojis", () => {
            expect(containsEmoji("Hello World")).toBe(false);
            expect(containsEmoji("123")).toBe(false);
            expect(containsEmoji("Test@example.com")).toBe(false);
            expect(containsEmoji("")).toBe(false);
        });

        it("should detect various emoji types", () => {
            expect(containsEmoji("😀😃😄😁")).toBe(true);
            expect(containsEmoji("🚀")).toBe(true);
            expect(containsEmoji("🍕")).toBe(true);
            expect(containsEmoji("⭐")).toBe(true);
            expect(containsEmoji("🔥")).toBe(true);
        });

        it("should handle emojis with skin tone modifiers", () => {
            expect(containsEmoji("👍🏻")).toBe(true);
            expect(containsEmoji("👋🏿")).toBe(true);
        });

        it("should handle zero-width joiner emojis", () => {
            expect(containsEmoji("👨‍👩‍👧‍👦")).toBe(true);
            expect(containsEmoji("🏳️‍🌈")).toBe(true);
        });
    });
});

