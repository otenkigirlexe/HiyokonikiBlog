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

  it('02_記事一覧_03 下部ページネーションの「次のページ →」「← 前のページ」および番号ボタンで表示記事が切り替わること', () => {
    const posts = createMockPosts(25);
    render(<PostList posts={posts} />);

    // 次のページへ（Page 2）
    fireEvent.click(screen.getByRole('button', { name: /次のページ/ }));
    expect(screen.getByText('テスト記事タイトル_15')).toBeInTheDocument();
    expect(screen.queryByText('テスト記事タイトル_25')).not.toBeInTheDocument();

    // 番号ボタン 3 を押す（Page 3）
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(screen.getByText('テスト記事タイトル_5')).toBeInTheDocument();

    // 前のページへ（Page 2）
    fireEvent.click(screen.getByRole('button', { name: /前のページ/ }));
    expect(screen.getByText('テスト記事タイトル_15')).toBeInTheDocument();
  });

  it('02_記事一覧_04 1ページ目では「← 前のページ」がdisabled、最終ページでは「次のページ →」がdisabledになること', () => {
    const posts = createMockPosts(20);
    render(<PostList posts={posts} />);

    const prevBtn = screen.getByRole('button', { name: /前のページ/ });
    const nextBtn = screen.getByRole('button', { name: /次のページ/ });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);
    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).toBeDisabled();
  });

  it('02_記事一覧_05 一覧の2ページ目で記事をクリックした際に sessionStorage にページ番号 2 が保存されること', () => {
    const posts = createMockPosts(25);
    render(<PostList posts={posts} />);

    fireEvent.click(screen.getByRole('button', { name: '2' }));
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

  it('02_記事一覧_11 PostList のページ切り替え時に articles-section への smooth スクロールが呼ばれること', () => {
    const posts = createMockPosts(25);
    render(<PostList posts={posts} />);

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(sessionStorage.getItem('hiyokoniki_return_page')).toBe('2');
  });
});
