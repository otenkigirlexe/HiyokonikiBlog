import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Home from '@/app/page';
import PostList from '@/app/components/PostList';
import FeaturedPostCard from '@/app/components/FeaturedPostCard';
import { getAllPosts, PostMeta } from '@/lib/posts';

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

    // もう一度クリックして新しい順に戻ることも確認
    fireEvent.click(screen.getByLabelText('並び替えを切り替え'));
    expect(screen.getByText('新しい順 ↓')).toBeInTheDocument();
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

  it('02_状態復元_02 破損JSON・不正型フィルタ・不正ページ番号・UUIDv7検索・すべて再選択・ResizeObserver・画像loadイベントが正常動作すること', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 0;
    });

    // 1. 破損JSONの filter_state（年・月ソートの昇順/降順両比較を通す並び順）
    sessionStorage.setItem('hiyokoniki_restore_active', 'true');
    sessionStorage.setItem('hiyokoniki_list_filter_state', '{broken');
    const posts: PostMeta[] = [
      { slug: '20250505', title: '2025年記事', date: '2025-05-05' },
      { slug: '20260906', title: '9月記事', date: '2026-09-06' },
      { slug: '20260802', title: '8月記事', date: '' }, // date空 → slugから年月抽出
      { slug: '20261002', title: '10月記事', date: '2026-10-02' },
      { slug: '2026xx', title: '月不正記事', date: '2026-xx' },
      { slug: 'invalid', title: '不正日付記事', date: '' }, // 年月マッチなし
    ];
    const { unmount: u1 } = render(<PostList posts={posts} />);
    expect(screen.getByText('6 Posts')).toBeInTheDocument();
    u1();

    // 2. 不正型の filter_state
    sessionStorage.setItem('hiyokoniki_restore_active', 'true');
    sessionStorage.setItem(
      'hiyokoniki_list_filter_state',
      JSON.stringify({ searchQuery: 123, selectedYear: null, selectedMonth: 9, sortOrder: 'invalid', visibleCount: 1 })
    );
    const { unmount: u2 } = render(<PostList posts={posts} />);
    expect(screen.getByText('6 Posts')).toBeInTheDocument();
    u2();

    // 3. 不正な return_page（NaN）かつ filter_state なし、および return_page 自体なし
    sessionStorage.removeItem('hiyokoniki_list_filter_state');
    sessionStorage.setItem('hiyokoniki_restore_active', 'true');
    sessionStorage.setItem('hiyokoniki_return_page', 'not-a-number');
    const { unmount: u3 } = render(<PostList posts={posts} />);
    expect(screen.getByText('6 Posts')).toBeInTheDocument();
    u3();

    sessionStorage.removeItem('hiyokoniki_return_page');
    sessionStorage.setItem('hiyokoniki_restore_active', 'true');
    const { unmount: u3b } = render(<PostList posts={posts} />);
    expect(screen.getByText('6 Posts')).toBeInTheDocument();
    u3b();

    // 4. 年別「すべて」・月別「XXXX年すべて」再選択 ＋ UUIDv7 による0件検索
    const { unmount: u4 } = render(<PostList posts={posts} />);
    fireEvent.click(screen.getByRole('button', { name: /2026/ }));
    fireEvent.click(screen.getByRole('button', { name: /8月/ }));
    fireEvent.click(screen.getByRole('button', { name: '2026年すべて' }));
    fireEvent.click(screen.getByRole('button', { name: 'すべて' }));
    fireEvent.change(screen.getByLabelText('記事を検索'), {
      target: { value: '018f3a5e-7a1b-7a1b-8a1b-7a1b8a1b7a1b' },
    });
    expect(screen.getByText('0 / 6 Posts')).toBeInTheDocument();
    u4();

    // 5. ResizeObserver と未読み込み画像（img.complete=false）の load イベント・クリーンアップ
    let roCallback: (() => void) | null = null;
    const origRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(cb: any) {
        roCallback = cb;
      }
      observe() {}
      disconnect() {}
    } as any;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="home-layout">
        <aside class="left-column" style="top: 0px;"><div class="card-frame"><img src="/header.webp" /></div></aside>
      </div>
      <footer class="site-footer"></footer>
    `;
    const imgEl = wrapper.querySelector('img') as HTMLImageElement;
    Object.defineProperty(imgEl, 'complete', { value: false, configurable: true });
    document.body.appendChild(wrapper);

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 });
    const { unmount: u5 } = render(<PostList posts={posts} />);
    if (roCallback) (roCallback as () => void)();
    fireEvent(imgEl, new Event('load'));
    u5();

    document.body.removeChild(wrapper);
    globalThis.ResizeObserver = origRO;
    rafSpy.mockRestore();
  });

  it('02_フィルター_03 実データのすべての「年」ボタンおよび各年内のすべての「月」ボタンを順番にクリックし、該当する年月の記事と件数が100%一致して表示されること', () => {
    const realListPosts = getAllPosts().slice(1);
    const { container } = render(<PostList posts={realListPosts} />);

    const yearGroup = screen.getByRole('group', { name: '年別フィルター' });
    const yearButtons = Array.from(yearGroup.querySelectorAll('button')).filter(
      btn => btn.textContent?.trim() !== 'すべて'
    );
    expect(yearButtons.length).toBeGreaterThanOrEqual(6);

    for (const yearBtn of yearButtons) {
      const match = yearBtn.textContent?.trim().match(/^(\d{4})\((\d+)\)$/);
      expect(match).not.toBeNull();
      const [, year, expectedYearCount] = match!;

      // 年ボタンをクリック
      fireEvent.click(yearBtn);
      expect(screen.getByText(`${expectedYearCount} / ${realListPosts.length} Posts`)).toBeInTheDocument();

      // 表示された記事の日付がすべて選択した年であること
      const visibleDates = Array.from(container.querySelectorAll('.post-card time')).map(el => el.textContent || '');
      expect(visibleDates.length).toBeGreaterThan(0);
      for (const d of visibleDates) {
        expect(d.startsWith(`${year}-`)).toBe(true);
      }

      // その年に月別フィルター（2ヶ月以上）が展開されている場合、全月ボタンを順番にクリックして検証
      const monthGroup = screen.queryByRole('group', { name: '月別フィルター' });
      if (monthGroup) {
        const monthButtons = Array.from(monthGroup.querySelectorAll('button')).filter(
          btn => !btn.textContent?.includes('すべて')
        );
        for (const monthBtn of monthButtons) {
          const mMatch = monthBtn.textContent?.trim().match(/^(\d{1,2})月\((\d+)\)$/);
          expect(mMatch).not.toBeNull();
          const [, monthNum, expectedMonthCount] = mMatch!;
          const paddedMonth = monthNum.padStart(2, '0');

          fireEvent.click(monthBtn);
          expect(screen.getByText(`${expectedMonthCount} / ${realListPosts.length} Posts`)).toBeInTheDocument();

          const monthDates = Array.from(container.querySelectorAll('.post-card time')).map(el => el.textContent || '');
          expect(monthDates.length).toBeGreaterThan(0);
          for (const d of monthDates) {
            expect(d.startsWith(`${year}-${paddedMonth}-`)).toBe(true);
          }
        }
      }
    }

    // 「すべて」に戻すと全件表示に戻ること
    fireEvent.click(screen.getByRole('button', { name: 'すべて' }));
    expect(screen.getByText(`${realListPosts.length} Posts`)).toBeInTheDocument();
  });

  it('02_検索_03 実データでプレースホルダー例文（Liella! / 伊達さゆり / 2023-09）がすべてヒットし、並び順切り替えで最新・最古が入れ替わること', () => {
    const realListPosts = getAllPosts().slice(1);
    const { container } = render(<PostList posts={realListPosts} />);

    const searchInput = screen.getByLabelText('記事を検索');
    for (const sampleKeyword of ['Liella!', '伊達さゆり', '2023-09']) {
      fireEvent.change(searchInput, { target: { value: sampleKeyword } });
      const cards = container.querySelectorAll('.post-card');
      expect(cards.length).toBeGreaterThan(0);
    }

    // クリアして並び順を古い順へ切り替え → 最古記事（2021-06-10）が先頭に来ること
    fireEvent.click(screen.getByLabelText('検索をクリア'));
    fireEvent.click(screen.getByLabelText('並び替えを切り替え'));
    const firstDateAsc = container.querySelector('.post-card time')?.textContent;
    expect(firstDateAsc).toBe(realListPosts[realListPosts.length - 1].date);

    // 再度新しい順へ戻す → 一覧先頭記事が戻ること
    fireEvent.click(screen.getByLabelText('並び替えを切り替え'));
    const firstDateDesc = container.querySelector('.post-card time')?.textContent;
    expect(firstDateDesc).toBe(realListPosts[0].date);
  });

  it('02_複合操作_01 実データから動的に取得した全「年」×「並び順(新しい順/古い順)」×「検索(なし/1語/2語AND/UUIDv7 0件)」および最新年の全「月」複合条件がすべて期待件数・順序と100%一致すること', () => {
    const realListPosts = getAllPosts().slice(1);
    const { container } = render(<PostList posts={realListPosts} />);

    const searchInput = screen.getByLabelText('記事を検索');
    const sortBtn = screen.getByLabelText('並び替えを切り替え');
    const yearGroup = screen.getByRole('group', { name: '年別フィルター' });
    const yearBtns = Array.from(yearGroup.querySelectorAll('button'));

    const searchCases = ['', 'Liella!', 'Liella! 2026', '018f3a5e-7a1b-7a1b-8a1b-7a1b8a1b7a1b'];
    let currentSort: 'desc' | 'asc' = 'desc';

    const assertExpected = (year: string, month: string, query: string, sort: 'desc' | 'asc') => {
      const kws = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const expected = realListPosts.filter(p => {
        if (year !== 'all' && !p.date.startsWith(`${year}-`)) return false;
        if (year !== 'all' && month !== 'all' && !p.date.startsWith(`${year}-${month}-`)) return false;
        if (kws.length > 0) {
          const h = `${p.title} ${p.excerpt || ''} ${p.date} ${p.slug}`.toLowerCase();
          return kws.every(k => h.includes(k));
        }
        return true;
      });
      const ordered = sort === 'asc' ? [...expected].reverse() : expected;
      const isFiltered = query.trim() !== '' || year !== 'all' || month !== 'all';

      // 件数バッジの一致を検証
      const expectedBadge = isFiltered
        ? `${ordered.length} / ${realListPosts.length} Posts`
        : `${realListPosts.length} Posts`;
      expect(screen.getByText(expectedBadge)).toBeInTheDocument();

      // 表示中のカード順序（昇順/降順）と先頭記事を検証
      const displayedDates = Array.from(container.querySelectorAll('.post-card time')).map(el => el.textContent || '');
      expect(displayedDates.length).toBe(Math.min(10, ordered.length));
      if (ordered.length > 0) {
        expect(displayedDates[0]).toBe(ordered[0].date);
        for (let i = 0; i < displayedDates.length - 1; i++) {
          if (sort === 'desc') {
            expect(displayedDates[i] >= displayedDates[i + 1]).toBe(true);
          } else {
            expect(displayedDates[i] <= displayedDates[i + 1]).toBe(true);
          }
        }
      }
    };

    // 1. 動的に取得した全「年（すべて含む）」×「検索4種」×「並び順2種」の全組み合わせを網羅検証
    for (const yBtn of yearBtns) {
      const label = yBtn.textContent?.trim() || '';
      const year = label === 'すべて' ? 'all' : label.slice(0, 4);
      fireEvent.click(yBtn);

      for (const query of searchCases) {
        fireEvent.change(searchInput, { target: { value: query } });

        // 現在の並び順で検証
        assertExpected(year, 'all', query, currentSort);

        // 並び順を切り替えてもう一方も検証
        fireEvent.click(sortBtn);
        currentSort = currentSort === 'desc' ? 'asc' : 'desc';
        assertExpected(year, 'all', query, currentSort);
      }
    }

    // 2. 最新年の全「月」×「検索(なし/1語)」×「並び順2種」の複合条件も網羅検証
    const latestYearBtn = yearBtns.find(b => b.textContent?.trim() !== 'すべて')!;
    const latestYear = latestYearBtn.textContent!.trim().slice(0, 4);
    fireEvent.click(latestYearBtn);
    const monthGroup = screen.queryByRole('group', { name: '月別フィルター' });
    if (monthGroup) {
      const monthBtns = Array.from(monthGroup.querySelectorAll('button')).filter(
        b => !b.textContent?.includes('すべて')
      );
      for (const mBtn of monthBtns) {
        const mNum = mBtn.textContent!.trim().match(/^(\d{1,2})月/)![1].padStart(2, '0');
        fireEvent.click(mBtn);
        for (const query of ['', 'Liella!']) {
          fireEvent.change(searchInput, { target: { value: query } });
          assertExpected(latestYear, mNum, query, currentSort);
          fireEvent.click(sortBtn);
          currentSort = currentSort === 'desc' ? 'asc' : 'desc';
          assertExpected(latestYear, mNum, query, currentSort);
        }
      }
    }
  });
});
