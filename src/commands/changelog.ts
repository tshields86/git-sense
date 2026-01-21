import { ensureGitHubRemote } from '../lib/git.js';
import { fetchCommitsBetweenRefs, fetchMergedPRs } from '../lib/github.js';
import { ensureAnthropicKey } from '../lib/config.js';
import { streamCompletion, buildChangelogPrompt } from '../lib/ai.js';
import * as fmt from '../lib/format.js';
import type { GitHubPR } from '../types/index.js';

interface ChangelogOptions {
  from: string;
  to: string;
  format: 'pretty' | 'markdown';
}

export async function changelogCommand(options: ChangelogOptions): Promise<void> {
  try {
    // Ensure we have the Anthropic key (will prompt if missing)
    await ensureAnthropicKey();

    // Detect repo from current directory
    const repoInfo = ensureGitHubRemote();

    const fromRef = options.from;
    const toRef = options.to || 'HEAD';

    fmt.sectionHeader(`Changelog for ${repoInfo.owner}/${repoInfo.repo}`, '📝');
    fmt.muted(`From: ${fromRef} → To: ${toRef}`);
    fmt.newline();

    // Fetch commits between refs
    const commitSpinner = fmt.spinner('Fetching commits...');
    let commits;
    try {
      commits = await fetchCommitsBetweenRefs(
        repoInfo.owner,
        repoInfo.repo,
        fromRef,
        toRef
      );
    } catch (err) {
      commitSpinner.fail('Failed to fetch commits');
      if (err instanceof Error && err.message.includes('404')) {
        throw new Error(`Reference '${fromRef}' or '${toRef}' not found in repository.`);
      }
      throw err;
    }
    commitSpinner.succeed(`Fetched ${commits.length} commits`);

    if (commits.length === 0) {
      fmt.warning('No commits found between these references.');
      return;
    }

    // Try to match commits to PRs
    // We'll fetch recent PRs and match by commit SHAs
    const prSpinner = fmt.spinner('Fetching related pull requests...');
    const recentPRs = await fetchMergedPRs(repoInfo.owner, repoInfo.repo, undefined, 500);

    // For now, just use PRs from the same time period
    // A more sophisticated approach would match by commit SHA
    const commitShas = new Set(commits.map(c => c.sha));
    const relatedPRs: GitHubPR[] = [];

    // Simple heuristic: include PRs merged within the commit date range
    if (commits.length > 0) {
      const oldestCommitDate = new Date(commits[commits.length - 1].date);
      const newestCommitDate = new Date(commits[0].date);

      for (const pr of recentPRs) {
        const mergedAt = new Date(pr.mergedAt);
        if (mergedAt >= oldestCommitDate && mergedAt <= newestCommitDate) {
          relatedPRs.push(pr);
        }
      }
    }

    prSpinner.succeed(`Found ${relatedPRs.length} related pull requests`);

    // Build prompt and stream response
    fmt.newline();
    const prompt = buildChangelogPrompt(
      repoInfo.owner,
      repoInfo.repo,
      fromRef,
      toRef,
      commits,
      relatedPRs,
      options.format
    );

    await streamCompletion(prompt);

    // Footer
    fmt.printFooter(commits.length, relatedPRs.length);
  } catch (err) {
    fmt.newline();
    fmt.error(err instanceof Error ? err.message : 'Changelog generation failed');
    process.exit(1);
  }
}
