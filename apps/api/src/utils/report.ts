import { parseJsonObject } from './serialize';

export interface ReportFinding {
  id?: string;
  title: string;
  severity: string;
  cvss: number;
  vector?: string;
  cwe?: string;
  status?: string;
  affected?: string;
  description?: string;
  evidence?: string;
  remediation?: string;
  references?: string[];
}

export interface ReportRecord {
  id: string;
  title: string;
  client: string;
  scope: string;
  executive_summary: string;
  methodology: string;
  findings: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function severityFromCvss(score: number): string {
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  if (score > 0) return 'low';
  return 'info';
}

export function parseFindings(raw: string): ReportFinding[] {
  return parseJsonObject<ReportFinding[]>(raw, []);
}

export function findingStats(findings: ReportFinding[]) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let cvssTotal = 0;
  let scored = 0;
  for (const finding of findings) {
    const key = finding.severity as keyof typeof counts;
    if (key in counts) counts[key] += 1;
    if (typeof finding.cvss === 'number' && finding.cvss > 0) {
      cvssTotal += finding.cvss;
      scored += 1;
    }
  }
  return {
    counts,
    total: findings.length,
    averageCvss: scored > 0 ? Math.round((cvssTotal / scored) * 10) / 10 : 0,
    open: findings.filter((f) => (f.status ?? 'open') === 'open').length,
  };
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

export function renderReportMarkdown(report: ReportRecord): string {
  const findings = parseFindings(report.findings);
  const stats = findingStats(findings);
  const generated = new Date().toISOString().slice(0, 10);

  const lines: string[] = [];
  lines.push(`# ${report.title}`);
  lines.push('');
  lines.push(`**Client:** ${report.client || 'Not specified'}  `);
  lines.push(`**Status:** ${report.status}  `);
  lines.push(`**Generated:** ${generated}  `);
  lines.push(`**Findings:** ${stats.total} (${stats.counts.critical} critical, ${stats.counts.high} high, ${stats.counts.medium} medium, ${stats.counts.low} low)`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push('## 1. Executive Summary');
  lines.push('');
  lines.push(report.executive_summary || '_No executive summary provided._');
  lines.push('');

  lines.push('## 2. Scope');
  lines.push('');
  lines.push(report.scope || '_No scope provided._');
  lines.push('');

  lines.push('## 3. Methodology');
  lines.push('');
  lines.push(report.methodology || '_No methodology provided._');
  lines.push('');

  lines.push('## 4. Findings Summary');
  lines.push('');
  if (findings.length === 0) {
    lines.push('_No findings recorded._');
  } else {
    lines.push('| # | Finding | Severity | CVSS | Status |');
    lines.push('|---|---------|----------|------|--------|');
    findings.forEach((finding, index) => {
      lines.push(
        `| ${index + 1} | ${finding.title.replace(/\|/g, '\\|')} | ${
          SEVERITY_LABEL[finding.severity] ?? finding.severity
        } | ${finding.cvss?.toFixed?.(1) ?? '0.0'} | ${finding.status ?? 'open'} |`,
      );
    });
  }
  lines.push('');

  if (findings.length > 0) {
    lines.push('## 5. Detailed Findings');
    lines.push('');
    findings.forEach((finding, index) => {
      lines.push(
        `### ${index + 1}. [${SEVERITY_LABEL[finding.severity] ?? finding.severity}] ${finding.title}`,
      );
      lines.push('');
      lines.push(`- **CVSS:** ${(finding.cvss ?? 0).toFixed(1)}${finding.vector ? ` (\`${finding.vector}\`)` : ''}`);
      if (finding.cwe) lines.push(`- **CWE:** ${finding.cwe}`);
      if (finding.affected) lines.push(`- **Affected:** ${finding.affected}`);
      lines.push(`- **Status:** ${finding.status ?? 'open'}`);
      lines.push('');
      if (finding.description) {
        lines.push('**Description**');
        lines.push('');
        lines.push(finding.description);
        lines.push('');
      }
      if (finding.evidence) {
        lines.push('**Evidence**');
        lines.push('');
        lines.push('```');
        lines.push(finding.evidence);
        lines.push('```');
        lines.push('');
      }
      if (finding.remediation) {
        lines.push('**Remediation**');
        lines.push('');
        lines.push(finding.remediation);
        lines.push('');
      }
      if (finding.references && finding.references.length > 0) {
        lines.push('**References**');
        lines.push('');
        for (const reference of finding.references) lines.push(`- ${reference}`);
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    });
  }

  lines.push('## 6. About this report');
  lines.push('');
  lines.push(
    'This report was generated with **Project KillChain Hub** — an open-source, educational security platform. All data in this document is fictional training data.',
  );
  lines.push('');

  return lines.join('\n');
}
