'use client';

import React from 'react';
import Link from 'next/link';

interface BackToListLinkProps {
  style?: React.CSSProperties;
  listPage?: number;
  isFeatured?: boolean;
}

export default function BackToListLink({ style, listPage = 1, isFeatured = false }: BackToListLinkProps) {
  const handleClick = () => {
    try {
      if (sessionStorage.getItem('hiyokoniki_from_list') === 'true') {
        sessionStorage.setItem('hiyokoniki_return_page', String(listPage));
        sessionStorage.setItem('hiyokoniki_return_is_featured', isFeatured ? 'true' : 'false');
        sessionStorage.setItem('hiyokoniki_restore_active', 'true');
      }
    } catch (_) {
      // Ignore storage errors
    }
  };

  return (
    <Link
      href="/"
      className="article-back-link"
      style={style}
      onClick={handleClick}
    >
      &larr; 記事一覧へ戻る
    </Link>
  );
}
