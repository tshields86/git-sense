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
