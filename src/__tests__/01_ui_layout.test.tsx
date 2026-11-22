import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RootLayout, { metadata } from '@/app/layout';
import Home from '@/app/page';
import DevEditorLink from '@/app/components/DevEditorLink';
import FooterCreditsWithModal, { BuildInfoData } from '@/app/components/FooterCreditsWithModal';
import * as postsModule from '@/lib/posts';
import { getSiteConfig } from '@/lib/posts';

describe('01_UI・レイアウト・環境分岐テスト', () => {
  const originalEnv = process.env.NEXT_PUBLIC_IS_LOCAL_BUILD;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_IS_LOCAL_BUILD = 'true';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_IS_LOCAL_BUILD = originalEnv;
  });

  it('01_UI/ヘッダー_01 ヘッダーにサイトアイコンと「ひよこニキのホームページ」が表示され、ホーム（/）へのリンクになっていること', () => {
    render(
      <RootLayout>
        <div data-testid="child-content">Child</div>
      </RootLayout>
    );

    const brandText = screen.getByText('ひよこニキのホームページ');
    expect(brandText).toBeInTheDocument();

    const brandLink = brandText.closest('a');
    expect(brandLink).toHaveAttribute('href', '/');

    const iconImg = screen.getByAltText('ひよこニキのホームページ icon');
    expect(iconImg).toHaveAttribute('src', '/icon.webp');
  });

  it('01_UI/ヘッダー_02 ヘッダーナビゲーションに Home（/）と X / Twitter（外部リンク・target="_blank"）が表示されること', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toHaveAttribute('href', '/');

    const twitterLink = screen.getByRole('link', { name: 'X / Twitter' });
    expect(twitterLink).toHaveAttribute('href', 'https://www.twitter.com/otenkigirl_exe');
    expect(twitterLink).toHaveAttribute('target', '_blank');
  });

  it('01_UI/フッター_01 フッターに右寄せクラス（.footer-credits）で ver / build / コピーライトが1行表示されること', () => {
    const { container } = render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    const footerCredits = container.querySelector('.footer-credits');
    expect(footerCredits).toBeInTheDocument();
    expect(footerCredits?.textContent).toContain('ver: 0.0.5 / build: dev / © HiyokoNiki All Rights Reserved.');
  });

  it('01_UI/環境分岐_01 ローカルビルド時にフッターに記事エディターとヘッダーエディターの2つのリンクが表示されること', () => {
    process.env.NEXT_PUBLIC_IS_LOCAL_BUILD = 'true';
    render(<DevEditorLink />);

    const postEditorLink = screen.getByRole('link', { name: /記事を追加・編集する \(Local Editor\)/ });
    expect(postEditorLink).toHaveAttribute('href', '/editor/');

    const headerEditorLink = screen.getByRole('link', { name: /ヘッダー画像・説明を編集する \(Header Editor\)/ });
    expect(headerEditorLink).toHaveAttribute('href', '/header-editor/');
  });

  it('01_UI/環境分岐_02 本番ビルド時（NEXT_PUBLIC_IS_LOCAL_BUILD=false）に DevEditorLink が何も描画しないこと', () => {
    process.env.NEXT_PUBLIC_IS_LOCAL_BUILD = 'false';
    const { container } = render(<DevEditorLink />);
    expect(container.innerHTML).toBe('');
  });

  it('01_UI/メタデータ_01 RootLayoutのmetadataにタイトルとdescriptionが正しく設定されていること', () => {
    expect(metadata.title).toBe('ひよこニキのホームページ');
    expect(metadata.description).toBe('ひよこニキのホームページ');
    expect(metadata.metadataBase?.toString()).toBe('https://hiyokoniki.jp/');
  });

  it('01_UI/メタデータ_02 RootLayoutのmetadataにOpenGraph設定およびheader.webp画像が含まれていること', () => {
    const og = metadata.openGraph as any;
    expect(og).toBeDefined();
    expect(og.title).toBe('ひよこニキのホームページ');
    expect(og.siteName).toBe('ひよこニキのホームページ');
    expect(og.images?.[0]?.url).toBe('/header.webp');
  });

  it('01_UI/メタデータ_03 RootLayoutのmetadataにTwitter summary_large_image設定が含まれていること', () => {
    const tw = metadata.twitter as any;
    expect(tw).toBeDefined();
    expect(tw.card).toBe('summary_large_image');
    expect(tw.images).toContain('/header.webp');
  });

  it('01_UI/ホーム左カラム_01 Homeサーバーコンポーネントの左カラムにheader.webpとキャプションが表示されること', () => {
    const siteConfig = getSiteConfig();
    render(<Home />);

    const headerImg = screen.getByAltText(siteConfig.headerCaption);
    expect(headerImg).toHaveAttribute('src', '/header.webp');
    expect(screen.getByText(siteConfig.headerCaption)).toBeInTheDocument();
  });

  it('01_UI/ホーム左カラム_02 左カラムにプロフィール名（ひよこニキ）とID（@otenkigirl_exe）が表示されること', () => {
    const siteConfig = getSiteConfig();
    render(<Home />);

    expect(screen.getByRole('heading', { level: 1, name: siteConfig.profileName })).toBeInTheDocument();
    expect(screen.getByText(siteConfig.profileHandle)).toBeInTheDocument();
  });

  it('01_UI/ホーム左カラム_03 左カラムに自己紹介文（Bio）が表示されること', () => {
    const { container } = render(<Home />);
    const bioEl = container.querySelector('.profile-bio');
    expect(bioEl).toBeInTheDocument();
    expect(bioEl?.textContent).toContain('新海誠監督作品とラブライブ！シリーズが好きです。');
  });

  it('01_UI/ホーム左カラム_04 左カラムにsite.jsonで定義されたすべてのSNSリンクチップが正しいURLで表示されること', () => {
    const siteConfig = getSiteConfig();
    const { container } = render(<Home />);
    const chips = container.querySelectorAll('.social-chips a.social-chip');
    expect(chips.length).toBe(siteConfig.socialLinks.length);

    siteConfig.socialLinks.forEach((link, idx) => {
      expect(chips[idx]).toHaveTextContent(link.label);
      expect(chips[idx]).toHaveAttribute('href', link.url);
    });
  });

  it('01_UI/フッター_02 build番号（xxxxxxx / develop）の箇所を20回タップすると環境情報モーダルが表示されること', () => {
    render(<FooterCreditsWithModal />);

    const buildTriggerEl = screen.getByTestId('footer-build-trigger');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // コピーライト側のテキストを20回押しても開かないこと
    const copyrightText = screen.getByText(/© HiyokoNiki All Rights Reserved\./);
    for (let i = 0; i < 20; i++) {
      fireEvent.click(copyrightText);
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    for (let i = 0; i < 19; i++) {
      fireEvent.click(buildTriggerEl);
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // 20回目のタップでモーダル表示
    fireEvent.click(buildTriggerEl);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('環境情報')).toBeInTheDocument();
  });

  it('01_UI/環境情報_01 ビルド情報セクションに App / Version / Build / Commit / Environment / Build Date が表示されること', () => {
    render(<FooterCreditsWithModal />);
    const buildTriggerEl = screen.getByTestId('footer-build-trigger');
    for (let i = 0; i < 20; i++) fireEvent.click(buildTriggerEl);

    expect(screen.getByText('ビルド情報')).toBeInTheDocument();
    expect(screen.getByText('App:')).toBeInTheDocument();
    expect(screen.getByText('HiyokonikiBlog')).toBeInTheDocument();
    expect(screen.getByText('Version:')).toBeInTheDocument();
    expect(screen.getByText('0.0.5')).toBeInTheDocument();
    expect(screen.getByText('Build:')).toBeInTheDocument();
    expect(screen.getByText('Commit:')).toBeInTheDocument();
    expect(screen.getByText('Environment:')).toBeInTheDocument();
    expect(screen.getByText('Build Date:')).toBeInTheDocument();
  });

  it('01_UI/環境情報_02 テスト情報およびカバレッジ情報セクションに Status / Total / Passed / Lines / Statements 等が表示されること', () => {
    render(<FooterCreditsWithModal />);
    const buildTriggerEl = screen.getByTestId('footer-build-trigger');
    for (let i = 0; i < 20; i++) fireEvent.click(buildTriggerEl);

    expect(screen.getByText('テスト情報')).toBeInTheDocument();
    expect(screen.getByText('PASSED')).toBeInTheDocument();
    expect(screen.getByText('Success Rate:')).toBeInTheDocument();

    expect(screen.getByText('カバレッジ情報')).toBeInTheDocument();
    expect(screen.getByText('Lines:')).toBeInTheDocument();
    expect(screen.getByText('Functions:')).toBeInTheDocument();
    expect(screen.getByText('Branches:')).toBeInTheDocument();
    expect(screen.getByText('Statements:')).toBeInTheDocument();
  });

  it('01_UI/環境情報_03 コピーボタンで環境・テスト・カバレッジ情報がクリップボードにテキストコピーできること', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<FooterCreditsWithModal />);
    const buildTriggerEl = screen.getByTestId('footer-build-trigger');
    for (let i = 0; i < 20; i++) fireEvent.click(buildTriggerEl);

    const copyBtn = screen.getByRole('button', { name: 'コピー' });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain('HiyokonikiBlog\nVersion: 0.0.5');
    expect(copiedText).toContain('\n\nTests\nStatus: PASSED');
    expect(copiedText).toContain('\n\nCoverage\nLines:');
  });

  it('01_UI/環境情報_04 オーバーレイをタップしても勝手に閉じず、閉じるボタン押下時のみモーダルが閉じ背面スクロールロックが解除されること', () => {
    const { container } = render(<FooterCreditsWithModal />);
    const buildTriggerEl = screen.getByTestId('footer-build-trigger');
    for (let i = 0; i < 20; i++) fireEvent.click(buildTriggerEl);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    // 連打等でオーバーレイやビルド番号部分がクリックされても閉じないこと
    const overlay = container.querySelector('.env-modal-overlay')!;
    fireEvent.click(overlay);
    fireEvent.click(buildTriggerEl);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // モーダルコンテンツ内部クリックも伝播を止めて閉じないこと
    const modalContent = container.querySelector('.env-modal-content')!;
    fireEvent.click(modalContent);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // 「閉じる」ボタンを押したときのみ閉じ、body.style.overflow が解除されること
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('01_UI/環境情報_05 本番ビルド時（NEXT_PUBLIC_IS_LOCAL_BUILD=false）かつFAILEDステータス時にコミット番号と赤色ステータスが表示されること', () => {
    process.env.NEXT_PUBLIC_IS_LOCAL_BUILD = 'false';
    const failedInfo: BuildInfoData = {
      app: 'HiyokonikiBlog',
      version: '0.0.2',
      build: 'abc1234',
      commit: 'abc1234567890abcdef1234567890abcdef12345',
      environment: 'production',
      buildDate: '2026/11/22 03:00:00 JST',
      test: { status: 'FAILED', total: 10, passed: 9, failed: 1, skipped: 0, successRate: '90.0%' },
      coverage: { lines: '90.00%', functions: '90.00%', branches: '90.00%', statements: '90.00%' },
    };
    render(<FooterCreditsWithModal initialInfo={failedInfo} />);

    const buildTriggerEl = screen.getByTestId('footer-build-trigger');
    expect(buildTriggerEl).toHaveTextContent('abc1234');
    for (let i = 0; i < 20; i++) fireEvent.click(buildTriggerEl);

    expect(screen.getByText('production')).toBeInTheDocument();
    const failedEl = screen.getByText('FAILED');
    expect(failedEl).toBeInTheDocument();
  });

  it('01_UI/環境情報_06 clipboard API 失敗時・未定義時に execCommand フォールバックが動作し、フォールバック例外時もクラッシュしないこと', async () => {
    // 1. clipboard.writeText が reject するケース
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const { unmount } = render(<FooterCreditsWithModal />);
    const trigger1 = screen.getByTestId('footer-build-trigger');
    for (let i = 0; i < 20; i++) fireEvent.click(trigger1);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'コピー' }));
    });
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(screen.getByRole('button', { name: 'コピー完了' })).toBeInTheDocument();
    unmount();

    // 2. clipboard 未定義かつ execCommand が例外を投げるケース
    Object.assign(navigator, { clipboard: undefined });
    document.execCommand = vi.fn(() => {
      throw new Error('execCommand failed');
    });

    render(<FooterCreditsWithModal />);
    const trigger2 = screen.getByTestId('footer-build-trigger');
    for (let i = 0; i < 20; i++) fireEvent.click(trigger2);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'コピー' }));
    });
    expect(screen.getByRole('button', { name: 'コピー完了' })).toBeInTheDocument();
  });

  it('01_UI/ホーム境界値_01 記事が0件かつ profileHandle が空の場合でも Home がクラッシュせず描画されること', () => {
    vi.spyOn(postsModule, 'getAllPosts').mockReturnValueOnce([]);
    vi.spyOn(postsModule, 'getSiteConfig').mockReturnValueOnce({
      headerCaption: 'テストキャプション',
      profileName: 'ひよこニキ',
      profileHandle: '',
      bio: 'テストBio',
      socialLinks: [],
    });

    render(<Home />);
    expect(screen.queryByText('最新記事')).not.toBeInTheDocument();
    expect(screen.getByText('0 Posts')).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
