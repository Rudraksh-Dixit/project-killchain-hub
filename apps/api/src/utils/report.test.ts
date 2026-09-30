import { describe, expect, it } from 'vitest';
import { findingStats, renderReportMarkdown, severityFromCvss } from './report';

const sampleReport = {
  id: 'rpt_1',
  title: 'Test Assessment',
  client: 'Example Client',
  scope: 'One example host',
  executive_summary: 'Two issues found.',
  methodology: 'Manual testing.',
  findings: JSON.stringify([
    {
      title: 'Missing security header',
      severity: 'medium',
      cvss: 5.3,
      vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
      cwe: 'CWE-693',
      status: 'open',
      description: 'The header is absent.',
      evidence: 'curl -I https://example.org',
      remediation: 'Add the header.',
      references: ['https://owasp.org'],
    },
    {
      title: 'Informational note',
      severity: 'info',
      cvss: 0,
      status: 'remediated',
    },
  ]),
  status: 'draft',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
};

describe('severityFromCvss', () => {
  it('maps scores to qualitative severities', () => {
    expect(severityFromCvss(9.8)).toBe('critical');
    expect(severityFromCvss(7.5)).toBe('high');
    expect(severityFromCvss(5.0)).toBe('medium');
    expect(severityFromCvss(2.0)).toBe('low');
    expect(severityFromCvss(0)).toBe('info');
  });
});

describe('findingStats', () => {
  it('counts findings and averages cvss', () => {
    const stats = findingStats(JSON.parse(sampleReport.findings));
    expect(stats.total).toBe(2);
    expect(stats.counts.medium).toBe(1);
    expect(stats.counts.info).toBe(1);
    expect(stats.averageCvss).toBe(5.3);
    expect(stats.open).toBe(1);
  });
});

describe('renderReportMarkdown', () => {
  const markdown = renderReportMarkdown(sampleReport);

  it('renders the document structure', () => {
    expect(markdown).toContain('# Test Assessment');
    expect(markdown).toContain('## 1. Executive Summary');
    expect(markdown).toContain('## 4. Findings Summary');
    expect(markdown).toContain('### 1. [Medium] Missing security header');
    expect(markdown).toContain('curl -I https://example.org');
    expect(markdown).toContain('- **CVSS:** 5.3');
    expect(markdown).toContain('- **CWE:** CWE-693');
  });

  it('includes a summary table row for every finding', () => {
    expect(markdown).toContain('| 1 | Missing security header | Medium | 5.3 | open |');
    expect(markdown).toContain('| 2 | Informational note | Info | 0.0 | remediated |');
  });
});
