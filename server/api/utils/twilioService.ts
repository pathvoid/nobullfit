// Twilio SMS service for sending verification codes and reminder notifications

import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

let client: twilio.Twilio | null = null;

// Lazy initialize Twilio client to ensure environment variables are loaded
function getTwilioClient(): twilio.Twilio {
    if (!client) {
        const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
        const authToken = process.env.TWILIO_AUTH_TOKEN || "";

        if (!accountSid || !authToken) {
            throw new Error("Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env file.");
        }

        client = twilio(accountSid, authToken);
    }
    return client;
}

// Send an SMS message via Twilio Messaging Service
export async function sendSMS(to: string, body: string): Promise<void> {
    const twilioClient = getTwilioClient();
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || "";

    if (!messagingServiceSid) {
        throw new Error("TWILIO_MESSAGING_SERVICE_SID not configured in .env file.");
    }

    await twilioClient.messages.create({
        to,
        messagingServiceSid,
        body
    });
}

// Validate phone number is in E.164 format (e.g., +12025551234)
export function validateE164(phoneNumber: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
}
