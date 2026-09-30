import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Inbox, Plus, X } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { qs } from '../lib/query';
import { useQuery } from '../hooks/useQuery';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatDate, relativeTime, titleCase } from '../lib/format';
import type { Submission, SubmissionListResponse, SubmissionStatus } from '../lib/types';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  PageTransition,
  Pagination,
  Select,
  Tabs,
  Textarea,
} from '../components/ui';

const STATUS_TONE: Record<SubmissionStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

function NewSubmissionModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [kind, setKind] = useState('ioc');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [payloadText, setPayloadText] = useState('{\n  \n}');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    let payload: Record<string, unknown> = {};
    if (payloadText.trim()) {
      try {
        const parsed = JSON.parse(payloadText) as unknown;
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setError('Payload must be a JSON object.');
          return;
        }
        payload = parsed as Record<string, unknown>;
      } catch {
        setError('Payload is not valid JSON.');
        return;
      }
    }

    setSaving(true);
    try {
      await api('/submissions', {
        method: 'POST',
        body: { kind, title: title.trim(), body: body.trim(), payload },
      });
      toast.success('Submission received', 'An admin will review it shortly.');
      setTitle('');
      setBody('');
      setPayloadText('{\n  \n}');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create submission');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="New submission"
      description="Propose an IOC, hunt, article, tool or resource for the shared knowledge base."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" form="submission-form" loading={saving}>
            Submit for review
          </Button>
        </>
      }
    >
      <form id="submission-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kind" htmlFor="sub-kind">
            <Select id="sub-kind" value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="ioc">IOC</option>
              <option value="hunt">Hunt</option>
              <option value="article">Article</option>
              <option value="tool">Tool</option>
              <option value="resource">Resource</option>
            </Select>
          </Field>
          <Field label="Title" htmlFor="sub-title" required>
            <Input
              id="sub-title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Short summary of the contribution"
            />
          </Field>
        </div>

        <Field label="Details" htmlFor="sub-body">
          <Textarea
            id="sub-body"
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Context, source, why it matters…"
          />
        </Field>

        <Field
          label="Structured payload"
          htmlFor="sub-payload"
          hint={'Optional JSON object with typed fields (e.g. {"value": "192.0.2.5", "type": "ip"})'}
        >
          <Textarea
            id="sub-payload"
            rows={4}
            className="font-mono text-[12.5px]"
            value={payloadText}
            onChange={(event) => setPayloadText(event.target.value)}
            spellCheck={false}
          />
        </Field>
      </form>
    </Modal>
  );
}

function ReviewNoteModal({
  open,
  mode,
  submission,
  onClose,
  onDone,
}: {
  open: boolean;
  mode: 'approve' | 'reject';
  submission: Submission | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!submission) return;
    setBusy(true);
    try {
      await api(`/submissions/${submission.id}/${mode}`, {
        method: 'POST',
        body: { note: note.trim() || undefined },
      });
      toast.success(mode === 'approve' ? 'Submission approved' : 'Submission rejected');
      setNote('');
      onDone();
      onClose();
    } catch (error) {
      toast.error('Review failed', error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={mode === 'approve' ? 'Approve submission' : 'Reject submission'}
      description={submission ? submission.title : undefined}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={mode === 'approve' ? 'primary' : 'danger'}
            size="sm"
            loading={busy}
            onClick={confirm}
          >
            {mode === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </>
      }
    >
      <Field label="Review note" htmlFor="review-note" hint="Optional — visible to the submitter">
        <Textarea
          id="review-note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={mode === 'approve' ? 'Looks good, thanks!' : 'Needs a valid source reference.'}
        />
      </Field>
    </Modal>
  );
}

export function CommunityPage() {
  const [params, setParams] = useSearchParams();
  const { user, hasRole } = useAuth();

  const status = params.get('status') as SubmissionStatus | null;
  const mine = params.get('mine') === '1';
  const page = Math.max(1, Number(params.get('page') ?? 1));

  const listQuery = useMemo(() => qs({ status, mine: mine ? 'true' : undefined, page, pageSize: 12 }), [status, mine, page]);
  const list = useQuery<SubmissionListResponse>(`/submissions${listQuery}`);

  const [newOpen, setNewOpen] = useState(false);
  const [review, setReview] = useState<{ mode: 'approve' | 'reject'; submission: Submission } | null>(null);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  const rows = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Community"
        title="Submissions"
        description="Contributions flow through a review queue — every member can propose content, admins approve before it lands."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setNewOpen(true)}>
            New submission
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            layoutId="community"
            value={status ?? 'all'}
            onChange={(value) => setParam('status', value === 'all' ? null : value)}
            items={[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending', count: list.data?.facets.statuses.find((s) => s.status === 'pending')?.count },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
            ]}
          />
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
            <input
              type="checkbox"
              checked={mine}
              onChange={(event) => setParam('mine', event.target.checked ? '1' : null)}
              className="h-3.5 w-3.5 accent-[rgb(var(--c-accent))]"
            />
            Only mine
          </label>
          <span className="ml-auto text-[13px] text-ink-3">
            {list.loading ? 'Loading…' : `${total} submissions`}
          </span>
        </div>

        {list.error && <ErrorState error={list.error} onRetry={list.refetch} />}

        {!list.error && !list.loading && rows.length === 0 && (
          <div className="rounded-lg border border-line bg-surface">
            <EmptyState
              icon={<Inbox />}
              title="No submissions here"
              description="Propose the first contribution to the shared knowledge base."
              action={
                <Button variant="primary" size="sm" icon={<Plus />} onClick={() => setNewOpen(true)}>
                  New submission
                </Button>
              }
            />
          </div>
        )}

        {!list.error && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((submission) => (
              <article key={submission.id} className="pkc-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{titleCase(submission.kind)}</Badge>
                      <Badge tone={STATUS_TONE[submission.status]} dot>
                        {submission.status}
                      </Badge>
                      <span className="text-[11px] text-ink-3">
                        {submission.submitter} · {relativeTime(submission.createdAt)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-[14.5px] font-medium leading-5 text-ink">{submission.title}</h3>
                    {submission.body && (
                      <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-ink-3">{submission.body}</p>
                    )}
                    {submission.reviewNote && (
                      <p className="mt-2 rounded-md border border-line bg-surface2/70 px-3 py-2 text-[12.5px] text-ink-2">
                        <span className="font-medium text-ink">
                          {submission.reviewer ?? 'admin'}:
                        </span>{' '}
                        {submission.reviewNote}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-ink-3">
                      {submission.reviewedAt ? `Reviewed ${formatDate(submission.reviewedAt)}` : 'Awaiting review'}
                    </p>
                  </div>

                  {user?.role === 'admin' && submission.status === 'pending' && (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Check />}
                        onClick={() => setReview({ mode: 'approve', submission })}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-danger"
                        icon={<X />}
                        onClick={() => setReview({ mode: 'reject', submission })}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {total > 12 && (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <Pagination
              page={page}
              pageSize={12}
              total={total}
              onPageChange={(next) => setParam('page', String(next))}
            />
          </div>
        )}
      </div>

      <NewSubmissionModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={list.refetch}
      />

      <ReviewNoteModal
        open={Boolean(review)}
        mode={review?.mode ?? 'approve'}
        submission={review?.submission ?? null}
        onClose={() => setReview(null)}
        onDone={list.refetch}
      />

      {!hasRole('admin') && (
        <p className="text-center text-[12px] text-ink-3">
          Tip: {user?.role === 'contributor' ? 'Contributors' : 'Viewers'} can propose content — admins review the queue.
        </p>
      )}
    </PageTransition>
  );
}
