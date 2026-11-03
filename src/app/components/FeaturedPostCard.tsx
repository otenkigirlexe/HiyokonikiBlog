'use client';

import React from 'react';
import Link from 'next/link';
import { PostMeta } from '@/lib/posts';

interface FeaturedPostCardProps {
  post: PostMeta;
}

export default function FeaturedPostCard({ post }: FeaturedPostCardProps) {
  const handleFeaturedClick = () => {
    try {
      sessionStorage.setItem('hiyokoniki_return_page', '1');
      sessionStorage.setItem('hiyokoniki_from_list', 'true');
    } catch (_) {
      // Ignore storage errors
    }
  };

  return (
    <article className="card-frame featured-card">
      {post.thumbnail && (
        <div className="intro-image-wrap">
          <Link href={`/${post.slug}/`} onClick={handleFeaturedClick}>
            <img
              src={post.thumbnail}
              alt={post.title}
              className="aspect-preserved-image"
            />
          </Link>
        </div>
      )}
      <div className="featured-body">
        <div className="featured-meta">
          <span className="featured-badge">最新記事</span>
          <time dateTime={post.date} className="featured-slug">
            {post.date}
          </time>
        </div>
        <h2 className="featured-title">
          <Link href={`/${post.slug}/`} onClick={handleFeaturedClick}>
            {post.title}
          </Link>
        </h2>
        {post.excerpt && (
          <p className="featured-excerpt">{post.excerpt}</p>
        )}
        <Link
          href={`/${post.slug}/`}
          className="featured-read-link"
          onClick={handleFeaturedClick}
        >
          この記事を読む &rarr;
        </Link>
      </div>
    </article>
  );
}
