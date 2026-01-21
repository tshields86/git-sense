import { ensureGitHubRemote } from '../lib/git.js';
import { fetchCommits, fetchMergedPRs } from '../lib/github.js';
import { ensureAnthropicKey } from '../lib/config.js';
import { streamCompletion, buildAskPrompt } from '../lib/ai.js';
import * as fmt from '../lib/format.js';

// Fetch more history for Q&A (6 months)
const DEFAULT_MONTHS = 6;
const MAX_COMMITS = 500;
const MAX_PRS = 200;

export async function askCommand(question: string): Promise<void> {
  try {
    // Ensure we have the Anthropic key (will prompt if missing)
    await ensureAnthropicKey();

    // Detect repo from current directory
    const repoInfo = ensureGitHubRemote();

    // Calculate date range (6 months back)
    const now = new Date();
    const since = new Date();
    since.setMonth(since.getMonth() - DEFAULT_MONTHS);
    const dateRange = { since, until: now };

    fmt.sectionHeader(`Question about ${repoInfo.owner}/${repoInfo.repo}`, '❓');
    fmt.muted(`"${question}"`);
    fmt.newline();

    // Fetch broader history
    const commitSpinner = fmt.spinner('Fetching commit history...');
    const commits = await fetchCommits(
      repoInfo.owner,
      repoInfo.repo,
      dateRange,
      MAX_COMMITS
    );
    commitSpinner.succeed(`Fetched ${commits.length} commits`);

    const prSpinner = fmt.spinner('Fetching pull requests...');
    const prs = await fetchMergedPRs(
      repoInfo.owner,
      repoInfo.repo,
      dateRange,
      MAX_PRS
    );
    prSpinner.succeed(`Fetched ${prs.length} pull requests`);

    if (commits.length === 0 && prs.length === 0) {
      fmt.warning('No history found to search.');
      return;
    }

    // Build prompt and stream response
    fmt.newline();
    const prompt = buildAskPrompt(
      repoInfo.owner,
      repoInfo.repo,
      commits,
      prs,
      question
    );

    await streamCompletion(prompt);

    // Footer
    fmt.printFooter(commits.length, prs.length);
  } catch (err) {
    fmt.newline();
    fmt.error(err instanceof Error ? err.message : 'Question failed');
    process.exit(1);
  }
}
