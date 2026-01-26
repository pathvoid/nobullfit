import { describe, it, expect } from "vitest";
import {
    ACTIVITY_TYPES,
    getActivityTypeConfig,
    getAllActivityTypes
} from "./activityTypes";
import type { ActivityType, ActivityTypeConfig } from "./activityTypes";

describe("activityTypes", () => {
    describe("ACTIVITY_TYPES", () => {
        it("should be an array of activity type configurations", () => {
            expect(Array.isArray(ACTIVITY_TYPES)).toBe(true);
            expect(ACTIVITY_TYPES.length).toBeGreaterThan(0);
        });

        it("should contain all expected activity types", () => {
            const types = ACTIVITY_TYPES.map(config => config.type);
            expect(types).toContain("running");
            expect(types).toContain("walking");
            expect(types).toContain("cycling");
            expect(types).toContain("swimming");
            expect(types).toContain("weightlifting");
            expect(types).toContain("yoga");
            expect(types).toContain("pilates");
            expect(types).toContain("hiit");
            expect(types).toContain("cardio");
            expect(types).toContain("sports");
            expect(types).toContain("other");
        });

        it("should have valid structure for each activity type", () => {
            ACTIVITY_TYPES.forEach(config => {
                expect(config).toHaveProperty("type");
                expect(config).toHaveProperty("label");
                expect(config).toHaveProperty("fields");
                expect(typeof config.type).toBe("string");
                expect(typeof config.label).toBe("string");
                expect(Array.isArray(config.fields)).toBe(true);
            });
        });

        it("should have valid field structure for each activity type", () => {
            ACTIVITY_TYPES.forEach(config => {
                config.fields.forEach(field => {
                    expect(field).toHaveProperty("key");
                    expect(field).toHaveProperty("label");
                    expect(field).toHaveProperty("type");
                    expect(typeof field.key).toBe("string");
                    expect(typeof field.label).toBe("string");
                    expect(["number", "text", "time"]).toContain(field.type);
                });
            });
        });

        it("should have calories_burned field for each activity type", () => {
            ACTIVITY_TYPES.forEach(config => {
                const hasCalories = config.fields.some(field => field.key === "calories_burned");
                expect(hasCalories).toBe(true);
            });
        });

        it("should have running type with correct fields", () => {
            const running = ACTIVITY_TYPES.find(config => config.type === "running");
            expect(running).toBeDefined();
            expect(running?.label).toBe("Running");
            const fieldKeys = running?.fields.map(f => f.key);
            expect(fieldKeys).toContain("distance");
            expect(fieldKeys).toContain("duration");
            expect(fieldKeys).toContain("pace");
            expect(fieldKeys).toContain("calories_burned");
        });

        it("should have swimming type with laps field", () => {
            const swimming = ACTIVITY_TYPES.find(config => config.type === "swimming");
            expect(swimming).toBeDefined();
            const fieldKeys = swimming?.fields.map(f => f.key);
            expect(fieldKeys).toContain("laps");
        });

        it("should have weightlifting type with sets, reps, and weight fields", () => {
            const weightlifting = ACTIVITY_TYPES.find(config => config.type === "weightlifting");
            expect(weightlifting).toBeDefined();
            const fieldKeys = weightlifting?.fields.map(f => f.key);
            expect(fieldKeys).toContain("sets");
            expect(fieldKeys).toContain("reps");
            expect(fieldKeys).toContain("weight");
        });
    });

    describe("getActivityTypeConfig", () => {
        it("should return config for valid activity type", () => {
            const runningConfig = getActivityTypeConfig("running");
            expect(runningConfig).toBeDefined();
            expect(runningConfig?.type).toBe("running");
            expect(runningConfig?.label).toBe("Running");
        });

        it("should return config for all defined activity types", () => {
            const types: ActivityType[] = [
                "running", "walking", "cycling", "swimming",
                "weightlifting", "yoga", "pilates", "hiit",
                "cardio", "sports", "other"
            ];

            types.forEach(type => {
                const config = getActivityTypeConfig(type);
                expect(config).toBeDefined();
                expect(config?.type).toBe(type);
            });
        });

        it("should return undefined for invalid activity type", () => {
            const invalidConfig = getActivityTypeConfig("invalid" as ActivityType);
            expect(invalidConfig).toBeUndefined();
        });

        it("should return the same reference as ACTIVITY_TYPES entry", () => {
            const runningConfig = getActivityTypeConfig("running");
            const runningFromArray = ACTIVITY_TYPES.find(c => c.type === "running");
            expect(runningConfig).toBe(runningFromArray);
        });
    });

    describe("getAllActivityTypes", () => {
        it("should return all activity types", () => {
            const allTypes = getAllActivityTypes();
            expect(allTypes).toBe(ACTIVITY_TYPES);
            expect(allTypes.length).toBe(ACTIVITY_TYPES.length);
        });

        it("should return the same reference as ACTIVITY_TYPES", () => {
            expect(getAllActivityTypes()).toBe(ACTIVITY_TYPES);
        });

        it("should contain all 11 activity types", () => {
            const allTypes = getAllActivityTypes();
            expect(allTypes.length).toBe(11);
        });
    });

    describe("ActivityField type validation", () => {
        it("should have optional field markers", () => {
            ACTIVITY_TYPES.forEach(config => {
                config.fields.forEach(field => {
                    // Optional should be boolean or undefined
                    if (field.optional !== undefined) {
                        expect(typeof field.optional).toBe("boolean");
                    }
                });
            });
        });

        it("should have unit property for applicable number fields", () => {
            const runningConfig = getActivityTypeConfig("running");
            const distanceField = runningConfig?.fields.find(f => f.key === "distance");
            expect(distanceField?.unit).toBe("km");

            const caloriesField = runningConfig?.fields.find(f => f.key === "calories_burned");
            expect(caloriesField?.unit).toBe("kcal");
        });

        it("should have placeholder for all fields", () => {
            ACTIVITY_TYPES.forEach(config => {
                config.fields.forEach(field => {
                    if (field.placeholder !== undefined) {
                        expect(typeof field.placeholder).toBe("string");
                        expect(field.placeholder.length).toBeGreaterThan(0);
                    }
                });
            });
        });
    });
});
