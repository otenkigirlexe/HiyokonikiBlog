import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Home from '@/app/page';
import PostList from '@/app/components/PostList';
import FeaturedPostCard from '@/app/components/FeaturedPostCard';
import { PostMeta } from '@/lib/posts';

const createMockPosts = (count: number): PostMeta[] =>
  Array.from({ length: count }, (_, i) => {
    const num = count - i;
    const slug = `202601${String(num).padStart(2, '0')}`;
    return {
      slug,
      title: `テスト記事タイトル_${num}`,
      date: `2026-01-${String(num).padStart(2, '0')}`,
      excerpt: `テスト記事抜粋_${num}`,
      thumbnail: i % 2 === 0 ? `/assets/${slug}/thumb.webp` : undefined,
    };
  });

describe('02_ホーム右カラム・最新記事・記事一覧・ページネーションテスト', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('02_記事一覧_01 Homeサーバーコンポーネントが正常にレンダリングされ最新記事枠と記事一覧枠が表示されること', () => {
    render(<Home />);
    expect(screen.getByText('最新記事')).toBeInTheDocument();
    expect(screen.getByText('記事一覧')).toBeInTheDocument();
  });

  it('02_最新記事_01 最新記事枠にバッジ・日付・タイトル・抜粋・「この記事を読む →」ボタンが表示されリンク先が /{slug}/ であること', () => {
    const post: PostMeta = {
      slug: '20260726',
      title: '最新テスト記事',
      date: '2026-07-26',
      excerpt: '最新の抜粋テキストです。',
      thumbnail: '/assets/20260726/test.webp',
    };
    render(<FeaturedPostCard post={post} />);

    expect(screen.getByText('最新記事')).toBeInTheDocument();
    expect(screen.getByText('2026-07-26')).toBeInTheDocument();
    expect(screen.getByText('最新テスト記事')).toBeInTheDocument();
    expect(screen.getByText('最新の抜粋テキストです。')).toBeInTheDocument();

    const readBtn = screen.getByRole('link', { name: /この記事を読む/ });
    expect(readBtn).toHaveAttribute('href', '/20260726/');
    expect(readBtn).toHaveClass('featured-read-link');
  });

  it('02_最新記事_02 サムネイル画像がある場合とない場合の両方でクラッシュせずバッジと日付が正常表示されること', () => {
    const postWithImg: PostMeta = {
      slug: '20260726',
      title: '画像あり記事',
      date: '2026-07-26',
      thumbnail: '/assets/20260726/img.webp',
    };
    const { unmount } = render(<FeaturedPostCard post={postWithImg} />);
    expect(screen.getByAltText('画像あり記事')).toHaveAttribute('src', '/assets/20260726/img.webp');
    unmount();

    const postWithoutImg: PostMeta = {
      slug: '20260725',
      title: '画像なし記事',
      date: '2026-07-25',
    };
    const { container } = render(<FeaturedPostCard post={postWithoutImg} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('最新記事')).toBeInTheDocument();
    expect(screen.getByText('2026-07-25')).toBeInTheDocument();
  });

  it('02_最新記事_03 最新記事クリック時に sessionStorage に hiyokoniki_return_page=1 と hiyokoniki_from_list=true が保存されること', () => {
    const post: PostMeta = {
      slug: '20260726',
      title: '最新クリックテスト',
      date: '2026-07-26',
    };
    render(<FeaturedPostCard post={post} />);

    fireEvent.click(screen.getByRole('link', { name: /この記事を読む/ }));
    expect(sessionStorage.getItem('hiyokoniki_return_page')).toBe('1');
    expect(sessionStorage.getItem('hiyokoniki_from_list')).toBe('true');
  });

  it('02_記事一覧_02 見出しに「記事一覧」と総件数バッジ（N Posts）が表示され、1ページあたり最大10件表示されること', () => {
    const posts = createMockPosts(25);
    const { container } = render(<PostList posts={posts} />);

    expect(screen.getByText('記事一覧')).toBeInTheDocument();
    expect(screen.getByText('25 Posts')).toBeInTheDocument();

    const cards = container.querySelectorAll('.post-card');
    expect(cards.length).toBe(10);
    expect(screen.getByText('テスト記事タイトル_25')).toBeInTheDocument();
    expect(screen.queryByText('テスト記事タイトル_15')).not.toBeInTheDocument();
  });

  it('02_記事一覧_03 「もっと見る（残り N件）」ボタン押下で10件ずつ追加表示され、全件表示後にボタンが消えること', () => {
    const posts = createMockPosts(25);
    const { container } = render(<PostList posts={posts} />);

    expect(container.querySelectorAll('.post-card').length).toBe(10);
    const loadMoreBtn = screen.getByRole('button', { name: 'もっと見る（残り 15件）' });

    // 1回目の「もっと見る」で20件表示
    fireEvent.click(loadMoreBtn);
    expect(container.querySelectorAll('.post-card').length).toBe(20);
    expect(screen.getByText('テスト記事タイトル_15')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'もっと見る（残り 5件）' })).toBeInTheDocument();

    // 2回目の「もっと見る」で全25件表示＆ボタン消滅
    fireEvent.click(screen.getByRole('button', { name: 'もっと見る（残り 5件）' }));
    expect(container.querySelectorAll('.post-card').length).toBe(25);
    expect(screen.getByText('テスト記事タイトル_1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /もっと見る/ })).not.toBeInTheDocument();
  });

  it('02_記事一覧_04 10件以下の場合は「もっと見る」ボタンが表示されないこと', () => {
    const posts = createMockPosts(10);
    render(<PostList posts={posts} />);

    expect(screen.queryByRole('button', { name: /もっと見る/ })).not.toBeInTheDocument();
  });

  it('02_記事一覧_05 もっと見るで展開した11件目以降の記事をクリックした際に sessionStorage にページ相当値 2 が保存されること', () => {
    const posts = createMockPosts(25);
    render(<PostList posts={posts} />);

    fireEvent.click(screen.getByRole('button', { name: /もっと見る/ }));
    const targetCard = screen.getByText('テスト記事タイトル_15').closest('a')!;
    expect(targetCard).toHaveAttribute('href', '/20260115/');

    fireEvent.click(targetCard);
    expect(sessionStorage.getItem('hiyokoniki_return_page')).toBe('2');
    expect(sessionStorage.getItem('hiyokoniki_from_list')).toBe('true');
  });

  it('02_記事一覧_06 個別記事から「← 記事一覧へ戻る」経由で戻った際、保存されていたページ番号が自動復元されること', () => {
    sessionStorage.setItem('hiyokoniki_restore_active', 'true');
    sessionStorage.setItem('hiyokoniki_return_page', '3');

    const posts = createMockPosts(25);
    render(<PostList posts={posts} />);

    // 3ページ目の記事（5〜1）が表示されていること
    expect(screen.getByText('テスト記事タイトル_5')).toBeInTheDocument();
    expect(sessionStorage.getItem('hiyokoniki_restore_active')).toBeNull();
  });

  it('02_記事一覧_07 最新記事まで進んでから「← 記事一覧へ戻る」で戻った際（isFeatured=true）、トップへスクロールし1ページ目が復元されること', () => {
    sessionStorage.setItem('hiyokoniki_restore_active', 'true');
    sessionStorage.setItem('hiyokoniki_return_page', '1');
    sessionStorage.setItem('hiyokoniki_return_is_featured', 'true');

    const posts = createMockPosts(15);
    render(<PostList posts={posts} />);

    expect(screen.getByText('テスト記事タイトル_15')).toBeInTheDocument();
    expect(sessionStorage.getItem('hiyokoniki_return_is_featured')).toBeNull();
  });

  it('02_記事一覧_08 空配列（0件境界値）およびUUIDv7タイトル記事を渡した際にクラッシュせず描画されること', () => {
    const { unmount } = render(<PostList posts={[]} />);
    expect(screen.getByText('0 Posts')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /次のページ/ })).not.toBeInTheDocument();
    unmount();

    const uuidPost: PostMeta[] = [
      {
        slug: '20260101',
        title: '018f3a5e-7a1b-7a1b-8a1b-7a1b8a1b7a1b',
        date: '2026-01-01',
      },
    ];
    render(<PostList posts={uuidPost} />);
    expect(screen.getByText('018f3a5e-7a1b-7a1b-8a1b-7a1b8a1b7a1b')).toBeInTheDocument();
  });

  it('02_記事一覧_09 デスクトップ幅およびモバイル幅（<=860px）でのリサイズ時に下部余白計算が正常動作すること', () => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="home-layout">
        <aside class="left-column" style="top: 80px;"><div class="card-frame"><img src="/header.webp" /></div></aside>
      </div>
      <footer class="site-footer"></footer>
    `;
    document.body.appendChild(wrapper);

    const posts = createMockPosts(12);
    const { unmount } = render(<PostList posts={posts} />);

    // デスクトップ幅
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 });
    fireEvent(window, new Event('resize'));
    const layoutEl = document.querySelector('.home-layout') as HTMLElement;
    expect(layoutEl.style.paddingBottom).toMatch(/px$/);

    // モバイル幅
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 600 });
    fireEvent(window, new Event('resize'));
    expect(layoutEl.style.paddingBottom).toBe('40px');

    unmount();
    document.body.removeChild(wrapper);
  });

  it('02_記事一覧_10 FeaturedPostCard のタイトルまたはサムネイル画像をクリックした際にも sessionStorage が正しく更新されること', () => {
    const post: PostMeta = {
      slug: '20260726',
      title: '画像＆タイトルクリック確認',
      date: '2026-07-26',
      thumbnail: '/assets/20260726/thumb.webp',
    };
    render(<FeaturedPostCard post={post} />);

    // サムネイル画像のリンクをクリック
    const imgLink = screen.getByAltText('画像＆タイトルクリック確認').closest('a')!;
    fireEvent.click(imgLink);
    expect(sessionStorage.getItem('hiyokoniki_return_page')).toBe('1');

    sessionStorage.clear();

    // タイトルのリンクをクリック
    const titleLink = screen.getByText('画像＆タイトルクリック確認').closest('a')!;
    fireEvent.click(titleLink);
    expect(sessionStorage.getItem('hiyokoniki_from_list')).toBe('true');
  });

  it('02_記事一覧_11 フィルターパネルに「キーワードで検索」「年月で絞り込み」「並び順」の各ラベルが表示されること', () => {
    const posts: PostMeta[] = [
      { slug: '20260906', title: '2026年9月の記事', date: '2026-09-06' },
      { slug: '20250505', title: '2025年5月の記事', date: '2025-05-05' },
    ];
    render(<PostList posts={posts} />);

    expect(screen.getByText('キーワードで検索')).toBeInTheDocument();
    expect(screen.getByText('年月で絞り込み')).toBeInTheDocument();
    expect(screen.getByText('並び順')).toBeInTheDocument();
  });

  it('02_フィルター_02 年を選択した際の月別チップが「XXXX年すべて」の後に1月→12月の昇順で並ぶこと', () => {
    const posts: PostMeta[] = [
      { slug: '20261116', title: '11月の記事', date: '2026-11-16' },
      { slug: '20260208', title: '2月の記事', date: '2026-02-08' },
      { slug: '20260802', title: '8月の記事', date: '2026-08-02' },
      { slug: '20250505', title: '2025年の記事', date: '2025-05-05' },
    ];
    render(<PostList posts={posts} />);

    fireEvent.click(screen.getByRole('button', { name: /2026/ }));
    const monthGroup = screen.getByRole('group', { name: '月別フィルター' });
    const monthLabels = Array.from(monthGroup.querySelectorAll('button')).map(btn => btn.textContent?.trim());
    expect(monthLabels).toEqual(['2026年すべて', '2月(1)', '8月(1)', '11月(1)']);
  });

  it('02_検索_01 キーワード入力でタイトル・抜粋がリアルタイム絞り込みされクリアボタンで全件に戻ること', () => {
    const posts: PostMeta[] = [
      { slug: '20260802', title: 'Liella!のちゅーとりえらいぶ2026', date: '2026-08-02', excerpt: '南船橋駅でライブ参加' },
      { slug: '20260808', title: '牛久と都内を散策', date: '2026-08-08', excerpt: '牛久シャトーと鬼塚姉妹' },
      { slug: '20250505', title: 'ゴールデンウィーク旅行', date: '2025-05-05', excerpt: 'ラーメンを食べた' },
    ];
    render(<PostList posts={posts} />);

    const searchInput = screen.getByLabelText('記事を検索');
    fireEvent.change(searchInput, { target: { value: '牛久' } });

    expect(screen.getByText('1 / 3 Posts')).toBeInTheDocument();
    expect(screen.getByText('牛久と都内を散策')).toBeInTheDocument();
    expect(screen.queryByText('Liella!のちゅーとりえらいぶ2026')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('検索をクリア'));
    expect(screen.getByText('3 Posts')).toBeInTheDocument();
    expect(screen.getByText('Liella!のちゅーとりえらいぶ2026')).toBeInTheDocument();
  });

  it('02_検索_02 一致する記事が0件のときに空メッセージと条件リセットボタンが表示されること', () => {
    const posts = createMockPosts(5);
    render(<PostList posts={posts} />);

    fireEvent.change(screen.getByLabelText('記事を検索'), { target: { value: '存在しないキーワードXYZ' } });
    expect(screen.getByText('0 / 5 Posts')).toBeInTheDocument();
    expect(screen.getByText('条件に一致する記事が見つかりませんでした。')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '条件をリセット' }));
    expect(screen.getByText('5 Posts')).toBeInTheDocument();
  });

  it('02_フィルター_01 年別チップおよび月別チップで記事が絞り込めること', () => {
    const posts: PostMeta[] = [
      { slug: '20260906', title: '2026年9月の記事', date: '2026-09-06' },
      { slug: '20260802', title: '2026年8月の記事', date: '2026-08-02' },
      { slug: '20250505', title: '2025年5月の記事', date: '2025-05-05' },
    ];
    render(<PostList posts={posts} />);

    // 2026年を選択
    fireEvent.click(screen.getByRole('button', { name: /2026/ }));
    expect(screen.getByText('2 / 3 Posts')).toBeInTheDocument();
    expect(screen.queryByText('2025年5月の記事')).not.toBeInTheDocument();

    // 8月を選択
    fireEvent.click(screen.getByRole('button', { name: /8月/ }));
    expect(screen.getByText('1 / 3 Posts')).toBeInTheDocument();
    expect(screen.getByText('2026年8月の記事')).toBeInTheDocument();
    expect(screen.queryByText('2026年9月の記事')).not.toBeInTheDocument();
  });

  it('02_並び替え_01 新しい順・古い順ボタンで表示順序が切り替わること', () => {
    const posts: PostMeta[] = [
      { slug: '20260906', title: '新しい記事', date: '2026-09-06' },
      { slug: '20250505', title: '古い記事', date: '2025-05-05' },
    ];
    const { container } = render(<PostList posts={posts} />);

    let titles = Array.from(container.querySelectorAll('.post-card-title')).map(el => el.textContent);
    expect(titles).toEqual(['新しい記事', '古い記事']);

    fireEvent.click(screen.getByLabelText('並び替えを切り替え'));
    expect(screen.getByText('古い順 ↑')).toBeInTheDocument();

    titles = Array.from(container.querySelectorAll('.post-card-title')).map(el => el.textContent);
    expect(titles).toEqual(['古い記事', '新しい記事']);
  });

  it('02_状態復元_01 検索・年月・並び順を適用して記事をクリックし「← 記事一覧へ戻る」で戻ると条件が復元され、直接アクセス時は初期化されること', () => {
    const posts: PostMeta[] = [
      { slug: '20260906', title: '2026年9月の牛久記事', date: '2026-09-06' },
      { slug: '20260808', title: '2026年8月の牛久記事', date: '2026-08-08' },
      { slug: '20250505', title: '2025年5月の別記事', date: '2025-05-05' },
    ];
    const { unmount } = render(<PostList posts={posts} />);

    // 検索・年・並び順を変更して記事をクリック
    fireEvent.change(screen.getByLabelText('記事を検索'), { target: { value: '牛久' } });
    fireEvent.click(screen.getByRole('button', { name: /2026/ }));
    fireEvent.click(screen.getByLabelText('並び替えを切り替え'));
    fireEvent.click(screen.getByText('2026年8月の牛久記事').closest('a')!);
    unmount();

    // 1. 「← 記事一覧へ戻る」経由（hiyokoniki_restore_active=true）→ 条件が復元されること
    sessionStorage.setItem('hiyokoniki_restore_active', 'true');
    const { unmount: unmount2 } = render(<PostList posts={posts} />);
    expect((screen.getByLabelText('記事を検索') as HTMLInputElement).value).toBe('牛久');
    expect(screen.getByText('古い順 ↑')).toBeInTheDocument();
    expect(screen.getByText('2 / 3 Posts')).toBeInTheDocument();
    unmount2();

    // 2. ヘッダーの「Home」や直接アクセス（restore_activeなし）→ 初期状態に戻ること
    render(<PostList posts={posts} />);
    expect((screen.getByLabelText('記事を検索') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('新しい順 ↓')).toBeInTheDocument();
    expect(screen.getByText('3 Posts')).toBeInTheDocument();
  });
});
