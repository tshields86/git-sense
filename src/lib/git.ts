import { execSync } from 'child_process';
import type { RepoInfo } from '../types/index.js';

export function isGitRepo(): boolean {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    throw new Error('Failed to get current branch');
  }
}

export function getRemoteUrl(): string | null {
  try {
    // Try origin first, then any remote
    const remotes = execSync('git remote', { encoding: 'utf-8' }).trim().split('\n');
    if (remotes.length === 0 || remotes[0] === '') {
      return null;
    }

    const remote = remotes.includes('origin') ? 'origin' : remotes[0];
    return execSync(`git remote get-url ${remote}`, { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // Handle SSH format: git@github.com:owner/repo.git
  const sshMatch = url.match(/^git@github\.com:([^/]+)\/(.+?)(\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  // Handle HTTPS format: https://github.com/owner/repo.git
  const httpsMatch = url.match(/^https:\/\/github\.com\/([^/]+)\/(.+?)(\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  return null;
}

export function getRepoInfo(): RepoInfo | null {
  if (!isGitRepo()) {
    return null;
  }

  const remoteUrl = getRemoteUrl();
  if (!remoteUrl) {
    return null;
  }

  const parsed = parseGitHubUrl(remoteUrl);
  if (!parsed) {
    return null;
  }

  return {
    owner: parsed.owner,
    repo: parsed.repo,
    defaultBranch: getCurrentBranch(), // This is current branch, not necessarily default
  };
}

export function ensureGitRepo(): void {
  if (!isGitRepo()) {
    throw new Error('Not in a git repository. Run this from inside a git project.');
  }
}

export function ensureGitHubRemote(): RepoInfo {
  ensureGitRepo();

  const remoteUrl = getRemoteUrl();
  if (!remoteUrl) {
    throw new Error('No remote found. This tool works with GitHub repositories.');
  }

  const parsed = parseGitHubUrl(remoteUrl);
  if (!parsed) {
    throw new Error('No GitHub remote found. This tool works with GitHub repositories.');
  }

  return {
    owner: parsed.owner,
    repo: parsed.repo,
    defaultBranch: getCurrentBranch(),
  };
}
