'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PostMeta } from '@/lib/posts';

interface PostListProps {
  posts: PostMeta[];
}

const ITEMS_PER_LOAD = 10;

function extractYearMonth(post: PostMeta): { year: string; month: string } {
  const dateStr = post.date || '';
  const year = dateStr.slice(0, 4) || post.slug.slice(0, 4);
  const month = dateStr.length >= 7 ? dateStr.slice(5, 7) : post.slug.slice(4, 6);
  return { year, month };
}

export default function PostList({ posts }: PostListProps) {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_LOAD);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 年ごとの記事数を集計（降順：新しい年が先頭）
  const yearOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      const { year } = extractYearMonth(post);
      if (/^\d{4}$/.test(year)) {
        counts.set(year, (counts.get(year) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([year, count]) => ({ year, count }));
  }, [posts]);

  // 選択中の年における月ごとの記事数を集計（昇順：1月 → 12月）
  const monthOptions = useMemo(() => {
    if (selectedYear === 'all') return [];
    const counts = new Map<string, number>();
    for (const post of posts) {
      const { year, month } = extractYearMonth(post);
      if (year !== selectedYear) continue;
      if (/^\d{2}$/.test(month)) {
        counts.set(month, (counts.get(month) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));
  }, [posts, selectedYear]);

  // 検索・年月フィルター・並び替えを適用
  const filteredPosts = useMemo(() => {
    const keywords = searchQuery
      .trim()
      .toLowerCase()
      .split(/[\s\u3000]+/)
      .filter(Boolean);

    const matched = posts.filter(post => {
      const { year, month } = extractYearMonth(post);

      if (selectedYear !== 'all' && year !== selectedYear) {
        return false;
      }
      if (selectedYear !== 'all' && selectedMonth !== 'all' && month !== selectedMonth) {
        return false;
      }

      if (keywords.length > 0) {
        const haystack = `${post.title} ${post.excerpt || ''} ${post.date} ${post.slug}`.toLowerCase();
        return keywords.every(kw => haystack.includes(kw));
      }

      return true;
    });

    if (sortOrder === 'asc') {
      return [...matched].reverse();
    }
    return matched;
  }, [posts, searchQuery, selectedYear, selectedMonth, sortOrder]);

  const isFiltered =
    searchQuery.trim() !== '' || selectedYear !== 'all' || selectedMonth !== 'all';

  // 個別記事ページの「← 記事一覧へ戻る」から戻ってきた場合、検索・年月フィルター・並び順・展開件数を復元する
  // （ヘッダーの「Home」や直接アクセス時は初期状態のまま表示）
  useEffect(() => {
    try {
      const shouldRestore = sessionStorage.getItem('hiyokoniki_restore_active') === 'true';
      const savedPage = sessionStorage.getItem('hiyokoniki_return_page');
      const isFeatured = sessionStorage.getItem('hiyokoniki_return_is_featured') === 'true';
      const savedFilterRaw = sessionStorage.getItem('hiyokoniki_list_filter_state');

      if (shouldRestore) {
        if (savedFilterRaw) {
          try {
            const saved = JSON.parse(savedFilterRaw);
            if (typeof saved.searchQuery === 'string') setSearchQuery(saved.searchQuery);
            if (typeof saved.selectedYear === 'string') setSelectedYear(saved.selectedYear);
            if (typeof saved.selectedMonth === 'string') setSelectedMonth(saved.selectedMonth);
            if (saved.sortOrder === 'asc' || saved.sortOrder === 'desc') setSortOrder(saved.sortOrder);
            if (typeof saved.visibleCount === 'number' && saved.visibleCount >= ITEMS_PER_LOAD) {
              setVisibleCount(saved.visibleCount);
            }
          } catch (_) {
            // Ignore malformed JSON
          }
        } else if (savedPage) {
          const parsed = parseInt(savedPage, 10);
          if (!isNaN(parsed) && parsed >= 1) {
            setVisibleCount(Math.max(ITEMS_PER_LOAD, parsed * ITEMS_PER_LOAD));
          }
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
  }, []);

  const currentPosts = filteredPosts.slice(0, visibleCount);
  const remainingCount = Math.max(0, filteredPosts.length - currentPosts.length);

  // 左カラムのカード下端と、最下部スクロール時の下端の縦位置を揃える
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

      const idealPaddingBottom = Math.max(32, viewportHeight - leftCardBottomY - footerHeight);
      layout.style.paddingBottom = `${idealPaddingBottom}px`;
    };

    updateBottomAlignment();
    window.addEventListener('resize', updateBottomAlignment);

    const leftCard = document.querySelector('.left-column .card-frame');
    const footer = document.querySelector('.site-footer');
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && leftCard && footer) {
      ro = new ResizeObserver(() => updateBottomAlignment());
      ro.observe(leftCard);
      ro.observe(footer);
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
  }, [currentPosts.length]);

  const handleLoadMore = () => {
    setVisibleCount(prev => {
      const next = prev + ITEMS_PER_LOAD;
      try {
        sessionStorage.setItem('hiyokoniki_return_page', String(Math.ceil(next / ITEMS_PER_LOAD)));
      } catch (_) {}
      return next;
    });
  };

  const handlePostClick = (indexInList: number) => {
    try {
      const pageEquivalent = Math.floor(indexInList / ITEMS_PER_LOAD) + 1;
      sessionStorage.setItem('hiyokoniki_return_page', String(pageEquivalent));
      sessionStorage.setItem('hiyokoniki_from_list', 'true');
      sessionStorage.setItem(
        'hiyokoniki_list_filter_state',
        JSON.stringify({
          searchQuery,
          selectedYear,
          selectedMonth,
          sortOrder,
          visibleCount,
        })
      );
    } catch (_) {
      // Ignore storage errors
    }
  };

  const handleYearSelect = (year: string) => {
    setSelectedYear(year);
    setSelectedMonth('all');
    setVisibleCount(ITEMS_PER_LOAD);
  };

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setVisibleCount(ITEMS_PER_LOAD);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedYear('all');
    setSelectedMonth('all');
    setVisibleCount(ITEMS_PER_LOAD);
  };

  return (
    <section id="articles-section" className="articles-section">
      <div className="section-header">
        <h2 className="section-title">
          <span>記事一覧</span>
          <span className="section-badge">
            {isFiltered ? `${filteredPosts.length} / ${posts.length} Posts` : `${posts.length} Posts`}
          </span>
        </h2>
      </div>

      {/* 検索・年月絞り込み・並び順パネル */}
      {posts.length > 0 && (
        <div className="post-filter-panel">
          {/* キーワードで検索 */}
          <div className="post-filter-group">
            <label htmlFor="post-search-input" className="post-filter-label">
              キーワードで検索
            </label>
            <div className="post-search-wrap">
              <input
                id="post-search-input"
                type="search"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(ITEMS_PER_LOAD);
                }}
                placeholder="例: Liella!、伊達さゆり、2023-09…"
                aria-label="記事を検索"
                className="post-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="post-search-clear"
                  onClick={() => {
                    setSearchQuery('');
                    setVisibleCount(ITEMS_PER_LOAD);
                  }}
                  aria-label="検索をクリア"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* 年月で絞り込み */}
          {yearOptions.length > 1 && (
            <div className="post-filter-group">
              <span className="post-filter-label">年月で絞り込み</span>
              <div className="post-filter-chips" role="group" aria-label="年別フィルター">
                <button
                  type="button"
                  className={`post-filter-chip ${selectedYear === 'all' ? 'active' : ''}`}
                  onClick={() => handleYearSelect('all')}
                >
                  すべて
                </button>
                {yearOptions.map(({ year, count }) => (
                  <button
                    key={year}
                    type="button"
                    className={`post-filter-chip ${selectedYear === year ? 'active' : ''}`}
                    onClick={() => handleYearSelect(year)}
                  >
                    <span>{year}</span>
                    <span className="post-filter-count">({count})</span>
                  </button>
                ))}
              </div>

              {selectedYear !== 'all' && monthOptions.length > 1 && (
                <div className="post-filter-chips post-filter-months" role="group" aria-label="月別フィルター">
                  <button
                    type="button"
                    className={`post-filter-chip ${selectedMonth === 'all' ? 'active' : ''}`}
                    onClick={() => handleMonthSelect('all')}
                  >
                    {selectedYear}年すべて
                  </button>
                  {monthOptions.map(({ month, count }) => (
                    <button
                      key={month}
                      type="button"
                      className={`post-filter-chip ${selectedMonth === month ? 'active' : ''}`}
                      onClick={() => handleMonthSelect(month)}
                    >
                      <span>{parseInt(month, 10)}月</span>
                      <span className="post-filter-count">({count})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 並び順 */}
          <div className="post-filter-group post-filter-sort-row">
            <span className="post-filter-label">並び順</span>
            <button
              type="button"
              className="post-sort-btn"
              onClick={() => {
                setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
                setVisibleCount(ITEMS_PER_LOAD);
              }}
              aria-label="並び替えを切り替え"
            >
              {sortOrder === 'desc' ? '新しい順 ↓' : '古い順 ↑'}
            </button>
          </div>
        </div>
      )}

      {currentPosts.length > 0 ? (
        <div className="post-list">
          {currentPosts.map((post, idx) => (
            <Link
              key={post.slug}
              href={`/${post.slug}/`}
              className="post-card"
              onClick={() => handlePostClick(idx)}
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
      ) : (
        <div className="post-empty-state">
          <p>条件に一致する記事が見つかりませんでした。</p>
          {isFiltered && (
            <button
              type="button"
              className="post-reset-btn"
              onClick={handleResetFilters}
            >
              条件をリセット
            </button>
          )}
        </div>
      )}

      {/* もっと見る（note方式 Load More） */}
      {remainingCount > 0 && (
        <div className="load-more-wrap">
          <button
            type="button"
            className="load-more-btn"
            onClick={handleLoadMore}
          >
            もっと見る（残り {remainingCount}件）
          </button>
        </div>
      )}
    </section>
  );
}
