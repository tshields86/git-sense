# TECHNICAL_SPEC.md

## Tech Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| Language | TypeScript | Type safety, better DX |
| Runtime | Node.js 18+ | Native fetch, stable LTS |
| CLI Framework | Commander.js | Industry standard, simple |
| GitHub API | @octokit/rest | Official SDK |
| AI | @anthropic-ai/sdk | Official SDK, streaming support |
| Terminal Colors | chalk | Simple, widely used |
| Spinners | ora | Clean loading indicators |
| Config Storage | conf | Cross-platform, secure storage |
| Bundler | tsup | Fast, zero-config for CLIs |

## Project Structure

```
git-sense/
├── CLAUDE.md                 # Instructions for Claude Code
├── TASKS.md                  # Task checklist
├── TECHNICAL_SPEC.md         # This file
├── README.md                 # User documentation
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── src/
    ├── index.ts              # CLI entry point
    ├── commands/
    │   ├── auth.ts           # GitHub OAuth
    │   ├── summary.ts        # Activity summaries
    │   ├── ask.ts            # Q&A about repo
    │   ├── contributors.ts   # Contributor analysis
    │   └── changelog.ts      # Changelog generation
    ├── lib/
    │   ├── config.ts         # Token storage
    │   ├── git.ts            # Local git operations
    │   ├── github.ts         # GitHub API client
    │   ├── ai.ts             # Claude integration
    │   └── format.ts         # Terminal formatting
    └── types/
        └── index.ts          # Shared TypeScript types
```

## Commands Specification

### `git-sense auth`

Authenticates with GitHub using OAuth Device Flow.

**GitHub Device Flow Steps:**
1. POST to `https://github.com/login/device/code` with client_id and scope
2. Response contains: device_code, user_code, verification_uri, interval
3. Display verification_uri and user_code to user
4. Poll POST to `https://github.com/login/oauth/access_token` with device_code
5. Continue polling at interval until access_token received or error

**Required scope:** `repo` (access private repositories)

**Output:**
```
→ Open this URL in your browser: https://github.com/login/device
→ Enter code: ABCD-1234

Waiting for authorization... ✓
Authenticated as username
Token saved. You're ready to use git-sense!
```

---

### `git-sense config`

Manage configuration settings.

**Options:**
| Flag | Description |
|------|-------------|
| `--anthropic-key <key>` | Store Anthropic API key |
| `--show` | Display current configuration (masked) |
| `--clear` | Clear all stored configuration |

**Output examples:**

```bash
$ git-sense config --anthropic-key sk-ant-xxxxx
✓ Anthropic API key saved.

$ git-sense config --show
Configuration:
  GitHub: authenticated as @travismclarke
  Anthropic: sk-ant-****xxxx (configured)

$ git-sense config --clear
✓ Configuration cleared.
```

**Interactive prompt (when API key missing):**

When a user runs any AI-powered command without an Anthropic key configured:

```
$ git-sense summary

Anthropic API key not found.

→ Get your API key at: https://console.anthropic.com/api-keys
→ Enter your API key: sk-ant-xxxxx

✓ API key saved.

Fetching commits...
```

**Implementation notes:**
- Use Node's built-in `readline` for interactive prompt
- Validate key format: must start with `sk-ant-`
- Mask input while typing if possible (or warn it will be visible)
- Store in same config as GitHub token via `conf` package

---

### `git-sense summary`

Generates AI summary of repository activity.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--weeks <n>` | Last n weeks | 2 |
| `--months <n>` | Last n months | - |
| `--all` | Entire history | false |

**Data Fetched:**
- Commits: sha, message, author (name, login), date, files (if available)
- PRs: number, title, body, author, merged_at, labels, commits

**AI Prompt Structure:**
```
You are analyzing git history for a software repository.

Repository: {owner}/{repo}
Time period: {startDate} to {endDate}

## Commits ({count})
{formatted commits}

## Pull Requests ({count})
{formatted PRs}

Generate a narrative summary of the repository activity. Include:
1. Major themes or efforts (group related work)
2. Key changes and their significance
3. Top contributors and their focus areas

Write in a conversational tone, not a bullet list. Be concise.
```

**Output Format:**
```
📊 Summary for owner/repo (Dec 12 - Dec 26)

{streamed AI response}

---
Based on {x} commits and {y} pull requests
```

---

### `git-sense contributors`

Analyzes contributor activity and focus areas.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--weeks <n>` | Last n weeks | 4 |
| `--months <n>` | Last n months | - |

**Data Processing:**
1. Fetch commits and PRs for time period
2. Group by author login
3. For each author, collect:
   - Commit count
   - PR count
   - Files/directories touched
   - Commit messages (for AI context)

**AI Prompt Structure:**
```
Analyze the contributors to this repository.

Repository: {owner}/{repo}
Time period: {startDate} to {endDate}

## Contributors

### {author} ({commitCount} commits, {prCount} PRs)
Files touched: {file list}
Recent commit messages:
{messages}

[repeat for each contributor]

For each contributor, summarize:
1. Their primary focus areas
2. Recent work themes
3. Which parts of the codebase they own

Be concise. Format as readable sections per contributor.
```

---

### `git-sense ask "<question>"`

Natural language Q&A about repository history.

**Argument:** Question string (required)

**Data Fetching:**
- Fetch more history than summary (e.g., 6 months or 500 commits)
- Include full PR bodies for context
- May need pagination for large repos

