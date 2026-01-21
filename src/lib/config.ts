import Conf from 'conf';
import * as readline from 'readline';
import chalk from 'chalk';

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

function validateAnthropicKeyFormat(key: string): boolean {
  return key.startsWith('sk-ant-');
}

async function promptForAnthropicKey(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log();
  console.log(chalk.yellow('Anthropic API key not found.'));
  console.log();
  console.log(chalk.blue('→'), `Get your API key at: ${chalk.underline('https://console.anthropic.com/api-keys')}`);

  return new Promise((resolve, reject) => {
    rl.question(chalk.blue('→') + ' Enter your API key: ', (answer) => {
      rl.close();

      const key = answer.trim();

      if (!key) {
        reject(new Error('No API key provided.'));
        return;
      }

      if (!validateAnthropicKeyFormat(key)) {
        reject(new Error('Invalid API key format. Key should start with \'sk-ant-\'.'));
        return;
      }

      setAnthropicKey(key);
      console.log(chalk.green('✓'), 'API key saved.');
      console.log();
      resolve(key);
    });
  });
}

export async function ensureAnthropicKey(): Promise<string> {
  const key = getAnthropicKey();
  if (key) {
    return key;
  }

  // Interactive prompt for API key
  return promptForAnthropicKey();
}
