// Utility functions for formatting activity form fields

/**
 * Formats a time string to HH:MM:SS format
 * Accepts formats: HH:MM:SS, MM:SS, or seconds as number
 */
export function formatTime(value: string | number | null | undefined): string {
    if (!value && value !== 0) return "";
    
    const str = String(value).trim();
    if (!str) return "";

    // If it's already in HH:MM:SS format, validate and normalize
    if (/^([0-9]{1,2}:)?[0-5][0-9]:[0-5][0-9]$/.test(str)) {
        const parts = str.split(":");
        if (parts.length === 2) {
            // MM:SS -> 00:MM:SS
            return `00:${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
        } else if (parts.length === 3) {
            // HH:MM:SS -> ensure proper padding
            return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:${parts[2].padStart(2, "0")}`;
        }
        return str;
    }

    // If it's a number (seconds), convert to HH:MM:SS
    const numValue = parseFloat(str);
    if (!isNaN(numValue) && numValue >= 0) {
        const hours = Math.floor(numValue / 3600);
        const minutes = Math.floor((numValue % 3600) / 60);
        const seconds = Math.floor(numValue % 60);
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    // If invalid, return empty string
    return "";
}

/**
 * Formats a pace string to MM:SS/km format
 * Pace represents minutes and seconds per kilometer (e.g., 5:30/km means 5 minutes 30 seconds per km)
 * 
 * Accepts formats:
 * - MM:SS/km or MM:SS (e.g., "5:30/km", "5:30")
 * - Minutes as decimal (e.g., "5.5" = 5:30/km)
 * - Seconds as number (e.g., "330" = 5:30/km)
 */
export function formatPace(value: string | number | null | undefined): string {
    if (!value && value !== 0) return "";
    
    const str = String(value).trim();
    if (!str) return "";

    // Remove /km suffix if present (case insensitive)
    const cleanStr = str.replace(/\s*\/\s*km\s*$/i, "").trim();

    // If it's already in MM:SS format, validate and normalize
    const timeMatch = cleanStr.match(/^([0-9]{1,2}):([0-5]?[0-9])$/);
    if (timeMatch) {
        const minutes = parseInt(timeMatch[1], 10);
        const seconds = parseInt(timeMatch[2], 10);
        
        // Validate: minutes should be 0-59, seconds should be 0-59
        if (minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
            return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}/km`;
        }
    }

    // If it's a number, interpret it
    const numValue = parseFloat(cleanStr);
    if (!isNaN(numValue) && numValue >= 0) {
        // If the number is less than 100, assume it's minutes (e.g., 5.5 = 5 minutes 30 seconds)
        if (numValue < 100 && numValue !== Math.floor(numValue)) {
            // Decimal minutes (e.g., 5.5 = 5:30)
            const minutes = Math.floor(numValue);
            const seconds = Math.round((numValue - minutes) * 60);
            return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}/km`;
        } else if (numValue < 100) {
            // Whole number less than 100, assume minutes (e.g., 5 = 5:00)
            return `${Math.floor(numValue).toString().padStart(2, "0")}:00/km`;
        } else {
            // Number >= 100, assume it's total seconds (e.g., 330 = 5:30)
            const minutes = Math.floor(numValue / 60);
            const seconds = Math.floor(numValue % 60);
            return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}/km`;
        }
    }

    // If invalid, return empty string
    return "";
}

/**
 * Formats a number to ensure proper decimal places
 * For integers (sets, reps, steps, laps, rounds): no decimals
 * For decimals (distance, weight, speed): up to 2 decimal places
 */
export function formatNumber(
    value: string | number | null | undefined,
    allowDecimals = true,
    maxDecimals = 2
): string {
    if (!value && value !== 0) return "";
    
    const num = typeof value === "number" ? value : parseFloat(String(value));
    if (isNaN(num)) return "";

    if (!allowDecimals) {
        return Math.round(num).toString();
    }

    // Round to maxDecimals and remove trailing zeros
    const rounded = Number(num.toFixed(maxDecimals));
    return rounded.toString();
}

/**
 * Formats text by trimming whitespace and removing extra spaces
 */
export function formatText(value: string | null | undefined): string {
    if (!value) return "";
    return value.trim().replace(/\s+/g, " ");
}

/**
 * Formats a field value based on its type
 */
export function formatFieldValue(
    value: string | number | null | undefined,
    fieldType: "number" | "text" | "time",
    fieldKey: string
): string {
    if (!value && value !== 0) return "";

    // Special handling for pace field (regardless of type)
    if (fieldKey === "pace") {
        return formatPace(value);
    }

    switch (fieldType) {
        case "time": {
            return formatTime(value);
        }
        case "number": {
            // Determine if decimals are allowed based on field key
            const integerFields = ["sets", "reps", "steps", "laps", "rounds"];
            const allowDecimals = !integerFields.includes(fieldKey);
            return formatNumber(value, allowDecimals);
        }
        case "text":
            return formatText(String(value));
        default:
            return String(value);
    }
}
