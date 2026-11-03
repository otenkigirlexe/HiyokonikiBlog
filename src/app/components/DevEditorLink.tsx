'use client';

import React from 'react';
import Link from 'next/link';

export default function DevEditorLink() {
  const isLocal = process.env.NEXT_PUBLIC_IS_LOCAL_BUILD === 'true';

  if (!isLocal) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        marginTop: '12px',
        paddingTop: '10px',
        borderTop: '1px dashed var(--border-light, #ccc)',
      }}
    >
      <Link
        href="/editor/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-secondary, #666)',
          textDecoration: 'none',
          padding: '4px 12px',
          background: 'var(--bg-card, #fff)',
          border: '1px solid var(--border-light, #ccc)',
          borderRadius: '6px',
          fontWeight: 500,
          fontSize: '12px',
        }}
      >
        <span>✏️</span> 記事を追加・編集する (Local Editor)
      </Link>
      <Link
        href="/header-editor/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-secondary, #666)',
          textDecoration: 'none',
          padding: '4px 12px',
          background: 'var(--bg-card, #fff)',
          border: '1px solid var(--border-light, #ccc)',
          borderRadius: '6px',
          fontWeight: 500,
          fontSize: '12px',
        }}
      >
        <span>🖼️</span> ヘッダー画像・説明を編集する (Header Editor)
      </Link>
    </div>
  );
}
