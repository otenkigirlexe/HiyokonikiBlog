'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PostMeta } from '@/lib/posts';

interface PostListProps {
  posts: PostMeta[];
}

export default function PostList({ posts }: PostListProps) {
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(posts.length / itemsPerPage) || 1;

  // 個別記事ページの「← 記事一覧へ戻る」から戻ってきた場合、元のページ番号を復元する
  useEffect(() => {
    try {
      const shouldRestore = sessionStorage.getItem('hiyokoniki_restore_active') === 'true';
      const savedPage = sessionStorage.getItem('hiyokoniki_return_page');
      const isFeatured = sessionStorage.getItem('hiyokoniki_return_is_featured') === 'true';
      if (shouldRestore && savedPage) {
        const parsed = parseInt(savedPage, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
          setCurrentPage(parsed);
        }
        sessionStorage.removeItem('hiyokoniki_restore_active');
        sessionStorage.removeItem('hiyokoniki_return_is_featured');
        requestAnimationFrame(() => {
          if (isFeatured) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            const el = document.getElementById('articles-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        });
      }
    } catch (_) {
      // Ignore storage errors
    }
  }, [totalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPosts = posts.slice(startIndex, startIndex + itemsPerPage);

  // 左カラムのカード下端と、最下部スクロール時のページネーション下端の縦位置を完全一致させ、
  // かつ左カードが1pxも上に押し上げられないよう下部余白を精密計算する
  useEffect(() => {
    const updateBottomAlignment = () => {
      const layout = document.querySelector('.home-layout') as HTMLElement | null;
      const leftCol = document.querySelector('.left-column') as HTMLElement | null;
      const leftCard = document.querySelector('.left-column .card-frame') as HTMLElement | null;
      const footer = document.querySelector('.site-footer') as HTMLElement | null;
      if (!layout || !leftCol || !leftCard || !footer) return;

      if (window.innerWidth <= 860) {
        layout.style.paddingBottom = '40px';
        return;
      }

      const stickyTop = parseFloat(window.getComputedStyle(leftCol).top) || 80;
      const leftCardHeight = leftCard.getBoundingClientRect().height;
      const leftCardBottomY = stickyTop + leftCardHeight;
      const footerHeight = footer.getBoundingClientRect().height;
      const viewportHeight = window.innerHeight;

      // 最下部までスクロールした時にページネーションの下端が leftCardBottomY にピタッと止まる余白量
      const idealPaddingBottom = Math.max(32, viewportHeight - leftCardBottomY - footerHeight);
      layout.style.paddingBottom = `${idealPaddingBottom}px`;
    };

    updateBottomAlignment();
    window.addEventListener('resize', updateBottomAlignment);

    const leftCard = document.querySelector('.left-column .card-frame');
    const footer = document.querySelector('.site-footer');
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateBottomAlignment());
      if (leftCard) ro.observe(leftCard);
      if (footer) ro.observe(footer);
    }

    const img = document.querySelector('.left-column img') as HTMLImageElement | null;
    if (img && !img.complete) {
      img.addEventListener('load', updateBottomAlignment);
    }

    return () => {
      window.removeEventListener('resize', updateBottomAlignment);
      if (ro) ro.disconnect();
      if (img) {
        img.removeEventListener('load', updateBottomAlignment);
      }
      const layout = document.querySelector('.home-layout') as HTMLElement | null;
      if (layout) layout.style.paddingBottom = '';
    };
  }, [currentPage]);

  const handlePageChange = (newPage: number, shouldScrollToHeader: boolean) => {
    const clamped = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(clamped);
    try {
      sessionStorage.setItem('hiyokoniki_return_page', String(clamped));
    } catch (_) {
      // Ignore storage errors
    }

    if (shouldScrollToHeader) {
      // 「記事一覧」見出しが固定ヘッダーの下（左ボックス上端と同じ高さ）に来るようスクロール
      requestAnimationFrame(() => {
        const el = document.getElementById('articles-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  };

  const handlePostClick = () => {
    try {
      sessionStorage.setItem('hiyokoniki_return_page', String(currentPage));
      sessionStorage.setItem('hiyokoniki_from_list', 'true');
    } catch (_) {
      // Ignore storage errors
    }
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <section id="articles-section" className="articles-section">
      <div className="section-header">
        <h2 className="section-title">
          <span>記事一覧</span>
          <span className="section-badge">{posts.length} Posts</span>
        </h2>
      </div>

      <div className="post-list">
        {currentPosts.map(post => (
          <Link
            key={post.slug}
            href={`/${post.slug}/`}
            className="post-card"
            onClick={handlePostClick}
          >
            <div className="post-card-meta">
              <time dateTime={post.date} className="post-card-slug">
                {post.date}
              </time>
            </div>
            <h3 className="post-card-title">{post.title}</h3>
            {post.excerpt && (
              <p className="post-card-excerpt">{post.excerpt}</p>
            )}
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination" aria-label="下部ページネーション">
          <button
            type="button"
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage - 1, true)}
            disabled={currentPage === 1}
          >
            &larr; 前のページ
          </button>

          <div className="pagination-numbers">
            {pageNumbers.map(num => (
              <button
                key={num}
                type="button"
                className={`pagination-num-btn ${currentPage === num ? 'active' : ''}`}
                onClick={() => handlePageChange(num, true)}
                aria-current={currentPage === num ? 'page' : undefined}
              >
                {num}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage + 1, true)}
            disabled={currentPage === totalPages}
          >
            次のページ &rarr;
          </button>
        </div>
      )}
    </section>
  );
}
