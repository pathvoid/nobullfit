import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sleep, rand } from "./utils";

describe("utils", () => {
    describe("sleep", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("should return a promise", () => {
            const result = sleep();
            expect(result).toBeInstanceOf(Promise);
        });

        it("should resolve after default time (500ms)", async () => {
            let resolved = false;
            sleep().then(() => { resolved = true; });

            expect(resolved).toBe(false);

            await vi.advanceTimersByTimeAsync(499);
            expect(resolved).toBe(false);

            await vi.advanceTimersByTimeAsync(1);
            expect(resolved).toBe(true);
        });

        it("should resolve after specified time", async () => {
            let resolved = false;
            sleep(1000).then(() => { resolved = true; });

            expect(resolved).toBe(false);

            await vi.advanceTimersByTimeAsync(999);
            expect(resolved).toBe(false);

            await vi.advanceTimersByTimeAsync(1);
            expect(resolved).toBe(true);
        });

        it("should resolve immediately with 0ms", async () => {
            let resolved = false;
            sleep(0).then(() => { resolved = true; });

            await vi.advanceTimersByTimeAsync(0);
            expect(resolved).toBe(true);
        });
    });

    describe("rand", () => {
        it("should return a number", () => {
            const result = rand();
            expect(typeof result).toBe("number");
        });

        it("should return an integer", () => {
            for (let i = 0; i < 100; i++) {
                const result = rand();
                expect(Number.isInteger(result)).toBe(true);
            }
        });

        it("should return a value between 0 and 100 inclusive", () => {
            for (let i = 0; i < 100; i++) {
                const result = rand();
                expect(result).toBeGreaterThanOrEqual(0);
                expect(result).toBeLessThanOrEqual(100);
            }
        });

        it("should produce different values over multiple calls", () => {
            const values = new Set<number>();
            for (let i = 0; i < 100; i++) {
                values.add(rand());
            }
            // With 100 calls, we should get more than 1 unique value
            expect(values.size).toBeGreaterThan(1);
        });

        it("should return 0 when Math.random returns 0", () => {
            vi.spyOn(Math, "random").mockReturnValue(0);
            expect(rand()).toBe(0);
            vi.restoreAllMocks();
        });

        it("should return 100 when Math.random returns 0.999...", () => {
            vi.spyOn(Math, "random").mockReturnValue(0.999999);
            expect(rand()).toBe(100);
            vi.restoreAllMocks();
        });

        it("should return 50 when Math.random returns 0.5", () => {
            vi.spyOn(Math, "random").mockReturnValue(0.5);
            expect(rand()).toBe(50);
            vi.restoreAllMocks();
        });
    });
});
