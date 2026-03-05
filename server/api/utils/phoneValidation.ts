// Phone number validation - blocks emergency, premium-rate, toll-free, and short code numbers

import { parsePhoneNumber } from "libphonenumber-js/max";

// Result type for phone validation
export interface PhoneValidationResult {
    valid: boolean;
    error?: string;
}

// Emergency number patterns checked against the national number portion
const EMERGENCY_NUMBERS: Set<string> = new Set([
    "911",    // US, Canada
    "112",    // EU, International
    "999",    // UK, Bangladesh, Ghana
    "000",    // Australia
    "110",    // Germany, China, Japan
    "119",    // South Korea, Japan (fire/ambulance)
    "100",    // India (police), Israel
    "101",    // India (fire), UK (non-emergency)
    "102",    // India (ambulance)
    "108",    // India (ambulance)
    "190",    // Brazil
    "111",    // New Zealand
    "113",    // Norway, Vietnam
    "114",    // Vietnam (fire)
    "115",    // Vietnam (ambulance), Italy
    "116",    // Indonesia
    "117",    // Switzerland (police)
    "118",    // Switzerland (fire), Italy (fire)
    "122",    // Egypt, Austria
    "123",    // Egypt (ambulance)
    "133",    // Austria (police)
    "144",    // Austria, Switzerland (ambulance)
    "155",    // Turkey (police)
    "10111",  // South Africa (police)
    "10177",  // South Africa (ambulance)
]);

// Number types allowed (real phone lines that can receive SMS)
const ALLOWED_TYPES: Set<string> = new Set([
    "MOBILE",
    "FIXED_LINE_OR_MOBILE",
]);

// Blocked types with user-friendly error messages
const BLOCKED_TYPE_MESSAGES: Record<string, string> = {
    "PREMIUM_RATE": "Premium-rate numbers are not allowed.",
    "TOLL_FREE": "Toll-free numbers cannot receive verification codes.",
    "SHARED_COST": "Shared-cost numbers are not allowed.",
    "PERSONAL_NUMBER": "Personal (virtual) numbers are not allowed.",
    "UAN": "Universal access numbers are not allowed.",
    "VOICEMAIL": "Voicemail numbers are not allowed.",
    "PAGER": "Pager numbers cannot receive verification codes.",
    "VOIP": "VoIP numbers are not allowed. Please use a mobile number.",
    "FIXED_LINE": "Landline numbers cannot receive SMS verification codes. Please use a mobile number.",
};

// Validate a phone number for safe SMS delivery
export function validatePhoneNumber(phoneNumber: string): PhoneValidationResult {
    // Basic format check
    if (!phoneNumber || !phoneNumber.startsWith("+")) {
        return { valid: false, error: "Phone number must be in international format starting with +" };
    }

    // Parse with libphonenumber-js
    let parsed;
    try {
        parsed = parsePhoneNumber(phoneNumber);
    } catch {
        return { valid: false, error: "Invalid phone number format." };
    }

    if (!parsed) {
        return { valid: false, error: "Could not parse phone number." };
    }

    // Check basic validity
    if (!parsed.isValid()) {
        return { valid: false, error: "Invalid phone number." };
    }

    // Extract national number and check against emergency blocklist
    const nationalNumber = parsed.nationalNumber;

    if (EMERGENCY_NUMBERS.has(nationalNumber)) {
        return { valid: false, error: "This phone number cannot be used for verification." };
    }

    // Block numbers with very short national numbers (likely short codes)
    if (nationalNumber.length < 5) {
        return { valid: false, error: "Short code numbers cannot be used for verification." };
    }

    // Check number type
    const numberType = parsed.getType();

    if (numberType && BLOCKED_TYPE_MESSAGES[numberType]) {
        return { valid: false, error: BLOCKED_TYPE_MESSAGES[numberType] };
    }

    // If type is detected and not in allowed list, block it
    if (numberType && !ALLOWED_TYPES.has(numberType)) {
        return { valid: false, error: "This type of phone number cannot be used for verification." };
    }

    // If type is undefined (couldn't determine), allow it since it passed
    // validity checks and the emergency blocklist
    return { valid: true };
}
