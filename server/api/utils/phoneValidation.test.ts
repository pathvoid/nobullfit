import { describe, it, expect } from "vitest";
import { validatePhoneNumber } from "./phoneValidation";

describe("phoneValidation", () => {
    describe("valid mobile numbers", () => {
        it("should accept a valid US mobile number", () => {
            const result = validatePhoneNumber("+12025551234");
            expect(result.valid).toBe(true);
        });

        it("should accept a valid UK mobile number", () => {
            const result = validatePhoneNumber("+447911123456");
            expect(result.valid).toBe(true);
        });

        it("should accept a valid German mobile number", () => {
            const result = validatePhoneNumber("+4915112345678");
            expect(result.valid).toBe(true);
        });

        it("should accept a valid Australian mobile number", () => {
            const result = validatePhoneNumber("+61412345678");
            expect(result.valid).toBe(true);
        });

        it("should accept a valid French mobile number", () => {
            const result = validatePhoneNumber("+33612345678");
            expect(result.valid).toBe(true);
        });

        it("should accept a valid Japanese mobile number", () => {
            const result = validatePhoneNumber("+819012345678");
            expect(result.valid).toBe(true);
        });
    });

    describe("emergency numbers", () => {
        it("should block 911 with US country code", () => {
            const result = validatePhoneNumber("+1911");
            expect(result.valid).toBe(false);
        });

        it("should block 112 with EU country code", () => {
            const result = validatePhoneNumber("+44112");
            expect(result.valid).toBe(false);
        });

        it("should block 999 with UK country code", () => {
            const result = validatePhoneNumber("+44999");
            expect(result.valid).toBe(false);
        });

        it("should block 000 with Australian country code", () => {
            const result = validatePhoneNumber("+61000");
            expect(result.valid).toBe(false);
        });

        it("should block 110 with German country code", () => {
            const result = validatePhoneNumber("+49110");
            expect(result.valid).toBe(false);
        });

        it("should not reveal why the number is blocked", () => {
            const result = validatePhoneNumber("+1911");
            expect(result.error).not.toContain("emergency");
        });
    });

    describe("premium-rate numbers", () => {
        it("should block US 900 premium numbers", () => {
            const result = validatePhoneNumber("+19005551234");
            expect(result.valid).toBe(false);
        });
    });

    describe("toll-free numbers", () => {
        it("should block US toll-free 800 numbers", () => {
            const result = validatePhoneNumber("+18005551234");
            expect(result.valid).toBe(false);
            expect(result.error).toContain("Toll-free");
        });

        it("should block US toll-free 888 numbers", () => {
            const result = validatePhoneNumber("+18885551234");
            expect(result.valid).toBe(false);
            expect(result.error).toContain("Toll-free");
        });
    });

    describe("invalid formats", () => {
        it("should reject numbers without + prefix", () => {
            const result = validatePhoneNumber("12025551234");
            expect(result.valid).toBe(false);
        });

        it("should reject empty string", () => {
            const result = validatePhoneNumber("");
            expect(result.valid).toBe(false);
        });

        it("should reject non-numeric content", () => {
            const result = validatePhoneNumber("+abc");
            expect(result.valid).toBe(false);
        });

        it("should reject a number that is too short", () => {
            const result = validatePhoneNumber("+1234");
            expect(result.valid).toBe(false);
        });
    });
});
