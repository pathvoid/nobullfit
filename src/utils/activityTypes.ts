// Activity type definitions and field configurations

export type ActivityType = 
    | "running"
    | "walking"
    | "cycling"
    | "swimming"
    | "weightlifting"
    | "yoga"
    | "pilates"
    | "hiit"
    | "cardio"
    | "sports"
    | "other";

export interface ActivityField {
    key: string;
    label: string;
    type: "number" | "text" | "time";
    unit?: string;
    placeholder?: string;
    optional?: boolean;
}

export interface ActivityTypeConfig {
    type: ActivityType;
    label: string;
    fields: ActivityField[];
}

export const ACTIVITY_TYPES: ActivityTypeConfig[] = [
    {
        type: "running",
        label: "Running",
        fields: [
            { key: "distance", label: "Distance", type: "number", unit: "km", placeholder: "e.g., 5.0", optional: true },
            { key: "duration", label: "Duration", type: "time", placeholder: "HH:MM:SS", optional: true },
            { key: "pace", label: "Pace", type: "text", placeholder: "e.g., 5:30/km or 5.5 (minutes)", optional: true },
            { key: "calories_burned", label: "Calories Burned", type: "number", unit: "kcal", placeholder: "e.g., 300" }
        ]
    },
    {
        type: "walking",
        label: "Walking",
        fields: [
            { key: "distance", label: "Distance", type: "number", unit: "km", placeholder: "e.g., 3.0", optional: true },
            { key: "duration", label: "Duration", type: "time", placeholder: "HH:MM:SS", optional: true },
            { key: "steps", label: "Steps", type: "number", placeholder: "e.g., 5000", optional: true },
            { key: "calories_burned", label: "Calories Burned", type: "number", unit: "kcal", placeholder: "e.g., 150" }
        ]
    },
    {
        type: "cycling",
        label: "Cycling",
        fields: [
            { key: "distance", label: "Distance", type: "number", unit: "km", placeholder: "e.g., 20.0", optional: true },
            { key: "duration", label: "Duration", type: "time", placeholder: "HH:MM:SS", optional: true },
            { key: "average_speed", label: "Average Speed", type: "number", unit: "km/h", placeholder: "e.g., 25", optional: true },
            { key: "calories_burned", label: "Calories Burned", type: "number", unit: "kcal", placeholder: "e.g., 400" }
        ]
    },
    {
        type: "swimming",
        label: "Swimming",
        fields: [
            { key: "distance", label: "Distance", type: "number", unit: "m", placeholder: "e.g., 1000", optional: true },
            { key: "duration", label: "Duration", type: "time", placeholder: "HH:MM:SS", optional: true },
            { key: "laps", label: "Laps", type: "number", placeholder: "e.g., 20", optional: true },
            { key: "calories_burned", label: "Calories Burned", type: "number", unit: "kcal", placeholder: "e.g., 250" }
        ]
    },
    {
        type: "weightlifting",
        label: "Weight Lifting",
        fields: [
            { key: "exercise_name", label: "Exercise", type: "text", placeholder: "e.g., Bench Press", optional: true },
            { key: "sets", label: "Sets", type: "number", placeholder: "e.g., 3", optional: true },
            { key: "reps", label: "Reps", type: "number", placeholder: "e.g., 10", optional: true },
            { key: "weight", label: "Weight", type: "number", unit: "kg", placeholder: "e.g., 80", optional: true },
            { key: "duration", label: "Duration", type: "time", placeholder: "HH:MM:SS", optional: true },
            { key: "calories_burned", label: "Calories Burned", type: "number", unit: "kcal", placeholder: "e.g., 200" }
        ]
    },
    {
        type: "yoga",
        label: "Yoga",
        fields: [
            { key: "duration", label: "Duration", type: "time", placeholder: "HH:MM:SS", optional: true },
            { key: "style", label: "Style", type: "text", placeholder: "e.g., Vinyasa, Hatha", optional: true },
            { key: "calories_burned", label: "Calories Burned", type: "number", unit: "kcal", placeholder: "e.g., 150" }
        ]
    },
    {
        type: "pilates",
        label: "Pilates",
        fields: [
            { key: "duration", label: "Duration", type: "time", placeholder: "HH:MM:SS", optional: true },
            { key: "calories_burned", label: "Calories Burned", type: "number", unit: "kcal", placeholder: "e.g., 180" }
        ]
    },
    {
        type: "hiit",
        label: "HIIT",
        fields: [
            { key: "duration", label: "Duration", type: "time", placeholder: "HH:MM:SS", optional: true },
            { key: "rounds", label: "Rounds", type: "number", placeholder: "e.g., 5", optional: true },
            { key: "calories_burned", label: "Calories Burned", type: "number", unit: "kcal", placeholder: "e.g., 350" }
        ]
    },
    {
        type: "cardio",
        label: "Cardio",
        fields: [
            { key: "duration", label: "Duration", type: "time", placeholder: "HH:MM:SS", optional: true },
            { key: "machine", label: "Machine", type: "text", placeholder: "e.g., Treadmill, Elliptical", optional: true },
            { key: "calories_burned", label: "Calories Burned", type: "number", unit: "kcal", placeholder: "e.g., 300" }
        ]
    },
    {
        type: "sports",
        label: "Sports",
        fields: [
            { key: "sport_name", label: "Sport", type: "text", placeholder: "e.g., Basketball, Tennis", optional: true },
            { key: "duration", label: "Duration", type: "time", placeholder: "HH:MM:SS", optional: true },
            { key: "calories_burned", label: "Calories Burned", type: "number", unit: "kcal", placeholder: "e.g., 400" }
        ]
    },
    {
        type: "other",
        label: "Other",
        fields: [
            { key: "activity_description", label: "Activity Description", type: "text", placeholder: "e.g., Hiking, Dancing", optional: true },
            { key: "duration", label: "Duration", type: "time", placeholder: "HH:MM:SS", optional: true },
            { key: "calories_burned", label: "Calories Burned", type: "number", unit: "kcal", placeholder: "e.g., 250" }
        ]
    }
];

export function getActivityTypeConfig(type: ActivityType): ActivityTypeConfig | undefined {
    return ACTIVITY_TYPES.find(config => config.type === type);
}

export function getAllActivityTypes(): ActivityTypeConfig[] {
    return ACTIVITY_TYPES;
}

