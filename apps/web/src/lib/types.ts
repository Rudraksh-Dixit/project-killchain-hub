export type Role = 'admin' | 'contributor' | 'viewer';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Confidence = 'high' | 'medium' | 'low';
export type IocType = 'ip' | 'domain' | 'url' | 'hash';
export type IocCategory = 'stealer' | 'loader' | 'phishing' | 'network';

export interface User {
  id: string;
  username: string;
  role: Role;
  displayName: string;
}

export interface Ioc {
  id: string;
  type: IocType;
  value: string;
  malwareFamily: string;
  category: IocCategory;
  severity: Severity;
  confidence: Confidence;
  firstSeen: string;
  lastSeen: string;
  tags: string[];
  source: string;
  description: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Facet {
  count: number;
}

export interface IocFacets {
  families: { family: string; count: number }[];
  severities: { severity: string; count: number }[];
  categories: { category: string; count: number }[];
  types: { type: string; count: number }[];
  tags: { tag: string; count: number }[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IocListResponse extends Paginated<Ioc> {
  facets: IocFacets;
}

export interface Hunt {
  id: string;
  title: string;
  description: string;
  query: string;
  language: 'kql' | 'spl' | 'sigma' | 'yara' | 'powershell';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tactics: string[];
  techniques: string[];
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface HuntListResponse extends Paginated<Hunt> {
  facets: {
    languages: { language: string; count: number }[];
    tactics: { tactic: string; count: number }[];
  };
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  author: string;
  readTime: number;
  publishedAt: string;
  createdAt: string;
  content?: string;
}

export interface ArticleListResponse extends Paginated<Article> {
  facets: {
    categories: { category: string; count: number }[];
    tags: { tag: string; count: number }[];
  };
}

export type ToolCategory =
  | 'web-security'
  | 'windows'
  | 'azure-kql'
  | 'phishing-analysis'
  | 'reverse-engineering'
  | 'hashing';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  language: string;
  scriptPath: string;
  usage: string;
  tags: string[];
  stars: number;
  createdAt: string;
}

export interface ToolListResponse extends Paginated<Tool> {
  facets: {
    categories: { category: string; count: number }[];
  };
}

export type ResourceCategory =
  | 'analyst-tools'
  | 'c2-reference'
  | 'lolbins'
  | 'siem'
  | 'packet-analysis'
  | 'certifications'
  | 'reporting'
  | 'osint';

export interface Resource {
  id: string;
  name: string;
  description: string;
  category: ResourceCategory;
  url: string;
  tags: string[];
  createdAt: string;
}

export interface ResourceListResponse {
  items: Resource[];
  total: number;
  facets: {
    categories: { category: string; count: number }[];
  };
}

export interface Finding {
  id?: string;
  title: string;
  severity: Severity;
  cvss: number;
  vector?: string;
  cwe?: string;
  status: 'open' | 'partial' | 'remediated' | 'risk-accepted';
  affected?: string;
  description?: string;
  evidence?: string;
  remediation?: string;
  references: string[];
}

export interface ReportStats {
  counts: Record<Severity, number>;
  total: number;
  averageCvss: number;
  open: number;
}

export interface Report {
  id: string;
  title: string;
  client: string;
  scope: string;
  executiveSummary: string;
  methodology: string;
  status: 'draft' | 'in-review' | 'final';
  findings?: Finding[];
  stats: ReportStats;
  createdAt: string;
  updatedAt: string;
}

export type SubmissionKind = 'ioc' | 'hunt' | 'article' | 'tool' | 'resource';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Submission {
  id: string;
  kind: SubmissionKind;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  submitter: string;
  status: SubmissionStatus;
  reviewer: string | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface SubmissionListResponse extends Paginated<Submission> {
  facets: { statuses: { status: string; count: number }[] };
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  subjectType: string;
  subjectId: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardStats {
  totals: {
    iocs: number;
    hunts: number;
    articles: number;
    tools: number;
    resources: number;
    reports: number;
    pendingSubmissions: number;
    openFindings: number;
  };
  iocsByFamily: { family: string; count: number }[];
  iocsOverTime: { month: string; count: number }[];
  topTags: { tag: string; count: number }[];
  severityBreakdown: { severity: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  typeBreakdown: { type: string; count: number }[];
  confidenceBreakdown: { confidence: string; count: number }[];
  findingBreakdown: Record<Severity, number>;
  recentActivity: ActivityItem[];
}

export interface SearchResults {
  query: string;
  total: number;
  results: Record<string, { id: string; title: string; subtitle: string }[]>;
}

export interface ImportResult {
  imported: number;
  skipped: { value: string; reason: string }[];
  invalid: { index: number; reason: string }[];
}
