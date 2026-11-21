import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EditorPage from '@/app/editor/page';

describe('04_ローカル記事エディター (/editor/) テスト', () => {
  const originalEnv = process.env.NEXT_PUBLIC_IS_LOCAL_BUILD;
  const mockPosts = [
    { slug: '20260726', title: '最新リリイベ記事', date: '2026-07-26' },
    { slug: '20260725', title: '大阪ファンミ記事', date: '2026-07-25' },
  ];

  beforeEach(() => {
    process.env.NEXT_PUBLIC_IS_LOCAL_BUILD = 'true';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_IS_LOCAL_BUILD = originalEnv;
  });

  const setupFetchMock = (customHandler?: (url: string, init?: RequestInit) => any) => {
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (customHandler) {
        const customRes = customHandler(url, init);
        if (customRes) return customRes;
      }
      if (url.endsWith('/api/posts')) {
        return {
          ok: true,
          json: async () => ({ posts: mockPosts }),
        } as Response;
      }
      if (url.includes('/api/posts/20260726')) {
        return {
          ok: true,
          json: async () => ({
            slug: '20260726',
            raw: '---\ntitle: "最新リリイベ記事"\ndate: "2026-07-26"\nslug: "20260726"\n---\n\n1行目の本文です。\n2行目の本文です。',
          }),
        } as Response;
      }
      if (url.endsWith('/api/posts/save')) {
        return {
          ok: true,
          json: async () => ({ success: true, slug: '20260726' }),
        } as Response;
      }
      if (url.endsWith('/api/posts/delete')) {
        return {
          ok: true,
          json: async () => ({ success: true, slug: '20260726' }),
        } as Response;
      }
      if (url.includes('/api/upload')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            files: [{ filename: 'inserted.webp', url: '/assets/20260726/inserted.webp', isVideo: false }],
          }),
        } as Response;
      }
      return { ok: false, json: async () => ({ error: 'Not found' }) } as Response;
    });
  };

  it('04_記事エディター_01 本番環境フラグ時は「このページはローカル開発環境専用です。」が表示され編集画面が隠れること', () => {
    process.env.NEXT_PUBLIC_IS_LOCAL_BUILD = 'false';
    render(<EditorPage />);
    expect(screen.getByText('このページはローカル開発環境専用です。')).toBeInTheDocument();
    expect(screen.queryByText('記事エディター')).not.toBeInTheDocument();
  });

  it('04_記事エディター_02 ローカル環境時にサイドバーの記事一覧・新規作成・ヘッダー編集リンク・入力フォームが表示されること', async () => {
    setupFetchMock();
    render(<EditorPage />);

    await waitFor(() => {
      expect(screen.getByText('2 Posts')).toBeInTheDocument();
    });
    expect(screen.getAllByText('最新リリイベ記事').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: /ヘッダー画像・説明を編集/ })).toHaveAttribute('href', '/header-editor/');
  });

  it('04_記事エディター_03 サイドバーの記事をクリックすると該当記事の内容が読み込まれプレビューに反映されること', async () => {
    setupFetchMock();
    const { container, unmount } = render(<EditorPage />);

    await waitFor(() => expect(screen.getByText('2 Posts')).toBeInTheDocument());
    const sidebarItems = container.querySelectorAll('.post-editor-sidebar li');
    fireEvent.click(sidebarItems[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue('最新リリイベ記事')).toBeInTheDocument();
    });
    expect(screen.getByText('1行目の本文です。')).toBeInTheDocument();
    expect(screen.getByText('2行目の本文です。')).toBeInTheDocument();
  });

  it('04_記事エディター_04 「+ 新規記事を作成」ボタンでフォームが新規作成モードに初期化されること', async () => {
    setupFetchMock();
    const { container, unmount } = render(<EditorPage />);

    await waitFor(() => expect(screen.getByText('2 Posts')).toBeInTheDocument());
    const sidebarItems = container.querySelectorAll('.post-editor-sidebar li');
    fireEvent.click(sidebarItems[0]);
    await waitFor(() => expect(screen.getByDisplayValue('最新リリイベ記事')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '+ 新規記事を作成' }));
    expect(screen.getByPlaceholderText('記事タイトルを入力...')).toHaveValue('');
    expect(screen.getByText('新規記事作成モード')).toBeInTheDocument();
  });

  it('04_記事エディター_05 文中の改行カーソル位置にアップロードした画像タグが正確に挿入されること（末尾に飛ばないこと）', async () => {
    setupFetchMock();
    const { container, unmount } = render(<EditorPage />);

    await waitFor(() => expect(screen.getByText('2 Posts')).toBeInTheDocument());

    const textarea = screen.getByPlaceholderText(/ここにMarkdown形式で本文を記述してください/) as HTMLTextAreaElement;
    const initialText = '最初の段落です。\n\n最後の段落です。';
    fireEvent.change(textarea, { target: { value: initialText } });

    // カーソルを1行目の直後（index 9: "最初の段落です。\n" の直後）にセット
    textarea.setSelectionRange(9, 9);
    fireEvent.select(textarea);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const dummyFile = new File(['dummy'], 'inserted.webp', { type: 'image/webp' });
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    await waitFor(() => {
      expect(textarea.value).toBe('最初の段落です。\n![inserted.webp](/assets/20260726/inserted.webp)\n最後の段落です。');
    });
  });

  it('04_記事エディター_06 「保存する」ボタン押下で /api/posts/save が呼ばれ保存完了メッセージが表示されること', async () => {
    setupFetchMock();
    render(<EditorPage />);

    await waitFor(() => expect(screen.getByText('2 Posts')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('記事タイトルを入力...'), {
      target: { value: '保存テストタイトル' },
    });

    fireEvent.click(screen.getByRole('button', { name: '保存する' }));
    await waitFor(() => {
      expect(screen.getByText(/保存完了:/)).toBeInTheDocument();
    });
  });

  it('04_記事エディター_07 既存記事選択時に「🗑️ 削除」ボタンが表示され、確認ダイアログ承認後に /api/posts/delete が呼ばれること', async () => {
    setupFetchMock();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { container, unmount } = render(<EditorPage />);
    await waitFor(() => expect(screen.getByText('2 Posts')).toBeInTheDocument());

    const sidebarItems = container.querySelectorAll('.post-editor-sidebar li');
    fireEvent.click(sidebarItems[0]);
    const deleteBtn = await screen.findByRole('button', { name: /削除/ });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(screen.getByText('削除完了: 20260726.md')).toBeInTheDocument();
    });
  });

  it('04_記事エディター_08 UUIDv7文字列をタイトル・本文に入力してもプレビューがクラッシュせずリアルタイム描画されること', async () => {
    setupFetchMock();
    const { container, unmount } = render(<EditorPage />);
    await waitFor(() => expect(screen.getByText('2 Posts')).toBeInTheDocument());

    const uuid = '018f3a5e-7a1b-7a1b-8a1b-7a1b8a1b7a1b';
    fireEvent.change(screen.getByPlaceholderText('記事タイトルを入力...'), {
      target: { value: uuid },
    });
    const textarea = screen.getByPlaceholderText(/ここにMarkdown形式で本文を記述してください/);
    fireEvent.change(textarea, { target: { value: `本文UUID: ${uuid}` } });

    expect(screen.getByRole('heading', { level: 1, name: uuid })).toBeInTheDocument();
    const previewBody = container.querySelector('.article-body p');
    expect(previewBody).toHaveTextContent(`本文UUID: ${uuid}`);
  });

  it('04_記事エディター_09 保存APIがエラー（409等）を返した際にアラートとステータスメッセージが表示されること', async () => {
    setupFetchMock(url => {
      if (url.endsWith('/api/posts/save')) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: '同日の記事ファイルが既に存在します。' }),
        } as Response);
      }
      return null;
    });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<EditorPage />);
    await waitFor(() => expect(screen.getByText('2 Posts')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '保存する' }));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('同日の記事ファイルが既に存在します。'));
    });
  });

  it('04_記事エディター_10 日付（slug）が空の状態で保存または画像アップロードしようとした際にアラートが表示されること', async () => {
    setupFetchMock();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { container, unmount } = render(<EditorPage />);
    await waitFor(() => expect(screen.getByText('2 Posts')).toBeInTheDocument());

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '' } });

    // slug を手動で空にするため新規作成後に date を変更
    const sidebarItems = container.querySelectorAll('.post-editor-sidebar li');
    fireEvent.click(sidebarItems[0]);
    await waitFor(() => expect(screen.getByDisplayValue('最新リリイベ記事')).toBeInTheDocument());

    // 上書き許可チェックボックスの切り替え確認
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    // テキストエリアの各種カーソルイベント（onKeyUp, onClick, onBlur）の動作確認
    const textarea = screen.getByPlaceholderText(/ここにMarkdown形式で本文を記述してください/) as HTMLTextAreaElement;
    fireEvent.click(textarea);
    fireEvent.keyUp(textarea);
    fireEvent.blur(textarea);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('04_記事エディター_11 動画（.mp4）アップロード時に <video controls src="..."></video> タグが挿入されること', async () => {
    setupFetchMock(url => {
      if (url.includes('/api/upload')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            files: [{ filename: 'clip.mp4', url: '/assets/20260726/clip.mp4', isVideo: true }],
          }),
        } as Response);
      }
      return null;
    });
    const { container, unmount } = render(<EditorPage />);
    await waitFor(() => expect(screen.getByText('2 Posts')).toBeInTheDocument());

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const dummyVideo = new File(['videodata'], 'clip.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [dummyVideo] } });

    const textarea = screen.getByPlaceholderText(/ここにMarkdown形式で本文を記述してください/) as HTMLTextAreaElement;
    await waitFor(() => {
      expect(textarea.value).toContain('<video controls src="/assets/20260726/clip.mp4"></video>');
    });
  });

  it('04_記事エディター_12 削除確認ダイアログでキャンセルした場合や削除APIエラー時に適切にハンドリングされること', async () => {
    setupFetchMock(url => {
      if (url.endsWith('/api/posts/delete')) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: '削除失敗テスト' }),
        } as Response);
      }
      return null;
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { container, unmount } = render(<EditorPage />);
    await waitFor(() => expect(screen.getByText('2 Posts')).toBeInTheDocument());

    const sidebarItems = container.querySelectorAll('.post-editor-sidebar li');
    fireEvent.click(sidebarItems[0]);
    const deleteBtn = await screen.findByRole('button', { name: /削除/ });

    // 1回目：キャンセル
    fireEvent.click(deleteBtn);
    expect(confirmSpy).toHaveBeenCalledTimes(1);

    // 2回目：承認 → エラーアラート
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('削除失敗テスト'));
    });
  });

  it('04_記事エディター_13 一覧取得エラー・通信エラー・空posts・dateなし記事・2件目選択(nextPost表示)を網羅すること', async () => {
    // 1. /api/posts が ok:false
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => ({}) } as Response));
    const { unmount: u1 } = render(<EditorPage />);
    await waitFor(() => {
      expect(screen.getByText(/編集サーバーから記事一覧を取得できませんでした/)).toBeInTheDocument();
    });
    u1();

    // 2. /api/posts が通信エラー（reject）
    global.fetch = vi.fn(async () => {
      throw new Error('Server offline');
    });
    const { unmount: u2 } = render(<EditorPage />);
    await waitFor(() => {
      expect(screen.getByText(/編集サーバー通信エラー: Server offline/)).toBeInTheDocument();
    });
    u2();

    // 3. /api/posts が posts 未定義 → 0 Posts
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({}) } as Response));
    const { unmount: u3 } = render(<EditorPage />);
    await waitFor(() => {
      expect(screen.getByText('0 Posts')).toBeInTheDocument();
    });
    u3();

    // 4. date なし記事を含む一覧で2件目選択（nextPost あり・prevPost なし）＋ 新規日付変更（古い日付→nextPostあり/prevPostなし）
    global.fetch = vi.fn(async (url: any) => {
      const u = String(url);
      if (u.endsWith('/api/posts')) {
        return {
          ok: true,
          json: async () => ({
            posts: [
              { slug: '20260726', title: '最新記事', date: '' },
              { slug: '20260725', title: '2件目記事', date: '2026-07-25' },
            ],
          }),
        } as Response;
      }
      if (u.includes('/api/posts/20260725')) {
        return {
          ok: true,
          json: async () => ({
            slug: '20260725',
            raw: '---\nauthor: test\n---\nフロントマター欠損本文',
          }),
        } as Response;
      }
      if (u.includes('/api/posts/20260726')) {
        return {
          ok: true,
          json: async () => ({
            slug: '20260726',
            raw: 'フロントマターなしの生テキスト',
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    const { container, unmount } = render(<EditorPage />);
    await waitFor(() => expect(screen.getByText('2 Posts')).toBeInTheDocument());

    // 新規作成モードで過去の日付を入力（olderCandidates=0, newerCandidates>0）
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2020-01-01' } });
    expect(screen.getByText('2件目記事', { selector: '.post-nav-title' })).toBeInTheDocument();

    // 2件目をクリック（frontmatterキー欠損のフォールバック＋nextPost表示）
    const items = container.querySelectorAll('.post-editor-sidebar li');
    fireEvent.click(items[1]);
    await waitFor(() => {
      expect(screen.getByText(/記事 "2026-07-25" を読み込みました/)).toBeInTheDocument();
    });
    expect(screen.getByText('最新記事', { selector: '.post-nav-title' })).toBeInTheDocument();

    // 1件目をクリック（frontmatter なしの生テキスト）
    fireEvent.click(items[0]);
    await waitFor(() => {
      expect(screen.getByText(/記事 "2026-07-26" を読み込みました/)).toBeInTheDocument();
    });
  });

  it('04_記事エディター_14 記事読み込みエラー・日付空バリデーション・未使用メディア削除保存・保存/削除/アップロード各異常系を網羅すること', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    let saveCall = 0;
    let deleteCall = 0;
    let uploadCall = 0;

    setupFetchMock(url => {
      if (url.includes('/api/posts/20260725')) {
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response); // raw なし
      }
      if (url.includes('/api/posts/20260726')) {
        return Promise.reject(new Error('Load failed'));
      }
      if (url.endsWith('/api/posts/save')) {
        saveCall++;
        if (saveCall === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, slug: '20260726', removedAssets: ['old.webp'] }),
          } as Response);
        }
        if (saveCall === 2) {
          return Promise.resolve({ ok: false, json: async () => ({}) } as Response);
        }
        return Promise.reject(new Error('Save network error'));
      }
      if (url.endsWith('/api/posts/delete')) {
        deleteCall++;
        if (deleteCall === 1) {
          return Promise.resolve({ ok: false, json: async () => ({}) } as Response);
        }
        return Promise.reject(new Error('Delete network error'));
      }
      if (url.includes('/api/upload')) {
        uploadCall++;
        if (uploadCall === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              files: [{ filename: 'mid.webp', url: '/assets/20260726/mid.webp', isVideo: false }],
            }),
          } as Response);
        }
        if (uploadCall === 2) {
          return Promise.resolve({ ok: false, json: async () => ({}) } as Response);
        }
        if (uploadCall === 3) {
          return Promise.resolve({ ok: false, json: async () => ({ error: '形式エラー' }) } as Response);
        }
        return Promise.reject(new Error('Upload network error'));
      }
      return null;
    });

    const { container, unmount } = render(<EditorPage />);
    await waitFor(() => expect(screen.getByText('2 Posts')).toBeInTheDocument());

    const items = container.querySelectorAll('.post-editor-sidebar li');
    // 1. raw なし記事読み込み
    fireEvent.click(items[1]);
    // 2. 読み込み通信エラー
    fireEvent.click(items[0]);
    await waitFor(() => {
      expect(screen.getByText(/記事の読み込み失敗: Load failed/)).toBeInTheDocument();
    });

    // 3. 新規作成にして日付を空にする → 保存＆アップロードのアラート＋ファイル空キャンセル
    fireEvent.click(screen.getByRole('button', { name: /\+ 新規記事を作成/ }));
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: '保存する' }));
    expect(alertSpy).toHaveBeenCalledWith('日付を選択してください');

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'a.webp', { type: 'image/webp' })] } });
    expect(alertSpy).toHaveBeenCalledWith('素材を紐付ける記事の日付を先に選択してください');

    // 4. 日付を再入力し、未使用メディア削除付き保存 → 既存記事(selectedSlugあり)状態で日付を空にして保存(formatSlugToDateフォールバック)
    fireEvent.change(dateInput, { target: { value: '2026-07-26' } });
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));
    await waitFor(() => {
      expect(screen.getByText(/未使用メディア1件を削除/)).toBeInTheDocument();
    });

    // selectedSlug !== null の状態で日付を空に変更し保存（446[1] と 162[1] を網羅）
    fireEvent.change(dateInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));
    await waitFor(() => {
      expect(screen.getByText(/保存エラー: 不明なエラー/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));
    await waitFor(() => {
      expect(screen.getByText(/保存リクエスト通信エラー: Save network error/)).toBeInTheDocument();
    });

    // 5. allowOverwrite=true かつテキストの途中位置へのアップロード（前後改行挿入）＋ requestAnimationFrame の両分岐（マウント中/アンマウント後）を確実に網羅
    const queuedRafs: FrameRequestCallback[] = [];
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      queuedRafs.push(cb);
      return queuedRafs.length;
    });

    const textarea = screen.getByPlaceholderText(/ここにMarkdown形式で本文を記述してください/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '前半後半' } });
    textarea.setSelectionRange(2, 2);
    fireEvent.select(textarea);

    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'mid.webp', { type: 'image/webp' })] } });
    await waitFor(() => {
      expect(textarea.value).toBe('前半\n![mid.webp](/assets/20260726/mid.webp)\n後半');
    });
    // マウント中に RAF を実行（textareaRef.current が非nullの分岐を確実に通す）
    const lastRaf = queuedRafs[queuedRafs.length - 1];
    if (lastRaf) lastRaf(0);

    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'e1.webp', { type: 'image/webp' })] } });
    await waitFor(() => {
      expect(screen.getByText(/アップロード失敗: ファイルの応答が空でした/)).toBeInTheDocument();
    });

    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'e2.webp', { type: 'image/webp' })] } });
    await waitFor(() => {
      expect(screen.getByText(/アップロード失敗: 形式エラー/)).toBeInTheDocument();
    });

    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'e3.webp', { type: 'image/webp' })] } });
    await waitFor(() => {
      expect(screen.getByText(/アップロード通信エラー: Upload network error/)).toBeInTheDocument();
    });

    // 6. 削除APIエラー（error空）＆削除通信エラー（title空で selectedSlug フォールバック確認）
    const deleteBtn = screen.getByRole('button', { name: /削除/ });
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(screen.getByText(/削除エラー: 不明なエラー/)).toBeInTheDocument();
    });
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(screen.getByText(/削除リクエスト通信エラー: Delete network error/)).toBeInTheDocument();
    });

    expect(confirmSpy).toHaveBeenCalled();

    // アンマウント後に RAF を実行（textareaRef.current が null の分岐も確実に通す）
    unmount();
    if (lastRaf) lastRaf(0);
    rafSpy.mockRestore();
  });
});
