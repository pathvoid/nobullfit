// Shared types for integration providers

// OAuth token data returned from providers
export interface TokenData {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    scopes?: string[];
}

// Result of a sync operation
export interface SyncResult {
    success: boolean;
    recordsImported: number;
    dataTypesSynced: string[];
    error?: string;
    errorCode?: string;
}

// User information from provider
export interface ProviderUserInfo {
    providerId: string;
    email?: string;
    name?: string;
}

// Activity/workout data imported from providers
export interface ImportedActivity {
    externalId: string;
    activityType: string;
    activityName: string;
    startTime: Date;
    endTime?: Date;
    durationMinutes?: number;
    caloriesBurned?: number;
    distance?: number;
    distanceUnit?: string;
    heartRateAvg?: number;
    heartRateMax?: number;
    metadata?: Record<string, unknown>;
}

// Weight data imported from smart scales
export interface ImportedWeight {
    externalId?: string;
    weight: number;
    unit: "kg" | "lbs";
    timestamp: Date;
    bodyFatPercentage?: number;
    muscleMass?: number;
    boneMass?: number;
    waterPercentage?: number;
}

// Calorie burn data from wearables
export interface ImportedCalorieBurn {
    date: Date;
    caloriesBurned: number;
    activeCalories?: number;
    restingCalories?: number;
    source: string;
}

// Provider configuration
export interface ProviderConfig {
    providerKey: string;
    providerName: string;
    description: string;
    category: "wearable" | "workout" | "scale";
    logoUrl: string;
    supportedDataTypes: DataType[];
    oauthScopes: string[];
    oauthAuthorizationUrl: string;
    oauthTokenUrl: string;
    requiresPkce: boolean;
    // Mobile-only providers (Apple Health, Samsung Health)
    mobileOnly: boolean;
}

// Supported data types for sync
export type DataType = "workouts" | "calories_burned" | "weight" | "heart_rate" | "sleep" | "steps";

// Connection status
export type ConnectionStatus = "active" | "disconnected" | "expired" | "error";

// Integration connection from database
export interface IntegrationConnection {
    id: number;
    user_id: number;
    provider: string;
    access_token_encrypted: string;
    refresh_token_encrypted?: string;
    token_expires_at?: Date;
    provider_user_id?: string;
    scopes: string[];
    status: ConnectionStatus;
    last_error?: string;
    last_sync_at?: Date;
    last_successful_sync_at?: Date;
    connected_at: Date;
    updated_at: Date;
}

// Sync history entry from database
export interface SyncHistoryEntry {
    id: number;
    user_id: number;
    provider: string;
    sync_type: "manual" | "auto";
    status: "success" | "partial" | "failed";
    records_imported: number;
    data_types_synced: string[];
    error_message?: string;
    error_code?: string;
    started_at: Date;
    completed_at?: Date;
    duration_ms?: number;
    created_at: Date;
}

// Provider interface that all providers must implement
export interface IntegrationProvider {
    readonly config: ProviderConfig;

    // OAuth flow
    getAuthorizationUrl(state: string, redirectUri: string, codeVerifier?: string): string;
    exchangeCodeForTokens(code: string, redirectUri: string, codeVerifier?: string): Promise<TokenData>;
    refreshAccessToken(refreshToken: string): Promise<TokenData>;

    // User info
    getUserInfo(accessToken: string): Promise<ProviderUserInfo>;

    // Data sync
    syncData(accessToken: string, dataTypes: DataType[], since?: Date): Promise<SyncResult>;

    // Token validation
    isTokenValid(accessToken: string): Promise<boolean>;
}

// Integration info returned to frontend (without sensitive data)
export interface IntegrationInfo {
    provider: string;
    providerName: string;
    description: string;
    category: "wearable" | "workout" | "scale";
    logoUrl: string;
    supportedDataTypes: DataType[];
    isEnabled: boolean; // from feature flags
    isConnected: boolean;
    connectionStatus?: ConnectionStatus;
    lastSyncAt?: string;
    lastSuccessfulSyncAt?: string;
    providerUserId?: string;
    mobileOnly: boolean;
}
