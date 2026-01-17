import crypto from "crypto";

// Paddle API configuration
const PADDLE_API_URL = process.env.PADDLE_ENVIRONMENT === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

// Helper to make authenticated Paddle API requests
async function paddleRequest<T>(
    endpoint: string,
    options: {
        method?: string;
        body?: Record<string, unknown>;
    } = {}
): Promise<T> {
    const { method = "GET", body } = options;

    const response = await fetch(`${PADDLE_API_URL}${endpoint}`, {
        method,
        headers: {
            "Authorization": `Bearer ${process.env.PADDLE_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Paddle API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    return response.json();
}

// Paddle webhook event types
export interface PaddleWebhookEvent {
    event_id: string;
    event_type: string;
    occurred_at: string;
    notification_id: string;
    data: {
        id: string;
        status?: string;
        customer_id?: string;
        scheduled_change?: {
            action: string;
            effective_at: string;
        } | null;
        current_billing_period?: {
            starts_at: string;
            ends_at: string;
        };
        custom_data?: Record<string, unknown>;
        items?: Array<{
            price: {
                id: string;
                product_id: string;
            };
            quantity: number;
        }>;
        [key: string]: unknown;
    };
}

// Paddle subscription response type
interface PaddleSubscription {
    data: {
        id: string;
        status: string;
        customer_id: string;
        current_billing_period?: {
            starts_at: string;
            ends_at: string;
        };
        next_billed_at?: string;
        scheduled_change?: {
            action: string;
            effective_at: string;
        } | null;
        items: Array<{
            price: {
                id: string;
                product_id: string;
                unit_price: {
                    amount: string;
                    currency_code: string;
                };
                billing_cycle: {
                    interval: string;
                    frequency: number;
                };
            };
            quantity: number;
        }>;
    };
}

// Paddle customer response type
interface PaddleCustomer {
    data: {
        id: string;
        email: string;
        name?: string;
    };
}

// Customer portal session response type
interface PaddlePortalSession {
    data: {
        id: string;
        urls: {
            general: {
                overview: string;
            };
        };
    };
}

// Verify Paddle webhook signature
export function verifyWebhookSignature(
    rawBody: string,
    signature: string | undefined,
    webhookSecret: string
): boolean {
    if (!signature) {
        return false;
    }

    try {
        // Parse the signature header
        // Format: ts=timestamp;h1=signature
        const parts = signature.split(";");
        const tsMatch = parts.find(p => p.startsWith("ts="));
        const h1Match = parts.find(p => p.startsWith("h1="));

        if (!tsMatch || !h1Match) {
            console.error("Invalid signature format");
            return false;
        }

        const timestamp = tsMatch.replace("ts=", "");
        const providedSignature = h1Match.replace("h1=", "");

        // Build the signed payload
        const signedPayload = `${timestamp}:${rawBody}`;

        // Calculate expected signature using HMAC-SHA256
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(signedPayload)
            .digest("hex");

        // Compare signatures using timing-safe comparison
        const sigBuffer = Buffer.from(providedSignature, "hex");
        const expectedBuffer = Buffer.from(expectedSignature, "hex");

        if (sigBuffer.length !== expectedBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch (error) {
        console.error("Error verifying webhook signature:", error);
        return false;
    }
}

// Get or create a Paddle customer by email
export async function getOrCreateCustomer(email: string, name?: string): Promise<string> {
    // First, try to find existing customer by email
    const searchResponse = await paddleRequest<{ data: Array<{ id: string }> }>(
        `/customers?email=${encodeURIComponent(email)}`
    );

    if (searchResponse.data && searchResponse.data.length > 0) {
        return searchResponse.data[0].id;
    }

    // Create new customer
    const createResponse = await paddleRequest<PaddleCustomer>("/customers", {
        method: "POST",
        body: {
            email,
            name: name || undefined
        }
    });

    return createResponse.data.id;
}

// Get subscription details by ID
export async function getSubscription(subscriptionId: string): Promise<PaddleSubscription["data"] | null> {
    try {
        const response = await paddleRequest<PaddleSubscription>(`/subscriptions/${subscriptionId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching subscription:", error);
        return null;
    }
}

// List subscriptions for a customer
export async function listCustomerSubscriptions(customerId: string): Promise<PaddleSubscription["data"][]> {
    try {
        const response = await paddleRequest<{ data: PaddleSubscription["data"][] }>(
            `/subscriptions?customer_id=${customerId}&status=active,trialing,past_due`
        );
        return response.data || [];
    } catch (error) {
        console.error("Error listing customer subscriptions:", error);
        return [];
    }
}

// Create a customer portal session
export async function createPortalSession(
    customerId: string,
    subscriptionIds?: string[]
): Promise<string> {
    const body: Record<string, unknown> = {};

    if (subscriptionIds && subscriptionIds.length > 0) {
        body.subscription_ids = subscriptionIds;
    }

    const response = await paddleRequest<PaddlePortalSession>(
        `/customers/${customerId}/portal-sessions`,
        {
            method: "POST",
            body: Object.keys(body).length > 0 ? body : undefined
        }
    );

    return response.data.urls.general.overview;
}

// Get customer by Paddle customer ID
export async function getCustomer(customerId: string): Promise<PaddleCustomer["data"] | null> {
    try {
        const response = await paddleRequest<PaddleCustomer>(`/customers/${customerId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching customer:", error);
        return null;
    }
}

// Result type for email update
export interface UpdateEmailResult {
    success: boolean;
    conflict?: boolean;
    existingCustomerId?: string;
}

// Update customer email in Paddle
// Returns information about whether the update succeeded or if there's a conflict
export async function updateCustomerEmail(customerId: string, newEmail: string): Promise<UpdateEmailResult> {
    try {
        await paddleRequest<PaddleCustomer>(`/customers/${customerId}`, {
            method: "PATCH",
            body: {
                email: newEmail
            }
        });
        return { success: true };
    } catch (error) {
        // Check if this is a conflict error (email already exists on another customer)
        if (error instanceof Error && error.message.includes("customer_already_exists")) {
            // Extract the existing customer ID from the error message
            const match = error.message.match(/ctm_[a-zA-Z0-9]+/);
            const existingCustomerId = match ? match[0] : undefined;
            
            return {
                success: false,
                conflict: true,
                existingCustomerId
            };
        }
        
        console.error("Error updating customer email in Paddle:", error);
        return { success: false };
    }
}

// Cancel a subscription immediately
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
        await paddleRequest<PaddleSubscription>(`/subscriptions/${subscriptionId}/cancel`, {
            method: "POST",
            body: {
                effective_from: "immediately"
            }
        });
        return true;
    } catch (error) {
        console.error("Error canceling subscription:", error);
        return false;
    }
}

// Cancel all active subscriptions for a customer
export async function cancelAllCustomerSubscriptions(customerId: string): Promise<boolean> {
    try {
        const subscriptions = await listCustomerSubscriptions(customerId);
        
        for (const subscription of subscriptions) {
            await cancelSubscription(subscription.id);
        }
        
        return true;
    } catch (error) {
        console.error("Error canceling customer subscriptions:", error);
        return false;
    }
}

// Format price amount from Paddle (cents to dollars)
export function formatPaddleAmount(amount: string, currencyCode: string): string {
    const value = parseInt(amount, 10) / 100;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode
    }).format(value);
}
