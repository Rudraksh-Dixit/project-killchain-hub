import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api';
import type { Ioc } from '../../lib/types';
import { Button, Field, Input, Modal, Select, Textarea } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';

interface FormState {
  type: string;
  value: string;
  malwareFamily: string;
  category: string;
  severity: string;
  confidence: string;
  firstSeen: string;
  lastSeen: string;
  tags: string;
  source: string;
  description: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function toForm(ioc: Ioc | null): FormState {
  return {
    type: ioc?.type ?? 'domain',
    value: ioc?.value ?? '',
    malwareFamily: ioc?.malwareFamily ?? '',
    category: ioc?.category ?? 'network',
    severity: ioc?.severity ?? 'medium',
    confidence: ioc?.confidence ?? 'medium',
    firstSeen: (ioc?.firstSeen ?? '').slice(0, 10) || today(),
    lastSeen: (ioc?.lastSeen ?? '').slice(0, 10) || today(),
    tags: (ioc?.tags ?? []).join(', '),
    source: ioc?.source ?? '',
    description: ioc?.description ?? '',
  };
}

export function IocFormModal({
  open,
  ioc,
  onClose,
  onSaved,
}: {
  open: boolean;
  ioc: Ioc | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() => toForm(ioc));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toForm(ioc));
      setError(null);
    }
  }, [open, ioc]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      type: form.type,
      value: form.value.trim(),
      malwareFamily: form.malwareFamily.trim() || 'Unknown',
      category: form.category,
      severity: form.severity,
      confidence: form.confidence,
      firstSeen: form.firstSeen,
      lastSeen: form.lastSeen,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      source: form.source.trim(),
      description: form.description.trim(),
    };

    try {
      if (ioc) {
        await api(`/iocs/${ioc.id}`, { method: 'PUT', body: payload });
        toast.success('Indicator updated');
      } else {
        await api('/iocs', { method: 'POST', body: payload });
        toast.success('Indicator created');
      }
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.details && Array.isArray(err.details)
            ? err.details.map((d) => (d as { message?: string }).message).filter(Boolean).join(', ') || err.message
            : err.message
          : 'Could not save indicator';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={ioc ? 'Edit indicator' : 'Add indicator'}
      description={
        ioc
          ? 'Update the indicator metadata. Changes are visible to every workspace member.'
          : 'Track a new indicator of compromise. Values are validated against type rules.'
      }
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            form="ioc-form"
            loading={saving}
          >
            {ioc ? 'Save changes' : 'Add indicator'}
          </Button>
        </>
      }
    >
      <form id="ioc-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="ioc-type">
            <Select id="ioc-type" value={form.type} onChange={(e) => set('type', e.target.value)}>
              <option value="domain">domain</option>
              <option value="ip">ip</option>
              <option value="url">url</option>
              <option value="hash">hash</option>
            </Select>
          </Field>
          <Field label="Malware family" htmlFor="ioc-family" hint="e.g. Lumma, Amadey, AgentTesla">
            <Input
              id="ioc-family"
              value={form.malwareFamily}
              onChange={(e) => set('malwareFamily', e.target.value)}
              placeholder="Lumma"
            />
          </Field>
        </div>

        <Field label="Value" htmlFor="ioc-value" required>
          <Input
            id="ioc-value"
            className="font-mono"
            required
            value={form.value}
            onChange={(e) => set('value', e.target.value)}
            placeholder="45.137.21.15"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Category" htmlFor="ioc-category">
            <Select id="ioc-category" value={form.category} onChange={(e) => set('category', e.target.value)}>
              <option value="stealer">stealer</option>
              <option value="loader">loader</option>
              <option value="phishing">phishing</option>
              <option value="network">network</option>
            </Select>
          </Field>
          <Field label="Severity" htmlFor="ioc-severity">
            <Select id="ioc-severity" value={form.severity} onChange={(e) => set('severity', e.target.value)}>
              <option value="critical">critical</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
              <option value="info">info</option>
            </Select>
          </Field>
          <Field label="Confidence" htmlFor="ioc-confidence">
            <Select id="ioc-confidence" value={form.confidence} onChange={(e) => set('confidence', e.target.value)}>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First seen" htmlFor="ioc-first">
            <Input id="ioc-first" type="date" value={form.firstSeen} onChange={(e) => set('firstSeen', e.target.value)} />
          </Field>
          <Field label="Last seen" htmlFor="ioc-last">
            <Input id="ioc-last" type="date" value={form.lastSeen} onChange={(e) => set('lastSeen', e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tags" htmlFor="ioc-tags" hint="Comma separated">
            <Input
              id="ioc-tags"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="panel, c2, spam"
            />
          </Field>
          <Field label="Source" htmlFor="ioc-source">
            <Input
              id="ioc-source"
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
              placeholder="internal-honeypot"
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="ioc-desc">
          <Textarea
            id="ioc-desc"
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Context, attribution notes, observed behaviour…"
          />
        </Field>

        <button type="submit" className="sr-only" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
