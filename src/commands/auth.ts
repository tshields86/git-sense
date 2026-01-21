import { setGitHubToken } from '../lib/config.js';
import { getAuthenticatedUser } from '../lib/github.js';
import * as fmt from '../lib/format.js';

const GITHUB_CLIENT_ID = 'Ov23livD27sKp8K0qGOL';

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface AccessTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: 'repo',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to start device flow: ${response.statusText}`);
  }

  return response.json();
}

async function pollForAccessToken(
  deviceCode: string,
  interval: number,
  expiresIn: number
): Promise<string> {
  const startTime = Date.now();
  const expiresAt = startTime + expiresIn * 1000;

  while (Date.now() < expiresAt) {
    await sleep(interval * 1000);

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data: AccessTokenResponse = await response.json();

    if (data.access_token) {
      return data.access_token;
    }

    if (data.error === 'authorization_pending') {
      // Continue polling
      continue;
    }

    if (data.error === 'slow_down') {
      // Increase interval
      interval += 5;
      continue;
    }

    if (data.error === 'expired_token') {
      throw new Error('The device code has expired. Please try again.');
    }

    if (data.error === 'access_denied') {
      throw new Error('Authorization was denied. Please try again and authorize access.');
    }

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }
  }

  throw new Error('Authorization timed out. Please try again.');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function authCommand(): Promise<void> {
  try {
    fmt.newline();
    const spinner = fmt.spinner('Starting GitHub authentication...');

    const deviceCode = await requestDeviceCode();
    spinner.stop();

    fmt.info(`Open this URL in your browser: ${deviceCode.verification_uri}`);
    fmt.info(`Enter code: ${deviceCode.user_code}`);
    fmt.newline();

    const waitSpinner = fmt.spinner('Waiting for authorization...');

    const accessToken = await pollForAccessToken(
      deviceCode.device_code,
      deviceCode.interval,
      deviceCode.expires_in
    );

    setGitHubToken(accessToken);
    waitSpinner.succeed('Authorized');

    // Get and display username
    const user = await getAuthenticatedUser();
    fmt.success(`Authenticated as ${user.login}`);
    fmt.muted('Token saved. You\'re ready to use git-sense!');
    fmt.newline();
  } catch (err) {
    fmt.newline();
    fmt.error(err instanceof Error ? err.message : 'Authentication failed');
    process.exit(1);
  }
}