**AI Prompt Structure:**
```
Answer a question about this repository based on its git history.

Repository: {owner}/{repo}

## Git History
{commits and PRs}

## Question
{user question}

Answer based only on the git history provided. If you cite specific PRs 
or commits, reference them (e.g., "PR #142" or "commit abc123").
If the answer cannot be determined from the history, say so.
Be concise and direct.
```

**Example Questions:**
- "When did we add Stripe integration?"
- "Who knows the authentication code best?"
- "What changed in the last release?"
- "Why did we remove Redux?"

---

### `git-sense changelog --from <ref> --to <ref>`

Generates changelog between two git references.

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--from <ref>` | Starting reference | required |
| `--to <ref>` | Ending reference | HEAD |
| `--format <type>` | Output format | pretty |

**Formats:** `pretty`, `markdown`

**Data Fetching:**
- Use GitHub Compare API: `GET /repos/{owner}/{repo}/compare/{base}...{head}`
- Or list commits between refs
- Match commits to PRs by SHA

**AI Prompt Structure:**
```
Generate a changelog for the following changes.

Repository: {owner}/{repo}
From: {fromRef}
To: {toRef}

## Changes
{commits and PRs}

Create a changelog grouped by:
- **Breaking Changes** - anything that breaks backward compatibility
- **Features** - new functionality
- **Fixes** - bug fixes
- **Internal** - refactoring, dependencies, CI/CD

Use imperative mood ("Add feature" not "Added feature").
Include PR numbers in parentheses.
Highlight breaking changes prominently.
```

**Markdown Output:**
```markdown
# Changelog: v1.2.0 → v1.3.0

## Breaking Changes
- Change auth token format to JWT (#142)

## Features
- Add Apple Pay support (#148)

## Fixes
- Fix checkout race condition (#139)
```

---

## Type Definitions

```typescript
// src/types/index.ts

export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    login: string;
    name: string;
  };
  date: string;
  files?: string[];
}

export interface GitHubPR {
  number: number;
  title: string;
  body: string;
  author: string;
  mergedAt: string;
  labels: string[];
}

export interface RepoInfo {
  owner: string;
  repo: string;
  defaultBranch: string;
}

export interface ContributorStats {
  login: string;
  name: string;
  commitCount: number;
  prCount: number;
  files: string[];
  recentMessages: string[];
}

export interface DateRange {
  since: Date;
  until: Date;
}
```

---

## Configuration

**Storage location:** OS-specific via `conf` package
- macOS: `~/Library/Preferences/git-sense-nodejs/config.json`
- Linux: `~/.config/git-sense-nodejs/config.json`
- Windows: `%APPDATA%/git-sense-nodejs/config.json`

**Stored values:**
```json
{
  "githubToken": "gho_xxxxxxxxxxxx",
  "anthropicKey": "sk-ant-xxxxx"
}
```

**API Key Resolution Order (Anthropic):**
1. `ANTHROPIC_API_KEY` environment variable (highest priority)
2. Stored key via `git-sense config --anthropic-key`
3. If neither found → interactive prompt asks user to enter key

**API Key Resolution Order (GitHub):**
1. `GITHUB_TOKEN` environment variable (highest priority)  
2. Stored token via `git-sense auth`
3. If neither found → error prompting user to run `git-sense auth`

**Environment variables:**
- `ANTHROPIC_API_KEY` - Anthropic API key (takes precedence over stored)
- `GITHUB_TOKEN` - GitHub token (takes precedence over stored, skips OAuth)

---

## Error Messages

| Scenario | Message |
|----------|---------|
| Not a git repo | `Error: Not in a git repository. Run this from inside a git project.` |
| No GitHub remote | `Error: No GitHub remote found. This tool works with GitHub repositories.` |
| Not authenticated | `Error: Not authenticated with GitHub. Run 'git-sense auth' first.` |
| Rate limited | `GitHub API rate limit reached. Resets at {time}. Try again later.` |
| No Anthropic key | Triggers interactive prompt (see `git-sense config` section above) |
| Invalid Anthropic key | `Error: Invalid API key format. Key should start with 'sk-ant-'.` |
| Anthropic API error | `Error: Anthropic API error - {message}` |
| Ref not found | `Error: Reference '{ref}' not found in repository.` |

---

## GitHub OAuth App Setup

The user must register a GitHub OAuth App:

1. Go to https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in:
   - Application name: `git-sense` (or anything)
   - Homepage URL: `https://github.com/yourusername/git-sense`
   - Authorization callback URL: `http://localhost` (not used for device flow)
4. Copy the Client ID

**In code, use placeholder:**
```typescript
const GITHUB_CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID';
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsup",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "bin": {
    "git-sense": "./dist/index.js"
  }
}
```

---

## tsup.config.ts

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  shims: true,
  banner: {
    js: '#!/usr/bin/env node'
  }
});
```

---

## Terminal Output Guidelines

**Colors (via chalk):**
- Info/headers: `chalk.blue`
- Success: `chalk.green`
- Errors: `chalk.red`
- Warnings: `chalk.yellow`
- Muted/secondary: `chalk.gray`

**Spinners (via ora):**
- Use during API calls
- Clear message about what's happening
- Stop with success/fail state

**Streaming AI output:**
- Stream tokens directly to stdout
- No spinner during streaming (would interfere)
- Add newline padding before/after

**Example formatting:**
```typescript
import chalk from 'chalk';
import ora from 'ora';

// Starting a task
const spinner = ora('Fetching commits...').start();

// Success
spinner.succeed('Fetched 142 commits');

// Section header
console.log(chalk.blue('\n📊 Summary\n'));

// Error
console.log(chalk.red('Error:'), 'Not authenticated');
```
