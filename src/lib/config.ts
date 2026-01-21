import Conf from 'conf';

interface ConfigSchema {
  githubToken?: string;
  anthropicKey?: string;
}

const config = new Conf<ConfigSchema>({
  projectName: 'git-sense',
});

export function getGitHubToken(): string | undefined {
  // Environment variable takes precedence
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }
  return config.get('githubToken');
}

export function setGitHubToken(token: string): void {
  config.set('githubToken', token);
}

export function getAnthropicKey(): string | undefined {
  // Environment variable takes precedence
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }
  return config.get('anthropicKey');
}

export function setAnthropicKey(key: string): void {
  config.set('anthropicKey', key);
}

export function isGitHubAuthenticated(): boolean {
  return !!getGitHubToken();
}

export function isAnthropicConfigured(): boolean {
  return !!getAnthropicKey();
}

export function clearConfig(): void {
  config.clear();
}

export function getConfigPath(): string {
  return config.path;
}

// Placeholder for interactive prompt - will be implemented in Task 3.4
export async function ensureAnthropicKey(): Promise<string> {
  const key = getAnthropicKey();
  if (key) {
    return key;
  }
  // This will be replaced with interactive prompt in Task 3.4
  throw new Error('Anthropic API key not found. Run "git-sense config --anthropic-key <key>" to set it.');
}
