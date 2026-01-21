import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicKey } from './config.js';
import type { GitHubCommit, GitHubPR } from '../types/index.js';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

let anthropicInstance: Anthropic | null = null;

function getAnthropic(): Anthropic {
  const apiKey = getAnthropicKey();
  if (!apiKey) {
    throw new Error('Anthropic API key not found.');
  }

  if (!anthropicInstance) {
    anthropicInstance = new Anthropic({ apiKey });
  }
  return anthropicInstance;
}

export async function streamCompletion(prompt: string): Promise<void> {
  const anthropic = getAnthropic();

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      process.stdout.write(event.delta.text);
    }
  }

  // Ensure newline at end
  console.log();
}

export function formatCommitsForContext(commits: GitHubCommit[]): string {
  if (commits.length === 0) {
    return 'No commits in this time period.';
  }

  return commits
    .map((c) => {
      const shortSha = c.sha.substring(0, 7);
      const firstLine = c.message.split('\n')[0];
      const files = c.files?.length ? ` [${c.files.length} files]` : '';
      return `- ${shortSha} (${c.author.login}): ${firstLine}${files}`;
    })
    .join('\n');
}

export function formatPRsForContext(prs: GitHubPR[]): string {
  if (prs.length === 0) {
    return 'No pull requests in this time period.';
  }

  return prs
    .map((pr) => {
      const labels = pr.labels.length > 0 ? ` [${pr.labels.join(', ')}]` : '';
      const body = pr.body ? `\n  ${pr.body.substring(0, 200)}${pr.body.length > 200 ? '...' : ''}` : '';
      return `- PR #${pr.number} (${pr.author}): ${pr.title}${labels}${body}`;
    })
    .join('\n');
}

export function buildSummaryPrompt(
  owner: string,
  repo: string,
  commits: GitHubCommit[],
  prs: GitHubPR[],
  startDate: Date,
  endDate: Date
): string {
  const formattedCommits = formatCommitsForContext(commits);
  const formattedPRs = formatPRsForContext(prs);

  return `You are analyzing git history for a software repository.

Repository: ${owner}/${repo}
Time period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}

## Commits (${commits.length})
${formattedCommits}

## Pull Requests (${prs.length})
${formattedPRs}

Generate a narrative summary of the repository activity. Include:
1. Major themes or efforts (group related work)
2. Key changes and their significance
3. Top contributors and their focus areas

Write in a conversational tone, not a bullet list. Be concise.`;
}

export function buildContributorPrompt(
  owner: string,
  repo: string,
  contributorData: Array<{
    login: string;
    commitCount: number;
    prCount: number;
    files: string[];
    recentMessages: string[];
  }>,
  startDate: Date,
  endDate: Date
): string {
  const contributorSections = contributorData
    .map((c) => {
      const filesPreview = c.files.slice(0, 10).join(', ') + (c.files.length > 10 ? '...' : '');
      const messages = c.recentMessages.slice(0, 5).map((m) => `  - ${m}`).join('\n');
      return `### ${c.login} (${c.commitCount} commits, ${c.prCount} PRs)
Files touched: ${filesPreview}
Recent commit messages:
${messages}`;
    })
    .join('\n\n');

  return `Analyze the contributors to this repository.

Repository: ${owner}/${repo}
Time period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}

## Contributors

${contributorSections}

For each contributor, summarize:
1. Their primary focus areas
2. Recent work themes
3. Which parts of the codebase they own

Be concise. Format as readable sections per contributor.`;
}

export function buildAskPrompt(
  owner: string,
  repo: string,
  commits: GitHubCommit[],
  prs: GitHubPR[],
  question: string
): string {
  const formattedCommits = formatCommitsForContext(commits);
  const formattedPRs = formatPRsForContext(prs);

  return `Answer a question about this repository based on its git history.

Repository: ${owner}/${repo}

## Git History

### Commits (${commits.length})
${formattedCommits}

### Pull Requests (${prs.length})
${formattedPRs}

## Question
${question}

Answer based only on the git history provided. If you cite specific PRs or commits, reference them (e.g., "PR #142" or "commit abc123").
If the answer cannot be determined from the history, say so.
Be concise and direct.`;
}

export function buildChangelogPrompt(
  owner: string,
  repo: string,
  fromRef: string,
  toRef: string,
  commits: GitHubCommit[],
  prs: GitHubPR[],
  format: 'pretty' | 'markdown'
): string {
  const formattedCommits = formatCommitsForContext(commits);
  const formattedPRs = formatPRsForContext(prs);

  const formatInstructions =
    format === 'markdown'
      ? 'Output in clean markdown format suitable for a CHANGELOG.md file.'
      : 'Output in a clean, readable format for terminal display.';

  return `Generate a changelog for the following changes.

Repository: ${owner}/${repo}
From: ${fromRef}
To: ${toRef}

## Changes

### Commits (${commits.length})
${formattedCommits}

### Pull Requests (${prs.length})
${formattedPRs}

Create a changelog grouped by:
- **Breaking Changes** - anything that breaks backward compatibility
- **Features** - new functionality
- **Fixes** - bug fixes
- **Internal** - refactoring, dependencies, CI/CD

Use imperative mood ("Add feature" not "Added feature").
Include PR numbers in parentheses.
Highlight breaking changes prominently.
${formatInstructions}`;
}
