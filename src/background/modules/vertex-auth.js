/**
 * Vertex AI Authentication
 * Generates OAuth2 access tokens from a Google Cloud service account JSON key.
 * Uses Web Crypto API (available in service workers) for JWT signing.
 */

let cachedToken = null;
let cachedExpiry = 0;

/**
 * Get a valid access token, refreshing if needed.
 * @param {string} serviceAccountJson - The service account JSON key (as string)
 * @returns {Promise<string>} OAuth2 access token
 */
export async function getAccessToken(serviceAccountJson) {
  // Return cached token if still valid (with 5-min buffer)
  if (cachedToken && Date.now() < cachedExpiry - 5 * 60 * 1000) {
    return cachedToken;
  }

  const sa = typeof serviceAccountJson === 'string'
    ? JSON.parse(serviceAccountJson)
    : serviceAccountJson;

  const jwt = await createSignedJWT(sa.client_email, sa.private_key);
  const token = await exchangeJWTForToken(jwt);

  cachedToken = token.access_token;
  cachedExpiry = Date.now() + (token.expires_in * 1000);

  return cachedToken;
}

/**
 * Create a signed JWT for Google OAuth2
 */
async function createSignedJWT(clientEmail, privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );

  const encodedSignature = base64UrlEncodeBuffer(signature);
  return `${signingInput}.${encodedSignature}`;
}

/**
 * Exchange a signed JWT for an OAuth2 access token
 */
async function exchangeJWTForToken(jwt) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vertex AI token exchange failed: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Import a PEM-encoded RSA private key into Web Crypto
 */
async function importPrivateKey(pem) {
  // Strip PEM headers and decode base64
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Clear the cached token (e.g., on auth error)
 */
export function clearTokenCache() {
  cachedToken = null;
  cachedExpiry = 0;
}
