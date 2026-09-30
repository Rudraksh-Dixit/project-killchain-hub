import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { ImportResult } from '../../lib/types';
import { Button, Field, Modal, Select, Textarea } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';

const EXAMPLE_CSV = `type,value,malware_family,category,severity,confidence,first_seen,last_seen,tags,source,description
domain,c2.example.com,Lumma,network,high,high,2026-09-01,2026-09-20,c2,feed-alpha,Fake C2 from documentation range
ip,192.0.2.44,Amadey,loader,medium,medium,2026-09-05,2026-09-18,proxy,feed-beta,Test IP in TEST-NET-1`;

export function IocImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const toast = useToast();
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [data, setData] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (open) {
      setData('');
      setResult(null);
      setError(null);
      setFormat('csv');
    }
  }, [open]);

  async function handleImport() {
    if (!data.trim()) {
      setError('Paste CSV or JSON data first.');
      return;
    }
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const res = await api<ImportResult>('/iocs/import', {
        method: 'POST',
        body: { format, data, skipDuplicates },
      });
      setResult(res);
      toast.success(
        `Imported ${res.imported} indicator${res.imported === 1 ? '' : 's'}`,
        `${res.skipped.length} skipped · ${res.invalid.length} invalid`,
      );
      onImported();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Bulk import indicators"
      description="Paste CSV with a header row or a JSON array of records. Up to 5,000 rows per request."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={importing}>
            Close
          </Button>
          <Button variant="primary" size="sm" onClick={handleImport} loading={importing}>
            Run import
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Format" htmlFor="import-format">
            <Select
              id="import-format"
              value={format}
              onChange={(event) => setFormat(event.target.value as 'csv' | 'json')}
            >
              <option value="csv">CSV (header row)</option>
              <option value="json">JSON array</option>
            </Select>
          </Field>
          <Field label="Duplicates">
            <label className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md border border-line bg-surface2 px-3 text-[13px] text-ink-2">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(event) => setSkipDuplicates(event.target.checked)}
                className="h-3.5 w-3.5 accent-[rgb(var(--c-accent))]"
              />
              Skip existing indicators
            </label>
          </Field>
        </div>

        <Field
          label="Data"
          htmlFor="import-data"
          error={error}
          hint={
            format === 'csv'
              ? 'Columns: type, value, malware_family, category, severity, confidence, first_seen, last_seen, tags, source, description'
              : 'Each object accepts the same keys as the CSV columns.'
          }
        >
          <Textarea
            id="import-data"
            rows={10}
            className="font-mono text-[12.5px]"
            value={data}
            onChange={(event) => setData(event.target.value)}
            placeholder={format === 'csv' ? EXAMPLE_CSV : '[{"type":"ip","value":"192.0.2.10"}]'}
            spellCheck={false}
          />
        </Field>

        {result && (
          <div className="rounded-md border border-line bg-surface2/70 p-4 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">Import finished</span>
              <span className="font-mono text-xs text-ink-3">
                {result.imported} imported · {result.skipped.length} skipped · {result.invalid.length} invalid
              </span>
            </div>
            {(result.invalid.length > 0 || result.skipped.length > 0) && (
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-ink-3">
                {result.invalid.slice(0, 20).map((row, index) => (
                  <li key={`i-${index}`}>
                    Row {row.index + 1}: {row.reason}
                  </li>
                ))}
                {result.skipped.slice(0, 10).map((row, index) => (
                  <li key={`s-${index}`}>
                    {row.value}: {row.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
