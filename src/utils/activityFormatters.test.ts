import { describe, it, expect } from "vitest";
import {
    formatTime,
    formatPace,
    formatNumber,
    formatText,
    formatFieldValue
} from "./activityFormatters";

describe("activityFormatters", () => {
    describe("formatTime", () => {
        it("should return empty string for null or undefined", () => {
            expect(formatTime(null)).toBe("");
            expect(formatTime(undefined)).toBe("");
        });

        it("should return empty string for empty string", () => {
            expect(formatTime("")).toBe("");
            expect(formatTime("   ")).toBe("");
        });

        it("should format MM:SS to HH:MM:SS", () => {
            expect(formatTime("05:30")).toBe("00:05:30");
            expect(formatTime("59:59")).toBe("00:59:59");
        });

        it("should normalize HH:MM:SS format with proper padding", () => {
            expect(formatTime("1:05:30")).toBe("01:05:30");
            expect(formatTime("01:05:30")).toBe("01:05:30");
            expect(formatTime("12:34:56")).toBe("12:34:56");
        });

        it("should convert seconds to HH:MM:SS", () => {
            expect(formatTime(0)).toBe("00:00:00");
            expect(formatTime(90)).toBe("00:01:30");
            expect(formatTime(3661)).toBe("01:01:01");
            expect(formatTime(7200)).toBe("02:00:00");
            expect(formatTime("3600")).toBe("01:00:00");
        });

        it("should handle string numbers", () => {
            expect(formatTime("90")).toBe("00:01:30");
            expect(formatTime("3661")).toBe("01:01:01");
        });

        it("should return empty string for invalid format", () => {
            expect(formatTime("invalid")).toBe("");
            expect(formatTime(-100)).toBe("");
        });

        it("should parse invalid time format as numeric seconds", () => {
            // "12:60:00" doesn't match regex, parseFloat gives 12, converted as seconds
            expect(formatTime("12:60:00")).toBe("00:00:12");
        });

        it("should handle zero correctly", () => {
            expect(formatTime(0)).toBe("00:00:00");
            expect(formatTime("0")).toBe("00:00:00");
        });
    });

    describe("formatPace", () => {
        it("should return empty string for null or undefined", () => {
            expect(formatPace(null)).toBe("");
            expect(formatPace(undefined)).toBe("");
        });

        it("should return empty string for empty string", () => {
            expect(formatPace("")).toBe("");
            expect(formatPace("   ")).toBe("");
        });

        it("should format MM:SS to MM:SS/km", () => {
            expect(formatPace("5:30")).toBe("05:30/km");
            expect(formatPace("05:30")).toBe("05:30/km");
            expect(formatPace("6:00")).toBe("06:00/km");
        });

        it("should handle existing /km suffix", () => {
            expect(formatPace("5:30/km")).toBe("05:30/km");
            expect(formatPace("5:30 /km")).toBe("05:30/km");
            expect(formatPace("5:30/KM")).toBe("05:30/km");
        });

        it("should convert decimal minutes to MM:SS/km", () => {
            expect(formatPace(5.5)).toBe("05:30/km");
            expect(formatPace("5.5")).toBe("05:30/km");
            expect(formatPace(6.25)).toBe("06:15/km");
        });

        it("should convert whole number minutes to MM:00/km", () => {
            expect(formatPace(5)).toBe("05:00/km");
            expect(formatPace("6")).toBe("06:00/km");
        });

        it("should convert total seconds (>= 100) to MM:SS/km", () => {
            expect(formatPace(330)).toBe("05:30/km");
            expect(formatPace("360")).toBe("06:00/km");
            expect(formatPace(450)).toBe("07:30/km");
        });

        it("should return empty string for invalid format", () => {
            expect(formatPace("invalid")).toBe("");
            expect(formatPace(-5)).toBe("");
        });

        it("should handle zero correctly", () => {
            expect(formatPace(0)).toBe("00:00/km");
        });
    });

    describe("formatNumber", () => {
        it("should return empty string for null or undefined", () => {
            expect(formatNumber(null)).toBe("");
            expect(formatNumber(undefined)).toBe("");
        });

        it("should return empty string for invalid numbers", () => {
            expect(formatNumber("invalid")).toBe("");
            expect(formatNumber("abc")).toBe("");
        });

        it("should format numbers with up to 2 decimal places by default", () => {
            expect(formatNumber(5)).toBe("5");
            expect(formatNumber(5.5)).toBe("5.5");
            expect(formatNumber(5.55)).toBe("5.55");
            expect(formatNumber(5.556)).toBe("5.56");
        });

        it("should format numbers without decimals when allowDecimals is false", () => {
            expect(formatNumber(5.7, false)).toBe("6");
            expect(formatNumber(5.3, false)).toBe("5");
            expect(formatNumber(5, false)).toBe("5");
        });

        it("should respect maxDecimals parameter", () => {
            expect(formatNumber(5.5555, true, 1)).toBe("5.6");
            expect(formatNumber(5.5555, true, 3)).toBe("5.556");
            expect(formatNumber(5.5555, true, 0)).toBe("6");
        });

        it("should handle string numbers", () => {
            expect(formatNumber("5.5")).toBe("5.5");
            expect(formatNumber("100")).toBe("100");
        });

        it("should handle zero correctly", () => {
            expect(formatNumber(0)).toBe("0");
            expect(formatNumber("0")).toBe("0");
        });

        it("should remove trailing zeros", () => {
            expect(formatNumber(5.10)).toBe("5.1");
            expect(formatNumber(5.00)).toBe("5");
        });
    });

    describe("formatText", () => {
        it("should return empty string for null or undefined", () => {
            expect(formatText(null)).toBe("");
            expect(formatText(undefined)).toBe("");
        });

        it("should trim whitespace", () => {
            expect(formatText("  hello  ")).toBe("hello");
            expect(formatText("test")).toBe("test");
        });

        it("should replace multiple spaces with single space", () => {
            expect(formatText("hello   world")).toBe("hello world");
            expect(formatText("a  b  c")).toBe("a b c");
        });

        it("should handle empty string", () => {
            expect(formatText("")).toBe("");
            expect(formatText("   ")).toBe("");
        });
    });

    describe("formatFieldValue", () => {
        it("should return empty string for null or undefined", () => {
            expect(formatFieldValue(null, "number", "distance")).toBe("");
            expect(formatFieldValue(undefined, "text", "name")).toBe("");
        });

        it("should format pace field specially regardless of type", () => {
            expect(formatFieldValue("5:30", "text", "pace")).toBe("05:30/km");
            expect(formatFieldValue(330, "number", "pace")).toBe("05:30/km");
        });

        it("should format time fields", () => {
            expect(formatFieldValue("05:30", "time", "duration")).toBe("00:05:30");
            expect(formatFieldValue(3600, "time", "duration")).toBe("01:00:00");
        });

        it("should format number fields with decimals for non-integer fields", () => {
            expect(formatFieldValue(5.5, "number", "distance")).toBe("5.5");
            expect(formatFieldValue(80.5, "number", "weight")).toBe("80.5");
        });

        it("should format number fields without decimals for integer fields", () => {
            expect(formatFieldValue(3.7, "number", "sets")).toBe("4");
            expect(formatFieldValue(10.3, "number", "reps")).toBe("10");
            expect(formatFieldValue(5000.9, "number", "steps")).toBe("5001");
            expect(formatFieldValue(20.1, "number", "laps")).toBe("20");
            expect(formatFieldValue(5.6, "number", "rounds")).toBe("6");
        });

        it("should format text fields", () => {
            expect(formatFieldValue("  hello world  ", "text", "description")).toBe("hello world");
        });

        it("should handle zero correctly", () => {
            expect(formatFieldValue(0, "number", "distance")).toBe("0");
            expect(formatFieldValue(0, "time", "duration")).toBe("00:00:00");
        });
    });
});
