import { Platform } from 'react-native';

// Use localhost only for web dev (browser CORS is handled by the server)
// Native devices can't reach localhost, so always use production URL
const DEV_WEB_BASE = 'http://localhost:3000';
const PROD_BASE = 'https://nobull.fit';

const BASE = __DEV__ && Platform.OS === 'web' ? DEV_WEB_BASE : PROD_BASE;

// API base URL for the NoBullFit backend
export const API_BASE_URL = `${BASE}/api`;

// Web base URL for WebView
export const WEB_BASE_URL = BASE;
