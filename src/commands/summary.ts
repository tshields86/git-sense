import { ensureGitHubRemote } from '../lib/git.js';
import { fetchCommits, fetchMergedPRs } from '../lib/github.js';
import { ensureAnthropicKey } from '../lib/config.js';
import { streamCompletion, buildSummaryPrompt } from '../lib/ai.js';
import * as fmt from '../lib/format.js';
import type { DateRange } from '../types/index.js';

interface SummaryOptions {
  weeks?: string;
  months?: string;
  all?: boolean;
}

function calculateDateRange(options: SummaryOptions): DateRange | undefined {
  if (options.all) {
    return undefined; // No date filtering
  }

  const now = new Date();
  const since = new Date();

  if (options.months) {
    const months = parseInt(options.months, 10);
    if (isNaN(months) || months < 1) {
      throw new Error('Invalid --months value. Must be a positive number.');
    }
    since.setMonth(since.getMonth() - months);
  } else {
    // Default to weeks (default 2)
    const weeks = options.weeks ? parseInt(options.weeks, 10) : 2;
    if (isNaN(weeks) || weeks < 1) {
      throw new Error('Invalid --weeks value. Must be a positive number.');
    }
    since.setDate(since.getDate() - weeks * 7);
  }

  return { since, until: now };
}

export async function summaryCommand(options: SummaryOptions): Promise<void> {
  try {
    // Ensure we have the Anthropic key (will prompt if missing)
    await ensureAnthropicKey();

    // Detect repo from current directory
    const repoInfo = ensureGitHubRemote();

    // Calculate date range
    const dateRange = calculateDateRange(options);

    // Format date range for display
    const dateRangeStr = dateRange
      ? fmt.formatDateRange(dateRange.since, dateRange.until)
      : 'all time';

    fmt.sectionHeader(`Summary for ${repoInfo.owner}/${repoInfo.repo} (${dateRangeStr})`, '📊');

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

    // Build prompt and stream response
    fmt.newline();
    const prompt = buildSummaryPrompt(
      repoInfo.owner,
      repoInfo.repo,
      commits,
      prs,
      dateRange?.since ?? new Date(0),
      dateRange?.until ?? new Date()
    );

    await streamCompletion(prompt);

    // Footer
    fmt.printFooter(commits.length, prs.length);
  } catch (err) {
    fmt.newline();
    fmt.error(err instanceof Error ? err.message : 'Summary generation failed');
    process.exit(1);
  }
}
