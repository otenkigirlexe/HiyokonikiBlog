'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface SocialLinkItem {
  label: string;
  url: string;
}

const DEFAULT_LINKS: SocialLinkItem[] = [
  { label: 'X / Twitter', url: 'https://www.twitter.com/otenkigirl_exe' },
  { label: 'Bluesky', url: 'https://bsky.app/profile/otenkigirlexe.bsky.social' },
  { label: 'Instagram', url: 'https://www.instagram.com/otenkigirl_exe/' },
  { label: 'Mastodon', url: 'https://mstdn.jp/@otenkigirl_exe' },
  { label: 'GitHub', url: 'https://github.com/otenkigirlexe' },
];

export default function HeaderEditorPage() {
  const isLocal = process.env.NEXT_PUBLIC_IS_LOCAL_BUILD === 'true';
  const API_BASE = 'http://127.0.0.1:3001';

  const [headerCaption, setHeaderCaption] = useState('2024年6月27日、ファンミ後の新幹線。');
  const [profileName, setProfileName] = useState('ひよこニキ');
  const [profileHandle, setProfileHandle] = useState('@otenkigirl_exe');
  const [bio, setBio] = useState(
    '新海誠監督作品とラブライブ！シリーズが好きです。\n天気の子とラブライブ！スーパースター！！が特に好き。'
  );
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>(DEFAULT_LINKS);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!isLocal) return;
    fetch(`${API_BASE}/api/site`)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.headerCaption === 'string') {
          setHeaderCaption(data.headerCaption);
        }
        if (data && typeof data.profileName === 'string' && data.profileName.trim()) {
          setProfileName(data.profileName);
        }
        if (data && typeof data.profileHandle === 'string') {
          setProfileHandle(data.profileHandle);
        }
        if (data && typeof data.bio === 'string') {
          setBio(data.bio);
        }
        if (data && Array.isArray(data.socialLinks)) {
          setSocialLinks(data.socialLinks);
        }
      })
      .catch(err => {
        setStatusMsg(`設定の読み込みエラー: ${err.message}`);
      });
  }, [isLocal]);

  // 選択した画像ファイルのローカルプレビューURL管理
  useEffect(() => {
    if (!selectedFile) {
      setPreviewObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setStatusMsg(`選択中: "${files[0].name}"（「変更を確定して保存する」を押すと header.webp に反映されます）`);
    } else {
      setSelectedFile(null);
    }
  };

  const handleLinkChange = (index: number, field: 'label' | 'url', value: string) => {
    setSocialLinks(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddLink = () => {
    setSocialLinks(prev => [...prev, { label: '', url: '' }]);
  };

  const handleRemoveLink = (index: number) => {
    setSocialLinks(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveLink = (index: number, direction: -1 | 1) => {
    setSocialLinks(prev => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg('保存処理を実行中...');
    try {
      const cleanedLinks = socialLinks
        .map(item => ({ label: item.label.trim(), url: item.url.trim() }))
        .filter(item => item.label !== '' && item.url !== '');

      const formData = new FormData();
      formData.append('headerCaption', headerCaption.trim());
      formData.append('profileName', profileName.trim() || 'ひよこニキ');
      formData.append('profileHandle', profileHandle.trim());
      formData.append('bio', bio);
      formData.append('socialLinks', JSON.stringify(cleanedLinks));
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await fetch(`${API_BASE}/api/site/header`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setSelectedFile(null);
        if (Array.isArray(result.socialLinks)) {
          setSocialLinks(result.socialLinks);
        }
        setCacheBuster(Date.now());
        setStatusMsg(
          result.imageUpdated
            ? '保存完了：既存の header.webp を削除し、新しい画像を header.webp として保存＆プロフィール設定を更新しました！'
            : '保存完了：ヘッダー説明文・プロフィール（Bio）・各種リンクを更新しました！'
        );
      } else {
        const errMsg = result.error || '不明なエラー';
        setStatusMsg(`保存エラー: ${errMsg}`);
        alert(`保存エラー: ${errMsg}`);
      }
    } catch (err: any) {
      setStatusMsg(`通信エラー: ${err.message}`);
      alert(`通信エラー: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isLocal) {
    return (
      <div className="article-container" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <h2>このページはローカル開発環境専用です。</h2>
        <p style={{ color: 'var(--text-secondary)' }}>本番公開環境ではヘッダー編集機能は無効化されています。</p>
        <Link href="/" className="article-back-link" style={{ marginTop: '16px' }}>
          &larr; 記事一覧へ戻る
        </Link>
      </div>
    );
  }

  const displayImageSrc = previewObjectUrl || `/header.webp?t=${cacheBuster}`;
  const previewLinks = socialLinks.filter(item => item.label.trim() !== '');

  return (
    <div style={{ maxWidth: '1080px', width: '100%', margin: '0 auto', padding: '32px 24px 60px 24px', flex: 1 }}>
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '14px',
          }}
        >
          <Link href="/" className="article-back-link" style={{ marginBottom: 0 }}>
            &larr; ホームへ戻る
          </Link>
          <Link href="/editor/" className="article-back-link" style={{ marginBottom: 0 }}>
            ✏️ 記事エディターへ移動 &rarr;
          </Link>
        </div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
          ヘッダー・プロフィール情報の編集 (Header Editor)
        </h1>
      </div>

      <div className="header-editor-grid">
        {/* 左側：編集フォーム */}
        <section className="card-frame" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          {/* 1. ヘッダー画像の選択 */}
          <div>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '1.05rem', fontWeight: 700 }}>
              1. ヘッダー画像の選択（任意）
            </h2>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              新しい画像を選択して確定すると、一時ファイルへ書き込み完了後に既存の <code>public/header.webp</code> を削除し、選択した画像を <code>public/header.webp</code> にリネームして置き換えます。
            </p>

            <div
              style={{
                padding: '14px',
                background: 'var(--bg-secondary)',
                border: '1px dashed var(--border-light)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={saving}
                style={{ fontSize: '0.86rem' }}
              />
              {selectedFile && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--accent-hover)', fontWeight: 600 }}>
                    選択中: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-light)',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    選択解除
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. ヘッダー画像の説明文 */}
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 700 }}>
              2. ヘッダー画像の説明文（キャプション）
            </h2>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              ホーム画面左ボックスの <code>header.webp</code> 直下に表示される説明文です。
            </p>
            <input
              type="text"
              value={headerCaption}
              onChange={e => setHeaderCaption(e.target.value)}
              placeholder="例: 2024年6月27日、ファンミ後の新幹線。"
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.92rem',
              }}
            />
          </div>

          {/* 3. プロフィール名・ID・説明書き（Bio） */}
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 700 }}>
              3. プロフィール情報（名前・ID・自己紹介文）
            </h2>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              アイコン横に表示される表示名・サブテキスト（ID）と、自己紹介文（Bio）を編集できます。
            </p>
            <div className="header-editor-profile-row">
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  表示名
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="ひよこニキ"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  ID・サブ表記
                </label>
                <input
                  type="text"
                  value={profileHandle}
                  onChange={e => setProfileHandle(e.target.value)}
                  placeholder="@otenkigirl_exe"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              説明書き（Bio・改行もそのまま反映されます）
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              placeholder="自己紹介文を入力..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                lineHeight: 1.55,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          {/* 4. 各種リンク（SNS・外部リンク）の追加・削除・編集 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                4. 各種リンクの編集・追加・削除
              </h2>
              <button
                type="button"
                onClick={handleAddLink}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + リンクを追加
              </button>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              プロフィール下部に表示されるリンクボタン（チップ）を自由に追加・並び替え・削除できます。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {socialLinks.map((link, index) => (
                <div
                  key={index}
                  className="header-editor-link-row"
                >
                  <input
                    type="text"
                    value={link.label}
                    onChange={e => handleLinkChange(index, 'label', e.target.value)}
                    placeholder="表示名 (例: X / Twitter)"
                    style={{
                      width: '100%',
                      padding: '6px 9px',
                      border: '1px solid var(--border-light)',
                      borderRadius: '4px',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                      minWidth: 0,
                    }}
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={e => handleLinkChange(index, 'url', e.target.value)}
                    placeholder="URL (例: https://...)"
                    style={{
                      width: '100%',
                      padding: '6px 9px',
                      border: '1px solid var(--border-light)',
                      borderRadius: '4px',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                      minWidth: 0,
                    }}
                  />
                  <div className="header-editor-link-actions" style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleMoveLink(index, -1)}
                      disabled={index === 0}
                      title="上へ移動"
                      style={{
                        padding: '4px 7px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '4px',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        opacity: index === 0 ? 0.4 : 1,
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveLink(index, 1)}
                      disabled={index === socialLinks.length - 1}
                      title="下へ移動"
                      style={{
                        padding: '4px 7px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '4px',
                        cursor: index === socialLinks.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: index === socialLinks.length - 1 ? 0.4 : 1,
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(index)}
                      title="このリンクを削除"
                      style={{
                        padding: '4px 8px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        color: '#dc2626',
                        fontWeight: 600,
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
              {socialLinks.length === 0 && (
                <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', padding: '8px 0' }}>
                  リンクが登録されていません。「+ リンクを追加」から追加できます。
                </div>
              )}
            </div>
          </div>

          {/* 保存ボタン */}
          <div style={{ paddingTop: '6px', borderTop: '1px solid var(--border-light)' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                background: 'var(--accent)',
                color: '#000',
                border: 'none',
                padding: '10px 24px',
                borderRadius: 'var(--radius-sm)',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                fontSize: '0.92rem',
                boxShadow: 'var(--shadow-sm)',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? '保存中...' : '変更を確定して保存する'}
            </button>

            {statusMsg && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '12px 14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                }}
              >
                {statusMsg}
              </div>
            )}
          </div>
        </section>

        {/* 右側：ホーム画面の左ボックスと完全同一のリアルタイムプレビュー */}
        <aside className="header-editor-preview">
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px' }}>
            ホーム画面での表示プレビュー（幅 400px・アスペクト比維持）
          </div>
          <div className="card-frame">
            <div className="intro-image-wrap">
              <img
                src={displayImageSrc}
                alt={headerCaption}
                className="aspect-preserved-image"
              />
            </div>
            <div className="intro-body">
              <p className="intro-caption">{headerCaption || '（説明文未入力）'}</p>

              <hr className="intro-divider" />

              <div className="profile-header">
                <img src="/icon.webp" alt={profileName || 'ひよこニキ'} className="profile-avatar" />
                <div>
                  <h2 className="intro-title">{profileName || 'ひよこニキ'}</h2>
                  {profileHandle && <p className="profile-sub">{profileHandle}</p>}
                </div>
              </div>

              <p className="profile-bio">
                {bio || '（自己紹介文未入力）'}
              </p>

              <div className="social-chips">
                {previewLinks.map((link, idx) => (
                  <a
                    key={`${link.label}-${idx}`}
                    href={link.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-chip"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
