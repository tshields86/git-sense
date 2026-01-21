import {
  getGitHubToken,
  getAnthropicKey,
  setAnthropicKey,
  clearConfig,
  isGitHubAuthenticated,
} from '../lib/config.js';
import { getAuthenticatedUser } from '../lib/github.js';
import * as fmt from '../lib/format.js';

interface ConfigOptions {
  anthropicKey?: string;
  show?: boolean;
  clear?: boolean;
}

function validateAnthropicKey(key: string): boolean {
  return key.startsWith('sk-ant-');
}

async function showConfig(): Promise<void> {
  fmt.newline();
  console.log('Configuration:');

  // GitHub status
  if (isGitHubAuthenticated()) {
    try {
      const user = await getAuthenticatedUser();
      console.log(`  GitHub: authenticated as @${user.login}`);
    } catch {
      console.log('  GitHub: token stored (unable to verify)');
    }
  } else {
    console.log('  GitHub: not authenticated');
  }

  // Anthropic status
  const anthropicKey = getAnthropicKey();
  if (anthropicKey) {
    const masked = fmt.maskSecret(anthropicKey);
    console.log(`  Anthropic: ${masked} (configured)`);
  } else {
    console.log('  Anthropic: not configured');
  }

  fmt.newline();
}

export async function configCommand(options: ConfigOptions): Promise<void> {
  try {
    // Handle --clear
    if (options.clear) {
      clearConfig();
      fmt.success('Configuration cleared.');
      return;
    }

    // Handle --anthropic-key
    if (options.anthropicKey) {
      if (!validateAnthropicKey(options.anthropicKey)) {
        fmt.error('Invalid API key format. Key should start with \'sk-ant-\'.');
        process.exit(1);
      }
      setAnthropicKey(options.anthropicKey);
      fmt.success('Anthropic API key saved.');
      return;
    }

    // Handle --show (default if no other options)
    if (options.show || (!options.anthropicKey && !options.clear)) {
      await showConfig();
      return;
    }
  } catch (err) {
    fmt.error(err instanceof Error ? err.message : 'Configuration error');
    process.exit(1);
  }
}
