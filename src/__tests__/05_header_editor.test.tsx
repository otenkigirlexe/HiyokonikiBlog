import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import HeaderEditorPage from '@/app/header-editor/page';

describe('05_ヘッダー＆プロフィール編集 (/header-editor/) テスト', () => {
  const originalEnv = process.env.NEXT_PUBLIC_IS_LOCAL_BUILD;

  const mockSiteData = {
    headerCaption: '2024年6月27日、ファンミ後の新幹線。',
    profileName: 'ひよこニキ',
    profileHandle: '@otenkigirl_exe',
    bio: '新海誠監督作品とラブライブ！シリーズが好きです。\n天気の子とラブライブ！スーパースター！！が特に好き。',
    socialLinks: [
      { label: 'X / Twitter', url: 'https://www.twitter.com/otenkigirl_exe' },
      { label: 'Bluesky', url: 'https://bsky.app/profile/otenkigirlexe.bsky.social' },
    ],
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_IS_LOCAL_BUILD = 'true';
    vi.restoreAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost:3000/mock-preview');
    global.URL.revokeObjectURL = vi.fn();

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/site') && (!init || init.method !== 'POST')) {
        return {
          ok: true,
          json: async () => mockSiteData,
        } as Response;
      }
      if (url.endsWith('/api/site/header') && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            ...mockSiteData,
            imageUpdated: true,
          }),
        } as Response;
      }
      return { ok: false, json: async () => ({ error: 'Error' }) } as Response;
    });
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_IS_LOCAL_BUILD = originalEnv;
  });

  it('05_ヘッダーエディター_01 本番環境フラグ時は「このページはローカル開発環境専用です。」が表示されること', () => {
    process.env.NEXT_PUBLIC_IS_LOCAL_BUILD = 'false';
    render(<HeaderEditorPage />);
    expect(screen.getByText('このページはローカル開発環境専用です。')).toBeInTheDocument();
  });

  it('05_ヘッダーエディター_02 ローカル環境時に /api/site の設定値がフォームと右プレビューに初期反映されること', async () => {
    render(<HeaderEditorPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2024年6月27日、ファンミ後の新幹線。')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('ひよこニキ')).toBeInTheDocument();
    expect(screen.getByDisplayValue('@otenkigirl_exe')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'ひよこニキ' })).toBeInTheDocument();
  });

  it('05_ヘッダーエディター_03 上部に「← ホームへ戻る」と「✏️ 記事エディターへ移動 →」ボタンが並び正しい遷移先を持つこと', async () => {
    render(<HeaderEditorPage />);
    await waitFor(() => expect(screen.getByDisplayValue('ひよこニキ')).toBeInTheDocument());
    const homeBtn = screen.getByRole('link', { name: /ホームへ戻る/ });
    const editorBtn = screen.getByRole('link', { name: /記事エディターへ移動/ });

    expect(homeBtn).toHaveAttribute('href', '/');
    expect(editorBtn).toHaveAttribute('href', '/editor/');
    expect(homeBtn).toHaveClass('article-back-link');
    expect(editorBtn).toHaveClass('article-back-link');
  });

  it('05_ヘッダーエディター_04 キャプション・表示名・ID・Bioを編集すると右側プレビューがリアルタイム更新されること', async () => {
    render(<HeaderEditorPage />);
    await waitFor(() => expect(screen.getByDisplayValue('ひよこニキ')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('ひよこニキ'), {
      target: { value: '新ひよこニキ' },
    });
    fireEvent.change(screen.getByPlaceholderText('@otenkigirl_exe'), {
      target: { value: '@new_handle' },
    });
    fireEvent.change(screen.getByPlaceholderText('自己紹介文を入力...'), {
      target: { value: '新しいBioテキストです。' },
    });

    expect(screen.getByRole('heading', { level: 2, name: '新ひよこニキ' })).toBeInTheDocument();
    expect(screen.getByText('@new_handle')).toBeInTheDocument();
    expect(screen.getAllByText('新しいBioテキストです。').length).toBeGreaterThanOrEqual(1);
  });

  it('05_ヘッダーエディター_05 「+ リンクを追加」で新しいリンク行を追加し入力するとプレビューにチップが追加されること', async () => {
    render(<HeaderEditorPage />);
    await waitFor(() => expect(screen.getByDisplayValue('X / Twitter')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '+ リンクを追加' }));
    const labelInputs = screen.getAllByPlaceholderText('表示名 (例: X / Twitter)');
    const urlInputs = screen.getAllByPlaceholderText('URL (例: https://...)');

    fireEvent.change(labelInputs[labelInputs.length - 1], { target: { value: 'YouTube' } });
    fireEvent.change(urlInputs[urlInputs.length - 1], { target: { value: 'https://youtube.com' } });

    const chipLink = screen.getByRole('link', { name: 'YouTube' });
    expect(chipLink).toHaveAttribute('href', 'https://youtube.com');
  });

  it('05_ヘッダーエディター_06 リンクの「↑」「↓」ボタンで順序が入れ替わり、「削除」ボタンでリンクが削除されること', async () => {
    const { container } = render(<HeaderEditorPage />);
    await waitFor(() => expect(screen.getByDisplayValue('X / Twitter')).toBeInTheDocument());

    // 1番目の「↓」ボタンを押して X / Twitter と Bluesky を入れ替える
    const downBtns = screen.getAllByTitle('下へ移動');
    fireEvent.click(downBtns[0]);

    const chipsAfterMove = container.querySelectorAll('.social-chips a.social-chip');
    expect(chipsAfterMove[0]).toHaveTextContent('Bluesky');
    expect(chipsAfterMove[1]).toHaveTextContent('X / Twitter');

    // 1番目を削除
    const deleteBtns = screen.getAllByTitle('このリンクを削除');
    fireEvent.click(deleteBtns[0]);

    const chipsAfterDelete = container.querySelectorAll('.social-chips a.social-chip');
    expect(chipsAfterDelete.length).toBe(1);
    expect(chipsAfterDelete[0]).toHaveTextContent('X / Twitter');
  });

  it('05_ヘッダーエディター_07 画像ファイル選択時に createObjectURL でプレビュー画像が切り替わり、「選択解除」で元に戻ること', async () => {
    const { container } = render(<HeaderEditorPage />);
    await waitFor(() => expect(screen.getByDisplayValue('ひよこニキ')).toBeInTheDocument());
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const dummyImg = new File(['imgdata'], 'new_header.webp', { type: 'image/webp' });

    fireEvent.change(fileInput, { target: { files: [dummyImg] } });
    expect(screen.getByText(/選択中: new_header\.webp/)).toBeInTheDocument();

    const previewImg = container.querySelector('.header-editor-preview .intro-image-wrap img') as HTMLImageElement;
    expect(previewImg.src).toContain('blob:http://localhost:3000/mock-preview');

    fireEvent.click(screen.getByRole('button', { name: '選択解除' }));
    expect(screen.queryByText(/選択中: new_header\.webp/)).not.toBeInTheDocument();
  });

  it('05_ヘッダーエディター_08 「変更を確定して保存する」押下で /api/site/header に送信され保存完了メッセージが表示されること', async () => {
    render(<HeaderEditorPage />);
    await waitFor(() => expect(screen.getByDisplayValue('ひよこニキ')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '変更を確定して保存する' }));
    await waitFor(() => {
      expect(screen.getByText(/保存完了：/)).toBeInTheDocument();
    });
  });

  it('05_ヘッダーエディター_09 保存APIエラー時および全リンク削除時（0件境界値）・UUIDv7入力時にクラッシュしないこと', async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/site') && (!init || init.method !== 'POST')) {
        return { ok: true, json: async () => ({ ...mockSiteData, socialLinks: [] }) } as Response;
      }
      return { ok: false, json: async () => ({ error: 'ヘッダー保存エラーテスト' }) } as Response;
    });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<HeaderEditorPage />);
    await waitFor(() => {
      expect(screen.getByText(/リンクが登録されていません/)).toBeInTheDocument();
    });

    const uuid = '018f3a5e-7a1b-7a1b-8a1b-7a1b8a1b7a1b';
    fireEvent.change(screen.getByPlaceholderText(/例: 2024年/), { target: { value: uuid } });
    expect(screen.getByText(uuid)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '変更を確定して保存する' }));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('ヘッダー保存エラーテスト'));
    });
  });

  it('05_ヘッダーエディター_10 初期設定取得API（/api/site）がネットワークエラーになった際にエラーメッセージが表示されクラッシュしないこと', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('Network disconnected');
    });
    render(<HeaderEditorPage />);
    await waitFor(() => {
      expect(screen.getByText(/設定の読み込みエラー: Network disconnected/)).toBeInTheDocument();
    });
  });
});
