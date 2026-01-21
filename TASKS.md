# TASKS.md

Work through these tasks in order. Check off each task as you complete it. Commit after each task.

## Phase 1: Project Setup

- [x] **1.1 Initialize project**
  - Create package.json with name "git-sense", type "module"
  - Add dependencies: commander, @octokit/rest, @anthropic-ai/sdk, chalk, ora, conf
  - Add dev dependencies: typescript, tsup, tsx, @types/node
  - Create tsconfig.json with strict mode, ES2022 target, NodeNext module
  - Create tsup.config.ts for CLI bundling

- [x] **1.2 Create project structure**
  - Create folder structure: src/, src/commands/, src/lib/, src/types/
  - Create src/index.ts with basic Commander setup and placeholder commands
  - Add bin field to package.json pointing to dist/index.js
  - Verify `npm run build` works

## Phase 2: Core Infrastructure

- [x] **2.1 Config module** (`src/lib/config.ts`)
  - Use `conf` package to store/retrieve tokens
  - Functions: getGitHubToken, setGitHubToken, getAnthropicKey, setAnthropicKey
  - Support reading ANTHROPIC_API_KEY from environment variable as fallback
  - Add a function to check if authenticated
  - Add ensureAnthropicKey() that prompts interactively if key is missing

- [x] **2.2 Git utilities** (`src/lib/git.ts`)
  - Function to detect if current directory is a git repo
  - Function to parse GitHub remote URL (handle both HTTPS and SSH formats)
  - Extract owner and repo name from remote
  - Get current branch name

- [x] **2.3 GitHub client** (`src/lib/github.ts`)
  - Initialize Octokit with stored token
  - Function to fetch commits (with date range filtering, pagination)
  - Function to fetch merged PRs (with date range filtering, pagination)
  - Function to get authenticated user info
  - Handle rate limiting gracefully

- [x] **2.4 AI module** (`src/lib/ai.ts`)
  - Initialize Anthropic client
  - Function to stream a completion to stdout
  - Helper to format git data into context for prompts
  - Use claude-sonnet-4-20250514 model

- [x] **2.5 Format utilities** (`src/lib/format.ts`)
  - Helper functions for consistent terminal output
  - Success, error, info, warning message formatters
  - Section headers
  - Progress indicators

## Phase 3: Auth & Config Commands

- [x] **3.1 Implement OAuth device flow** (`src/commands/auth.ts`)
  - Start device authorization request to GitHub
  - Display URL and user code to terminal
  - Poll for token with appropriate interval
  - Store token using config module
  - Display success with authenticated username
  - Handle errors (expired code, denied access, etc.)

- [x] **3.2 Add auth command to CLI**
  - Register command in src/index.ts
  - Test full flow with real GitHub account

- [x] **3.3 Implement config command** (`src/commands/config.ts`)
  - `git-sense config --anthropic-key <key>` - Store Anthropic API key
  - `git-sense config --show` - Show current config (mask sensitive values)
  - `git-sense config --clear` - Clear all stored config
  - Register command in src/index.ts

- [x] **3.4 Implement interactive API key prompt**
  - Create promptForAnthropicKey() helper using Node's readline
  - Shows link to https://console.anthropic.com/api-keys
  - Validates key format (starts with sk-ant-)
  - Saves key after entry
  - Call this from ensureAnthropicKey() when key is missing

## Phase 4: Summary Command

- [ ] **4.1 Implement summary command** (`src/commands/summary.ts`)
  - Accept flags: --weeks, --months, --all
  - Detect repo from current directory
  - Fetch commits and PRs for time period
  - Show loading spinner during fetch

- [ ] **4.2 Add AI summarization**
  - Create prompt that asks for narrative summary
  - Include guidance: identify themes, group related work, mention contributors
  - Stream response to terminal
  - Format output nicely

- [ ] **4.3 Register and test**
  - Add command to CLI
  - Test with different time ranges
  - Test with various repos

## Phase 5: Contributors Command

- [ ] **5.1 Implement contributors command** (`src/commands/contributors.ts`)
  - Accept flags: --weeks, --months (default 4 weeks)
  - Fetch commits and PRs
  - Group by author
  - Calculate stats per contributor

- [ ] **5.2 Add AI analysis**
  - Create prompt asking for contributor focus areas
  - Include file paths in context
  - Stream response
  - Format output with contributor sections

- [ ] **5.3 Register and test**
  - Add command to CLI
  - Test output formatting

## Phase 6: Ask Command

- [ ] **6.1 Implement ask command** (`src/commands/ask.ts`)
  - Accept question as argument
  - Fetch broader history (more data than summary)
  - May need to paginate through more commits/PRs

- [ ] **6.2 Add AI Q&A**
  - Create prompt with repo context and question
  - Instruct to cite PRs/commits
  - Instruct to say "not found" if answer isn't in history
  - Stream response

- [ ] **6.3 Register and test**
  - Add command to CLI
  - Test various question types
  - Verify citations work

## Phase 7: Changelog Command

- [ ] **7.1 Implement changelog command** (`src/commands/changelog.ts`)
  - Accept --from and --to refs (required and optional)
  - Use GitHub compare API or commit listing between refs
  - Fetch associated PRs

- [ ] **7.2 Add AI changelog generation**
  - Create prompt for changelog format
  - Group by: Breaking Changes, Features, Fixes, Internal
  - Use imperative mood
  - Include PR numbers

- [ ] **7.3 Add format flag**
  - Support --format: pretty (default), markdown
  - Markdown format for copy/paste into CHANGELOG.md

- [ ] **7.4 Register and test**
  - Add command to CLI
  - Test between tags
  - Test markdown output

## Phase 8: Polish

- [ ] **8.1 Error handling**
  - Not in git repo → clear message
  - No GitHub remote → clear message  
  - Not authenticated → prompt to run auth
  - Rate limiting → show limits, suggest waiting
  - Network errors → helpful messages

- [ ] **8.2 Help text**
  - Add descriptions to all commands
  - Add examples in help text
  - Add --help for each command

- [ ] **8.3 Create README.md**
  - Project description
  - Installation instructions
  - Quick start guide
  - All commands with examples
  - Configuration section
  - Requirements

## Phase 9: Final Testing

- [ ] **9.1 End-to-end testing**
  - Fresh install via npm link
  - Run through all commands
  - Test on multiple repos
  - Verify error messages

- [ ] **9.2 Code cleanup**
  - Remove any debug logs
  - Check for TODO comments
  - Ensure consistent formatting
