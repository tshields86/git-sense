import { Octokit } from '@octokit/rest';
import { getGitHubToken } from './config.js';
import type { GitHubCommit, GitHubPR, DateRange } from '../types/index.js';

let octokitInstance: Octokit | null = null;

export function getOctokit(): Octokit {
  const token = getGitHubToken();
  if (!token) {
    throw new Error('Not authenticated with GitHub. Run "git-sense auth" first.');
  }

  if (!octokitInstance) {
    octokitInstance = new Octokit({ auth: token });
  }
  return octokitInstance;
}

export async function getAuthenticatedUser(): Promise<{ login: string; name: string | null }> {
  const octokit = getOctokit();
  const { data } = await octokit.users.getAuthenticated();
  return { login: data.login, name: data.name };
}

export async function fetchCommits(
  owner: string,
  repo: string,
  dateRange?: DateRange,
  maxCount = 500
): Promise<GitHubCommit[]> {
  const octokit = getOctokit();
  const commits: GitHubCommit[] = [];

  try {
    const iterator = octokit.paginate.iterator(octokit.repos.listCommits, {
      owner,
      repo,
      since: dateRange?.since.toISOString(),
      until: dateRange?.until.toISOString(),
      per_page: 100,
    });

    for await (const { data } of iterator) {
      for (const commit of data) {
        commits.push({
          sha: commit.sha,
          message: commit.commit.message,
          author: {
            login: commit.author?.login ?? 'unknown',
            name: commit.commit.author?.name ?? 'Unknown',
          },
          date: commit.commit.author?.date ?? new Date().toISOString(),
          files: undefined, // File details require separate API call
        });

        if (commits.length >= maxCount) {
          return commits;
        }
      }
    }
  } catch (error) {
    handleGitHubError(error);
  }

  return commits;
}

export async function fetchMergedPRs(
  owner: string,
  repo: string,
  dateRange?: DateRange,
  maxCount = 200
): Promise<GitHubPR[]> {
  const octokit = getOctokit();
  const prs: GitHubPR[] = [];

  try {
    const iterator = octokit.paginate.iterator(octokit.pulls.list, {
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
    });

    for await (const { data } of iterator) {
      for (const pr of data) {
        // Skip if not merged
        if (!pr.merged_at) continue;

        const mergedAt = new Date(pr.merged_at);

        // Apply date range filtering
        if (dateRange) {
          if (mergedAt < dateRange.since) {
            // We've gone past our date range, stop fetching
            return prs;
          }
          if (mergedAt > dateRange.until) {
            continue;
          }
        }

        prs.push({
          number: pr.number,
          title: pr.title,
          body: pr.body ?? '',
          author: pr.user?.login ?? 'unknown',
          mergedAt: pr.merged_at,
          labels: pr.labels.map((l) => (typeof l === 'string' ? l : l.name ?? '')),
        });

        if (prs.length >= maxCount) {
          return prs;
        }
      }
    }
  } catch (error) {
    handleGitHubError(error);
  }

  return prs;
}

export async function fetchCommitsBetweenRefs(
  owner: string,
  repo: string,
  base: string,
  head: string
): Promise<GitHubCommit[]> {
  const octokit = getOctokit();

  try {
    const { data } = await octokit.repos.compareCommits({
      owner,
      repo,
      base,
      head,
    });

    return data.commits.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        login: commit.author?.login ?? 'unknown',
        name: commit.commit.author?.name ?? 'Unknown',
      },
      date: commit.commit.author?.date ?? new Date().toISOString(),
      files: commit.files?.map((f) => f.filename),
    }));
  } catch (error) {
    handleGitHubError(error);
    return [];
  }
}

function handleGitHubError(error: unknown): never {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    const message = 'message' in error ? String((error as { message: string }).message) : 'Unknown error';

    if (status === 401) {
      throw new Error('GitHub authentication failed. Run "git-sense auth" to re-authenticate.');
    }

    if (status === 403) {
      // Check for rate limiting
      if (message.includes('rate limit')) {
        const resetHeader = 'headers' in error
          ? (error as { headers: Record<string, string> }).headers['x-ratelimit-reset']
          : undefined;

        if (resetHeader) {
          const resetTime = new Date(parseInt(resetHeader) * 1000);
          throw new Error(`GitHub API rate limit reached. Resets at ${resetTime.toLocaleTimeString()}. Try again later.`);
        }
        throw new Error('GitHub API rate limit reached. Try again later.');
      }
      throw new Error(`GitHub API access denied: ${message}`);
    }

    if (status === 404) {
      throw new Error('Repository not found. Check that you have access to this repository.');
    }
  }

  throw error;
}

export async function checkRateLimit(): Promise<{ remaining: number; reset: Date }> {
  const octokit = getOctokit();
  const { data } = await octokit.rateLimit.get();

  return {
    remaining: data.rate.remaining,
    reset: new Date(data.rate.reset * 1000),
  };
}
