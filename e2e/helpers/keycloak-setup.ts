/**
 * Keycloak Setup Helper for E2E Tests
 * Creates realm, client, and test users via Admin API
 */
import fetch from 'node-fetch';

export interface KeycloakSetupOptions {
  adminUrl: string;
  adminUser: string;
  adminPassword: string;
  realm: string;
  clientId: string;
  redirectUris: string[];
}

export interface TestUser {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Get admin access token
 */
async function getAdminToken(
  adminUrl: string,
  adminUser: string,
  adminPassword: string,
): Promise<string> {
  const response = await fetch(
    `${adminUrl}/realms/master/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: adminUser,
        password: adminPassword,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get admin token: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Create Keycloak realm
 */
async function createRealm(
  adminUrl: string,
  token: string,
  realmName: string,
): Promise<void> {
  const response = await fetch(`${adminUrl}/admin/realms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      realm: realmName,
      enabled: true,
      registrationAllowed: false,
      resetPasswordAllowed: true,
      accessTokenLifespan: 300, // 5 minutes
      ssoSessionIdleTimeout: 1800, // 30 minutes
      ssoSessionMaxLifespan: 36000, // 10 hours
    }),
  });

  if (!response.ok && response.status !== 409) {
    // 409 = already exists
    const text = await response.text();
    throw new Error(`Failed to create realm: ${response.status} ${text}`);
  }
}

/**
 * Create OIDC client
 */
async function createClient(
  adminUrl: string,
  token: string,
  realmName: string,
  clientId: string,
  redirectUris: string[],
): Promise<void> {
  const response = await fetch(
    `${adminUrl}/admin/realms/${realmName}/clients`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        clientId,
        enabled: true,
        publicClient: false,
        directAccessGrantsEnabled: true, // Enable password grant
        standardFlowEnabled: true, // Enable authorization code flow
        serviceAccountsEnabled: false,
        redirectUris,
        webOrigins: ['*'],
        protocol: 'openid-connect',
        clientAuthenticatorType: 'client-secret',
      }),
    },
  );

  if (!response.ok && response.status !== 409) {
    const text = await response.text();
    throw new Error(`Failed to create client: ${response.status} ${text}`);
  }
}

/**
 * Create test user
 */
async function createUser(
  adminUrl: string,
  token: string,
  realmName: string,
  user: TestUser,
): Promise<void> {
  // Create user
  const createResponse = await fetch(
    `${adminUrl}/admin/realms/${realmName}/users`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        enabled: true,
        emailVerified: true,
      }),
    },
  );

  if (!createResponse.ok && createResponse.status !== 409) {
    const text = await createResponse.text();
    throw new Error(`Failed to create user: ${createResponse.status} ${text}`);
  }

  // Get user ID
  const usersResponse = await fetch(
    `${adminUrl}/admin/realms/${realmName}/users?username=${user.username}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  const users = (await usersResponse.json()) as Array<{ id: string }>;
  if (users.length === 0) {
    throw new Error(`User ${user.username} not found after creation`);
  }

  const userId = users[0].id;

  // Set password
  const passwordResponse = await fetch(
    `${adminUrl}/admin/realms/${realmName}/users/${userId}/reset-password`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: 'password',
        value: user.password,
        temporary: false,
      }),
    },
  );

  if (!passwordResponse.ok) {
    const text = await passwordResponse.text();
    throw new Error(
      `Failed to set password: ${passwordResponse.status} ${text}`,
    );
  }
}

/**
 * Setup complete Keycloak realm with client and users
 */
export async function setupKeycloakRealm(
  options: KeycloakSetupOptions,
  users: TestUser[],
): Promise<void> {
  console.log(`🔑 Setting up Keycloak realm: ${options.realm}`);

  // Wait for Keycloak to be ready (with retry)
  let adminToken = '';
  const startTime = Date.now();
  while (Date.now() - startTime < DEFAULT_TIMEOUT) {
    try {
      adminToken = await getAdminToken(
        options.adminUrl,
        options.adminUser,
        options.adminPassword,
      );
      break;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between retries
    }
  }

  if (!adminToken) {
    throw new Error('Keycloak not ready after 30 seconds');
  }

  // Create realm
  await createRealm(options.adminUrl, adminToken, options.realm);
  console.log(`✅ Realm created: ${options.realm}`);

  // Create client
  await createClient(
    options.adminUrl,
    adminToken,
    options.realm,
    options.clientId,
    options.redirectUris,
  );
  console.log(`✅ Client created: ${options.clientId}`);

  // Create users
  for (const user of users) {
    await createUser(options.adminUrl, adminToken, options.realm, user);
    console.log(`✅ User created: ${user.username}`);
  }

  console.log('✅ Keycloak setup complete');
}

/**
 * Login user and get tokens
 */
export async function loginUser(
  keycloakUrl: string,
  realm: string,
  clientId: string,
  username: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await fetch(
    `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: clientId,
        username,
        password,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Login failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}
