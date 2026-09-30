import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, Tag as TagIcon } from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { formatDate } from '../lib/format';
import { Markdown } from '../lib/markdown';
import type { Article } from '../lib/types';
import {
  Badge,
  Button,
  ErrorState,
  PageTransition,
  Skeleton,
  Tag,
} from '../components/ui';

interface ArticleResponse {
  article: Article & { content: string };
  related: Article[];
}

export function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const detail = useQuery<ArticleResponse>(id ? `/articles/${id}` : null, [id]);

  const article = detail.data?.article;

  if (detail.loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-56" />
        <div className="space-y-3 pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (detail.error || !article) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl rounded-lg border border-line bg-surface">
          <ErrorState error={detail.error} onRetry={detail.refetch} title="Article unavailable" />
          <div className="pb-6 text-center">
            <Link to="/research">
              <Button variant="secondary" size="sm" icon={<ArrowLeft />}>
                Back to knowledge base
              </Button>
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/research"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Knowledge base
        </Link>
        <div className="flex items-center gap-3 text-[12px] text-ink-3">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {article.readTime} min read
          </span>
          <span>{formatDate(article.publishedAt)}</span>
        </div>
      </div>

      <article className="pkc-card p-6 sm:p-9">
        <header className="border-b border-line pb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{article.category}</Badge>
            {article.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
            {article.title}
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-ink-2">{article.excerpt}</p>
          <div className="mt-4 flex items-center gap-2 text-[13px] text-ink-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/12 text-[10px] font-medium text-accent">
              {article.author.slice(0, 2).toUpperCase()}
            </span>
            {article.author}
          </div>
        </header>

        <div className="pt-2">
          <Markdown content={article.content} />
        </div>
      </article>

      {(detail.data?.related.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
            <BookOpen className="h-3.5 w-3.5" />
            Related research
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {detail.data?.related.map((item) => (
              <Link
                key={item.id}
                to={`/research/${item.id}`}
                className="group rounded-lg border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop"
              >
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{item.category}</Badge>
                  <span className="ml-auto text-[11px] text-ink-3">{formatDate(item.publishedAt)}</span>
                </div>
                <h3 className="mt-2 text-[14px] font-medium leading-5 text-ink transition-colors group-hover:text-accent">
                  {item.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-ink-3">{item.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-1.5 border-t border-line pt-4 text-[11px] text-ink-3">
        <TagIcon className="h-3 w-3" />
        {article.tags.join(' · ') || 'untagged'}
      </div>
    </PageTransition>
  );
}
