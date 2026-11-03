'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { marked } from 'marked';

interface PostSummary {
  slug: string;
  title: string;
  date: string;
}

export default function EditorPage() {
  const isLocal = process.env.NEXT_PUBLIC_IS_LOCAL_BUILD === 'true';

  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [allowOverwrite, setAllowOverwrite] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [uploading, setUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cursorPosRef = useRef<number | null>(null);

  // 編集サーバーのAPIポート（3001）
  const API_BASE = 'http://127.0.0.1:3001';

  const formatSlugToDate = (s: string) =>
    s && s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s;

  // 記事一覧を取得
  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      } else {
        setStatusMsg('編集サーバーから記事一覧を取得できませんでした。npm run editor が実行されているか確認してください。');
      }
    } catch (e: any) {
      setStatusMsg(`編集サーバー通信エラー: ${e.message}`);
    }
  };

  useEffect(() => {
    if (isLocal) {
      fetchPosts();
      // 初期状態で新規作成モードの日付をセット
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
      setSlug(today.replace(/-/g, ''));
    }
  }, [isLocal]);

  // MarkdownRenderer.tsx と同じ変換手法でリアルタイムプレビューを生成
  const previewHtml = useMemo(() => {
    if (!content) return '';
    marked.setOptions({ gfm: true, breaks: true });
    const preprocessed = content
      .replace(/\r?\n/g, '\n\n')
      .replace(
        /!\[(.*?)\]\((\/assets\/[^\)]+)\)/g,
        '\n\n<div class="article-media-wrap"><a href="$2" target="_blank" rel="noopener noreferrer"><img src="$2" alt="$1"></a></div>\n\n'
      )
      .replace(
        /(<video[^>]*>[\s\S]*?<\/video>)/g,
        '\n\n<div class="article-media-wrap">$1</div>\n\n'
      );
    return marked.parse(preprocessed) as string;
  }, [content]);

  // プレビュー用の前後記事（左：新しい記事、右：古い記事）を算出
  const { nextPost, prevPost } = useMemo(() => {
    if (!posts.length || !slug) {
      return { nextPost: null, prevPost: null };
    }
    const idx = posts.findIndex(p => p.slug === slug);
    if (idx !== -1) {
      return {
        nextPost: idx > 0 ? posts[idx - 1] : null,
        prevPost: idx < posts.length - 1 ? posts[idx + 1] : null,
      };
    }
    // 新規記事の場合：現在の一覧とslugを比較して前後の記事を推定
    const newerCandidates = posts.filter(p => p.slug > slug);
    const olderCandidates = posts.filter(p => p.slug < slug);
    return {
      nextPost: newerCandidates.length > 0 ? newerCandidates[newerCandidates.length - 1] : null,
      prevPost: olderCandidates.length > 0 ? olderCandidates[0] : null,
    };
  }, [posts, slug]);

  // 記事の選択
  const selectPost = async (targetSlug: string) => {
    setSelectedSlug(targetSlug);
    setStatusMsg(`記事 "${targetSlug}" を読み込み中...`);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${targetSlug}`);
      const data = await res.json();
      if (data.raw) {
        const raw = data.raw;
        const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
        if (fmMatch) {
          const fm = fmMatch[1];
          const body = fmMatch[2];
          const titleM = fm.match(/title:\s*"([^"]+)"/);
          const dateM = fm.match(/date:\s*"([^"]+)"/);
          const slugM = fm.match(/slug:\s*"([^"]+)"/);

          const loadedSlug = slugM ? slugM[1] : targetSlug;
          setSlug(loadedSlug);
          setDate(dateM ? dateM[1] : formatSlugToDate(loadedSlug));
          setTitle(titleM ? titleM[1] : '');
          setContent(body.trim());
        } else {
          setSlug(targetSlug);
          setDate(formatSlugToDate(targetSlug));
          setContent(raw);
        }
        setAllowOverwrite(true);
        cursorPosRef.current = null;
        setStatusMsg(`記事 "${formatSlugToDate(targetSlug)}" を読み込みました`);
      }
    } catch (e: any) {
      setStatusMsg(`記事の読み込み失敗: ${e.message}`);
    }
  };

  // 新規記事作成モード
  const handleNewPost = () => {
    setSelectedSlug(null);
    const today = new Date().toISOString().slice(0, 10);
    const slugVal = today.replace(/-/g, '');
    setSlug(slugVal);
    setDate(today);
    setTitle('');
    setContent('');
    setAllowOverwrite(false);
    cursorPosRef.current = null;
    setStatusMsg('新規記事作成モード');
  };

  // 記事保存
  const handleSave = async () => {
    if (!slug.trim()) {
      alert('日付を選択してください');
      return;
    }

    setStatusMsg('保存中...');
    try {
      const res = await fetch(`${API_BASE}/api/posts/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug.trim(),
          date: date.trim() || formatSlugToDate(slug.trim()),
          title: title.trim(),
          bodyContent: content,
          allowOverwrite,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setStatusMsg(`保存完了: ${slug}.md`);
        setSelectedSlug(slug);
        setAllowOverwrite(true);
        fetchPosts();
      } else {
        setStatusMsg(`保存エラー: ${result.error || '不明なエラー'}`);
        alert(`エラー: ${result.error}`);
      }
    } catch (e: any) {
      setStatusMsg(`保存リクエスト通信エラー: ${e.message}`);
    }
  };

  // 記事削除
  const handleDelete = async () => {
    if (!selectedSlug) return;
    const confirmed = window.confirm(
      `記事「${title || selectedSlug} (${formatSlugToDate(selectedSlug)})」を削除しますか？\n※ content/posts/${selectedSlug}.md および public/assets/${selectedSlug}/ 内の画像も削除されます。`
    );
    if (!confirmed) return;

    setStatusMsg('削除中...');
    try {
      const res = await fetch(`${API_BASE}/api/posts/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: selectedSlug }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        const deletedSlug = selectedSlug;
        handleNewPost();
        setStatusMsg(`削除完了: ${deletedSlug}.md`);
        fetchPosts();
      } else {
        setStatusMsg(`削除エラー: ${result.error || '不明なエラー'}`);
        alert(`削除エラー: ${result.error}`);
      }
    } catch (e: any) {
      setStatusMsg(`削除リクエスト通信エラー: ${e.message}`);
    }
  };

  // 素材アップロード
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!slug.trim()) {
      alert('素材を紐付ける記事の日付を先に選択してください');
      return;
    }

    const file = files[0];
    const formData = new FormData();
    formData.append('slug', slug.trim());
    formData.append('allowOverwrite', allowOverwrite ? 'true' : 'false');
    formData.append('file', file);

    // アップロード開始時点のカーソル位置を確定保持（React StrictModeの2回実行で書き換わらないよう外で保持）
    const capturedPos = cursorPosRef.current ?? textareaRef.current?.selectionStart ?? null;

    setUploading(true);
    setStatusMsg(`素材 "${file.name}" をアップロード中...`);

    try {
      const res = await fetch(`${API_BASE}/api/upload?slug=${encodeURIComponent(slug.trim())}`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (res.ok && result.files && result.files.length > 0) {
        const item = result.files[0];
        const tag = item.isVideo
          ? `<video controls src="${item.url}"></video>`
          : `![${item.filename}](${item.url})`;

        let finalCursorPos = 0;

        setContent(prev => {
          const rawPos = capturedPos !== null ? capturedPos : prev.length;
          const pos = Math.max(0, Math.min(rawPos, prev.length));
          const before = prev.slice(0, pos);
          const after = prev.slice(pos);

          const needLeadingNewline = before.length > 0 && !before.endsWith('\n');
          const needTrailingNewline = after.length > 0 && !after.startsWith('\n');

          const insertText = `${needLeadingNewline ? '\n' : ''}${tag}${needTrailingNewline ? '\n' : ''}`;
          const nextContent = before + insertText + after;
          finalCursorPos = before.length + insertText.length;

          return nextContent;
        });

        cursorPosRef.current = finalCursorPos;
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(finalCursorPos, finalCursorPos);
          }
        });

        setStatusMsg(`アップロード完了: ${item.filename}`);
      } else {
        const errMsg = result.error || 'ファイルの応答が空でした';
        setStatusMsg(`アップロード失敗: ${errMsg}`);
        alert(`アップロード失敗: ${errMsg}`);
      }
    } catch (err: any) {
      setStatusMsg(`アップロード通信エラー: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Cloudflare Pages 等の公開環境では表示しない
  if (!isLocal) {
    return (
      <div className="article-container" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <h2>このページはローカル開発環境専用です。</h2>
        <p style={{ color: 'var(--text-secondary)' }}>本番公開環境では記事編集機能は無効化されています。</p>
        <Link href="/" className="article-back-link" style={{ marginTop: '16px' }}>
          &larr; 記事一覧へ戻る
        </Link>
      </div>
    );
  }

  const displayDate = date || formatSlugToDate(slug) || 'YYYY-MM-DD';

  return (
    <div className="post-editor-layout">
      {/* 左サイドバー: 記事一覧 */}
      <aside className="post-editor-sidebar">
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--border-light)',
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>記事エディター</h2>
              <span className="section-badge">{posts.length} Posts</span>
            </div>
            <Link
              href="/"
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                padding: '3px 10px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              &larr; 一覧へ
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={handleNewPost}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--accent)',
                color: '#000',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.84rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              + 新規記事を作成
            </button>
            <Link
              href="/header-editor/"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                padding: '6px 12px',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.8rem',
                textDecoration: 'none',
              }}
            >
              <span>🖼️</span> ヘッダー画像・説明を編集
            </Link>
          </div>
        </div>

        <ul style={{ flex: 1, overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0 }}>
          {posts.map(p => {
            const isSelected = selectedSlug === p.slug;
            const itemDate = p.date || formatSlugToDate(p.slug);
            return (
              <li
                key={p.slug}
                onClick={() => selectPost(p.slug)}
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border-light)',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--accent-light)' : 'transparent',
                  borderLeft: isSelected ? '4px solid var(--accent)' : '4px solid transparent',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ marginBottom: '4px' }}>
                  <span className="post-card-slug" style={{ fontSize: '0.74rem' }}>
                    {itemDate}
                  </span>
                </div>
                <div
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.84rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {p.title}
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* メイン編集＆プレビューエリア */}
      <main className="post-editor-main">
        {/* 編集ツールバー */}
        <header
          style={{
            padding: '10px 20px',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>日付:</label>
            <input
              type="date"
              value={date}
              onChange={e => {
                const newDate = e.target.value;
                setDate(newDate);
                if (!selectedSlug && newDate) {
                  setSlug(newDate.replace(/-/g, ''));
                }
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>

          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="記事タイトルを入力..."
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '6px 12px',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          />

          <label
            style={{
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={allowOverwrite}
              onChange={e => setAllowOverwrite(e.target.checked)}
            />
            上書き許可
          </label>

          {selectedSlug && (
            <>
              <Link
                href={`/${selectedSlug}/`}
                style={{
                  fontSize: '0.82rem',
                  padding: '6px 12px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                }}
              >
                記事ページを見る &rarr;
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  fontSize: '0.82rem',
                  padding: '6px 12px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-card)',
                  color: '#dc2626',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="この記事と紐づく画像フォルダを削除します"
              >
                🗑️ 削除
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleSave}
            style={{
              background: 'var(--accent)',
              color: '#000',
              border: 'none',
              padding: '7px 18px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.86rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            保存する
          </button>
        </header>

        {/* 素材アップロード＆ステータスバー */}
        <div
          style={{
            padding: '8px 20px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '0.82rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>画像・動画の追加:</span>
            <input
              type="file"
              accept="image/*,video/mp4"
              onChange={handleUpload}
              disabled={uploading}
              style={{ fontSize: '0.8rem', maxWidth: '100%' }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontFamily: 'var(--font-mono)' }}>
              (保存先: /assets/{slug || 'YYYYMMDD'}/)
            </span>
          </div>
          <span style={{ color: 'var(--accent-hover)', fontWeight: 600, fontSize: '0.8rem' }}>{statusMsg}</span>
        </div>

        {/* 2ペイン：左 Markdown 入力 ／ 右 実際の記事ページと同粒度のリアルタイムプレビュー */}
        <div className="post-editor-panes">
          {/* 左：Markdown エディター */}
          <div className="post-editor-pane-input">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => {
                cursorPosRef.current = e.currentTarget.selectionStart;
                setContent(e.target.value);
              }}
              onSelect={e => {
                cursorPosRef.current = e.currentTarget.selectionStart;
              }}
              onClick={e => {
                cursorPosRef.current = e.currentTarget.selectionStart;
              }}
              onKeyUp={e => {
                cursorPosRef.current = e.currentTarget.selectionStart;
              }}
              onBlur={e => {
                cursorPosRef.current = e.currentTarget.selectionStart;
              }}
              placeholder={'ここにMarkdown形式で本文を記述してください...\n画像や動画をアップロードすると、現在のカーソル位置に自動挿入されます。'}
              style={{
                flex: 1,
                border: 'none',
                padding: '24px',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.92rem',
                lineHeight: 1.8,
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 右：個別記事ページ（/[slug]/）と完全同一構造のプレビュー */}
          <div className="post-editor-pane-preview">
            <article className="article-container">
              {/* 記事ヘッダー */}
              <header className="article-header">
                <Link href="/" className="article-back-link">
                  &larr; 記事一覧へ戻る
                </Link>
                <div className="article-meta">
                  <time dateTime={displayDate} className="post-card-slug">
                    {displayDate}
                  </time>
                </div>
                <h1 className="article-title">{title || '（タイトル未入力）'}</h1>
              </header>

              {/* 記事本文 */}
              <div
                className="article-body"
                dangerouslySetInnerHTML={{
                  __html: previewHtml || '<p style="color: var(--text-muted);">本文を入力するとここにリアルタイムでプレビューが表示されます。</p>',
                }}
              />

              {/* 前後の記事ナビゲーション（左：新しい記事、右：古い記事） */}
              <nav className="post-nav" aria-label="前後記事ナビゲーション">
                {nextPost ? (
                  <Link href={`/${nextPost.slug}/`} className="post-nav-card">
                    <span className="post-nav-direction">&larr; 次の記事</span>
                    <span className="post-nav-title">{nextPost.title}</span>
                  </Link>
                ) : (
                  <div className="post-nav-card post-nav-disabled">
                    <span className="post-nav-direction">&larr; 次の記事</span>
                    <span className="post-nav-empty">まだ次のブログは更新されていません</span>
                  </div>
                )}

                {prevPost ? (
                  <Link
                    href={`/${prevPost.slug}/`}
                    className="post-nav-card"
                    style={{ textAlign: 'right' }}
                  >
                    <span className="post-nav-direction">前の記事 &rarr;</span>
                    <span className="post-nav-title">{prevPost.title}</span>
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
                <Link href="/" className="article-back-link" style={{ marginBottom: 0 }}>
                  &larr; 記事一覧へ戻る
                </Link>
              </div>
            </article>
          </div>
        </div>
      </main>
    </div>
  );
}
