import { z } from 'zod';

/* ── Shared enums ─────────────────────────────────────────────── */

export const iocTypeSchema = z.enum(['ip', 'domain', 'url', 'hash']);
export const iocCategorySchema = z.enum(['stealer', 'loader', 'phishing', 'network']);
export const severitySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export const confidenceSchema = z.enum(['high', 'medium', 'low']);
export const huntLanguageSchema = z.enum(['kql', 'spl', 'sigma', 'yara', 'powershell']);
export const difficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);
export const toolCategorySchema = z.enum([
  'web-security',
  'windows',
  'azure-kql',
  'phishing-analysis',
  'reverse-engineering',
  'hashing',
]);
export const resourceCategorySchema = z.enum([
  'analyst-tools',
  'c2-reference',
  'lolbins',
  'siem',
  'packet-analysis',
  'certifications',
  'reporting',
  'osint',
]);
export const reportStatusSchema = z.enum(['draft', 'in-review', 'final']);
export const submissionKindSchema = z.enum(['ioc', 'hunt', 'article', 'tool', 'resource']);
export const submissionStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export const findingStatusSchema = z.enum(['open', 'partial', 'remediated', 'risk-accepted']);

const tagsSchema = z.array(z.string().min(1).max(48)).max(32);

const dateField = z
  .string()
  .min(4)
  .max(40)
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date');

/* ── Auth ─────────────────────────────────────────────────────── */

export const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

/* ── IOCs ─────────────────────────────────────────────────────── */

export const iocBodySchema = z.object({
  type: iocTypeSchema,
  value: z.string().min(3).max(512),
  malwareFamily: z.string().min(1).max(120).default('Unknown'),
  category: iocCategorySchema,
  severity: severitySchema,
  confidence: confidenceSchema,
  firstSeen: dateField,
  lastSeen: dateField,
  tags: tagsSchema.default([]),
  source: z.string().max(240).default(''),
  description: z.string().max(2000).default(''),
});

export const iocUpdateSchema = iocBodySchema.partial();

export const iocListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  type: iocTypeSchema.optional(),
  category: iocCategorySchema.optional(),
  severity: severitySchema.optional(),
  confidence: confidenceSchema.optional(),
  family: z.string().max(120).optional(),
  tag: z.string().max(48).optional(),
  source: z.string().max(240).optional(),
  sort: z
    .enum(['value', 'malware_family', 'severity', 'confidence', 'first_seen', 'last_seen', 'type', 'category', 'created_at'])
    .default('last_seen'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

export const iocImportSchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  data: z.string().min(1),
  skipDuplicates: z.boolean().default(true),
});

export const bulkIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

/* ── Hunts ────────────────────────────────────────────────────── */

export const huntBodySchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).default(''),
  query: z.string().min(3).max(20000),
  language: huntLanguageSchema,
  difficulty: difficultySchema.default('intermediate'),
  tactics: z.array(z.string().min(2).max(80)).max(16).default([]),
  techniques: z.array(z.string().regex(/^T\d{4}(\.\d{3})?$/)).max(32).default([]),
  tags: tagsSchema.default([]),
  author: z.string().max(80).default('PKC'),
});

export const huntUpdateSchema = huntBodySchema.partial();

export const huntListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  language: huntLanguageSchema.optional(),
  difficulty: difficultySchema.optional(),
  tactic: z.string().max(80).optional(),
  tag: z.string().max(48).optional(),
  sort: z.enum(['title', 'created_at', 'updated_at', 'difficulty']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

/* ── Articles ─────────────────────────────────────────────────── */

export const articleBodySchema = z.object({
  title: z.string().min(3).max(200),
  slug: z
    .string()
    .min(3)
    .max(160)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case')
    .optional(),
  excerpt: z.string().max(400).default(''),
  content: z.string().min(10).max(60000),
  category: z.string().max(60).default('research'),
  tags: tagsSchema.default([]),
  author: z.string().max(80).default('PKC'),
  readTime: z.coerce.number().int().min(1).max(120).optional(),
  publishedAt: dateField.optional(),
});

export const articleUpdateSchema = articleBodySchema.partial();

export const articleListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().max(60).optional(),
  tag: z.string().max(48).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

/* ── Tools ────────────────────────────────────────────────────── */

export const toolBodySchema = z.object({
  name: z.string().min(2).max(140),
  description: z.string().max(1000).default(''),
  category: toolCategorySchema,
  language: z.string().max(40).default('python'),
  scriptPath: z.string().max(240).default(''),
  usage: z.string().max(6000).default(''),
  tags: tagsSchema.default([]),
  stars: z.coerce.number().int().min(0).max(100000).default(0),
});

export const toolUpdateSchema = toolBodySchema.partial();

export const toolListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  category: toolCategorySchema.optional(),
  language: z.string().max(40).optional(),
  sort: z.enum(['name', 'stars', 'category', 'created_at']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

/* ── Resources ────────────────────────────────────────────────── */

export const resourceBodySchema = z.object({
  name: z.string().min(2).max(140),
  description: z.string().max(800).default(''),
  category: resourceCategorySchema,
  url: z.string().max(400).default(''),
  tags: tagsSchema.default([]),
});

export const resourceUpdateSchema = resourceBodySchema.partial();

export const resourceListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  category: resourceCategorySchema.optional(),
  tag: z.string().max(48).optional(),
});

/* ── Reports ──────────────────────────────────────────────────── */

export const findingSchema = z.object({
  id: z.string().max(64).optional(),
  title: z.string().min(3).max(220),
  severity: severitySchema,
  cvss: z.coerce.number().min(0).max(10).default(0),
  vector: z.string().max(200).default(''),
  cwe: z.string().max(40).default(''),
  status: findingStatusSchema.default('open'),
  affected: z.string().max(300).default(''),
  description: z.string().max(6000).default(''),
  evidence: z.string().max(8000).default(''),
  remediation: z.string().max(6000).default(''),
  references: z.array(z.string().max(400)).max(16).default([]),
});

export const reportBodySchema = z.object({
  title: z.string().min(3).max(220),
  client: z.string().max(200).default(''),
  scope: z.string().max(4000).default(''),
  executiveSummary: z.string().max(8000).default(''),
  methodology: z.string().max(8000).default(''),
  status: reportStatusSchema.default('draft'),
  findings: z.array(findingSchema).max(200).default([]),
});

export const reportUpdateSchema = reportBodySchema.partial();

export const reportListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  status: reportStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

/* ── Community submissions ────────────────────────────────────── */

export const submissionBodySchema = z.object({
  kind: submissionKindSchema,
  title: z.string().min(3).max(200),
  body: z.string().max(8000).default(''),
  payload: z.record(z.unknown()).default({}),
});

export const reviewSchema = z.object({
  note: z.string().max(2000).optional(),
});

export const submissionListQuerySchema = z.object({
  status: submissionStatusSchema.optional(),
  kind: submissionKindSchema.optional(),
  mine: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

/* ── Misc ─────────────────────────────────────────────────────── */

export const globalSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(25).default(6),
});

export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({ id: z.string().min(1).max(64) });
