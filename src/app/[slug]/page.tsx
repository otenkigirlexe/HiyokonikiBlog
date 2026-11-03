import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug } from '@/lib/posts';
import MarkdownRenderer from '@/app/components/MarkdownRenderer';
import BackToListLink from '@/app/components/BackToListLink';

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map(post => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return {
      title: 'Not Found / ひよこニキのホームページ',
    };
  }

  const pageTitle = `${post.title} — ひよこニキのホームページ`;
  const pageDesc = post.excerpt || `${post.title}の記事詳細`;
  const ogImage = post.thumbnail || '/header.webp';

  return {
    title: pageTitle,
    description: pageDesc,
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      url: `https://hiyokoniki.jp/${post.slug}/`,
      siteName: 'ひよこニキのホームページ',
      locale: 'ja_JP',
      type: 'article',
      publishedTime: post.date,
      images: [
        {
          url: ogImage,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDesc,
      images: [ogImage],
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="article-container">
      {/* 記事ヘッダー */}
      <header className="article-header">
        <BackToListLink listPage={post.listPage} isFeatured={post.isFeatured} />
        <div className="article-meta">
          <time dateTime={post.date} className="post-card-slug">
            {post.date}
          </time>
        </div>
        <h1 className="article-title">{post.title}</h1>
      </header>

      {/* 記事本文 */}
      <div className="article-body">
        <MarkdownRenderer content={post.content} />
      </div>

      {/* 前後の記事ナビゲーション（左：新しい記事、右：古い記事） */}
      <nav className="post-nav" aria-label="前後記事ナビゲーション">
        {post.nextPost ? (
          <Link href={`/${post.nextPost.slug}/`} className="post-nav-card">
            <span className="post-nav-direction">&larr; 次の記事</span>
            <span className="post-nav-title">{post.nextPost.title}</span>
          </Link>
        ) : (
          <div className="post-nav-card post-nav-disabled">
            <span className="post-nav-direction">&larr; 次の記事</span>
            <span className="post-nav-empty">まだ次のブログは更新されていません</span>
          </div>
        )}

        {post.prevPost ? (
          <Link
            href={`/${post.prevPost.slug}/`}
            className="post-nav-card"
            style={{ textAlign: 'right' }}
          >
            <span className="post-nav-direction">前の記事 &rarr;</span>
            <span className="post-nav-title">{post.prevPost.title}</span>
          </Link>
        ) : (
          <div
            className="post-nav-card post-nav-disabled"
            style={{ textAlign: 'right' }}
          >
            <span className="post-nav-direction">前の記事 &rarr;</span>
            <span className="post-nav-empty">これより古いページは存在しません</span>
          </div>
        )}
      </nav>

      {/* 記事末尾の「記事一覧へ戻る」リンク */}
      <div className="article-bottom-back">
        <BackToListLink
          style={{ marginBottom: 0 }}
          listPage={post.listPage}
          isFeatured={post.isFeatured}
        />
      </div>
    </article>
  );
}
