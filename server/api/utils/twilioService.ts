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

// Validate that an incoming request is genuinely from Twilio
export function validateTwilioSignature(signature: string, url: string, params: Record<string, string>): boolean {
    const authToken = process.env.TWILIO_AUTH_TOKEN || "";
    if (!authToken) return false;
    return twilio.validateRequest(authToken, signature, url, params);
}