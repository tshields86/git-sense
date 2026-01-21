import { ensureGitHubRemote } from '../lib/git.js';
import { fetchCommits, fetchMergedPRs } from '../lib/github.js';
import { ensureAnthropicKey } from '../lib/config.js';
import { streamCompletion, buildContributorPrompt } from '../lib/ai.js';
import * as fmt from '../lib/format.js';
import type { DateRange, GitHubCommit, GitHubPR, ContributorStats } from '../types/index.js';

interface ContributorsOptions {
  weeks?: string;
  months?: string;
}

function calculateDateRange(options: ContributorsOptions): DateRange {
  const now = new Date();
  const since = new Date();

  if (options.months) {
    const months = parseInt(options.months, 10);
    if (isNaN(months) || months < 1) {
      throw new Error('Invalid --months value. Must be a positive number.');
    }
    since.setMonth(since.getMonth() - months);
  } else {
    // Default to weeks (default 4)
    const weeks = options.weeks ? parseInt(options.weeks, 10) : 4;
    if (isNaN(weeks) || weeks < 1) {
      throw new Error('Invalid --weeks value. Must be a positive number.');
    }
    since.setDate(since.getDate() - weeks * 7);
  }

  return { since, until: now };
}

function groupByContributor(
  commits: GitHubCommit[],
  prs: GitHubPR[]
): ContributorStats[] {
  const statsMap = new Map<string, ContributorStats>();

  // Process commits
  for (const commit of commits) {
    const login = commit.author.login;
    if (!statsMap.has(login)) {
      statsMap.set(login, {
        login,
        name: commit.author.name,
        commitCount: 0,
        prCount: 0,
        files: [],
        recentMessages: [],
      });
    }

    const stats = statsMap.get(login)!;
    stats.commitCount++;

    // Add first line of commit message
    const firstLine = commit.message.split('\n')[0];
    if (stats.recentMessages.length < 10) {
      stats.recentMessages.push(firstLine);
    }

    // Add files if available
    if (commit.files) {
      for (const file of commit.files) {
        if (!stats.files.includes(file)) {
          stats.files.push(file);
        }
      }
    }
  }

  // Process PRs
  for (const pr of prs) {
    const login = pr.author;
    if (!statsMap.has(login)) {
      statsMap.set(login, {
        login,
        name: login,
        commitCount: 0,
        prCount: 0,
        files: [],
        recentMessages: [],
      });
    }

    const stats = statsMap.get(login)!;
    stats.prCount++;
  }

  // Sort by total activity (commits + PRs)
  return Array.from(statsMap.values()).sort(
    (a, b) => (b.commitCount + b.prCount) - (a.commitCount + a.prCount)
  );
}

export async function contributorsCommand(options: ContributorsOptions): Promise<void> {
  try {
    // Ensure we have the Anthropic key (will prompt if missing)
    await ensureAnthropicKey();

    // Detect repo from current directory
    const repoInfo = ensureGitHubRemote();

    // Calculate date range
    const dateRange = calculateDateRange(options);
    const dateRangeStr = fmt.formatDateRange(dateRange.since, dateRange.until);

    fmt.sectionHeader(`Contributors for ${repoInfo.owner}/${repoInfo.repo} (${dateRangeStr})`, '👥');

    // Fetch data with spinners
    const commitSpinner = fmt.spinner('Fetching commits...');
    const commits = await fetchCommits(repoInfo.owner, repoInfo.repo, dateRange);
    commitSpinner.succeed(`Fetched ${commits.length} commits`);

    const prSpinner = fmt.spinner('Fetching pull requests...');
    const prs = await fetchMergedPRs(repoInfo.owner, repoInfo.repo, dateRange);
    prSpinner.succeed(`Fetched ${prs.length} pull requests`);

    if (commits.length === 0 && prs.length === 0) {
      fmt.warning('No activity found in this time period.');
      return;
    }

    // Group by contributor
    const contributors = groupByContributor(commits, prs);

    if (contributors.length === 0) {
      fmt.warning('No contributors found in this time period.');
      return;
    }

    fmt.muted(`Found ${contributors.length} contributors`);

    // Build prompt and stream response
    fmt.newline();
    const contributorData = contributors.map((c) => ({
      login: c.login,
      commitCount: c.commitCount,
      prCount: c.prCount,
      files: c.files,
      recentMessages: c.recentMessages,
    }));

    const prompt = buildContributorPrompt(
      repoInfo.owner,
      repoInfo.repo,
      contributorData,
      dateRange.since,
      dateRange.until
    );

    await streamCompletion(prompt);

    // Footer
    fmt.printFooter(commits.length, prs.length);
  } catch (err) {
    fmt.newline();
    fmt.error(err instanceof Error ? err.message : 'Contributor analysis failed');
    process.exit(1);
  }
}
