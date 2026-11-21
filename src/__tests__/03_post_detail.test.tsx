import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PostPage, { generateStaticParams, generateMetadata } from '@/app/[slug]/page';
import MarkdownRenderer from '@/app/components/MarkdownRenderer';
import BackToListLink from '@/app/components/BackToListLink';
import * as postsModule from '@/lib/posts';
import { getAllPosts, getPostBySlug } from '@/lib/posts';

const notFoundMock = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}));

describe('03_個別記事詳細・前後ナビゲーション・ページ逆算・OGP・Markdown描画テスト', () => {
  beforeEach(() => {
    sessionStorage.clear();
    notFoundMock.mockClear();
  });

  it('03_記事詳細_01 generateStaticParams() が全記事分の slug 配列を返すこと', async () => {
    const params = await generateStaticParams();
    const allPosts = getAllPosts();
    expect(params.length).toBe(allPosts.length);
    expect(params[0]).toEqual({ slug: allPosts[0].slug });
  });

  it('03_記事詳細_02 実在する記事（20260726）で await PostPage を呼び出した際、日付・タイトル・本文・上下2箇所の「← 記事一覧へ戻る」が描画されること', async () => {
    const post = getPostBySlug('20260726')!;
    const element = await PostPage({ params: Promise.resolve({ slug: '20260726' }) });
    render(element);

    expect(screen.getByRole('heading', { level: 1, name: post.title })).toBeInTheDocument();
    expect(screen.getByText(post.date)).toBeInTheDocument();

    const backLinks = screen.getAllByRole('link', { name: /記事一覧へ戻る/ });
    expect(backLinks.length).toBe(2);
    backLinks.forEach(link => {
      expect(link).toHaveAttribute('href', '/');
      expect(link).toHaveClass('article-back-link');
    });
  });

  it('03_記事詳細_03 存在しないID（99999999）を渡した際、notFound() が呼び出されること（異常系）', async () => {
    await expect(
      PostPage({ params: Promise.resolve({ slug: '99999999' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('03_記事詳細_04 最新記事（1件目）の詳細画面では左側が「まだ次のブログは更新されていません」、右側が1つ古い記事へのリンクになること', async () => {
    const allPosts = getAllPosts();
    const newest = allPosts[0];
    const secondNewest = allPosts[1];

    const element = await PostPage({ params: Promise.resolve({ slug: newest.slug }) });
    render(element);

    expect(screen.getByText('まだ次のブログは更新されていません')).toBeInTheDocument();
    const prevLink = screen.getByText(secondNewest.title).closest('a');
    expect(prevLink).toHaveAttribute('href', `/${secondNewest.slug}/`);
  });

  it('03_記事詳細_05 最古記事（最終件）の詳細画面では左側が1つ新しい記事へのリンク、右側が「これより古いページは存在しません」になること', async () => {
    const allPosts = getAllPosts();
    const oldest = allPosts[allPosts.length - 1];
    const secondOldest = allPosts[allPosts.length - 2];

    const element = await PostPage({ params: Promise.resolve({ slug: oldest.slug }) });
    render(element);

    expect(screen.getByText('これより古いページは存在しません')).toBeInTheDocument();
    const nextLink = screen.getByText(secondOldest.title).closest('a');
    expect(nextLink).toHaveAttribute('href', `/${secondOldest.slug}/`);
  });

  it('03_記事詳細_06 中間記事の詳細画面では左右両方の「← 次の記事」「前の記事 →」が有効なリンクになること', async () => {
    const allPosts = getAllPosts();
    const middle = allPosts[10];
    const newer = allPosts[9];
    const older = allPosts[11];

    const element = await PostPage({ params: Promise.resolve({ slug: middle.slug }) });
    render(element);

    expect(screen.getByText(newer.title).closest('a')).toHaveAttribute('href', `/${newer.slug}/`);
    expect(screen.getByText(older.title).closest('a')).toHaveAttribute('href', `/${older.slug}/`);
  });

  it('03_記事詳細_07 BackToListLink 押下時、一覧経由（hiyokoniki_from_list=true）なら逆算ページ番号 listPage を sessionStorage に保存すること', () => {
    sessionStorage.setItem('hiyokoniki_from_list', 'true');
    render(<BackToListLink listPage={4} isFeatured={false} />);

    fireEvent.click(screen.getByRole('link', { name: /記事一覧へ戻る/ }));
    expect(sessionStorage.getItem('hiyokoniki_return_page')).toBe('4');
    expect(sessionStorage.getItem('hiyokoniki_return_is_featured')).toBe('false');
    expect(sessionStorage.getItem('hiyokoniki_restore_active')).toBe('true');
  });

  it('03_記事詳細_08 BackToListLink 押下時、直接アクセス時（hiyokoniki_from_list未設定）は復元フラグをセットしないこと', () => {
    render(<BackToListLink listPage={3} isFeatured={false} />);

    fireEvent.click(screen.getByRole('link', { name: /記事一覧へ戻る/ }));
    expect(sessionStorage.getItem('hiyokoniki_restore_active')).toBeNull();
  });

  it('03_記事詳細_09 generateMetadata が画像ありの実在記事で1枚目の画像を OGP / Twitter 画像に設定すること', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: '20260726' }) });
    expect(meta.title).toContain('— ひよこニキのホームページ');
    const og = meta.openGraph as any;
    expect(og.url).toBe('https://hiyokoniki.jp/20260726/');
    expect(og.images[0].url).toMatch(/^\/assets\/20260726\//);
  });

  it('03_記事詳細_10 generateMetadata が存在しないID（99999999）で Not Found / ひよこニキのホームページ を返すこと', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: '99999999' }) });
    expect(meta.title).toBe('Not Found / ひよこニキのホームページ');
  });

  it('03_記事詳細_11 generateMetadata が画像を持たない記事でフォールバック画像（/header.webp）を OGP に設定すること', async () => {
    const allPosts = getAllPosts();
    const postWithoutThumb = allPosts.find(p => !p.thumbnail);
    if (postWithoutThumb) {
      const meta = await generateMetadata({ params: Promise.resolve({ slug: postWithoutThumb.slug }) });
      const og = meta.openGraph as any;
      expect(og.images[0].url).toBe('/header.webp');
    }
  });

  it('03_Markdown描画_01 MarkdownRenderer が単一改行を別々の <p> タグに変換すること', () => {
    const { container } = render(<MarkdownRenderer content={'1行目のテキストです。\n2行目のテキストです。'} />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0]).toHaveTextContent('1行目のテキストです。');
    expect(paragraphs[1]).toHaveTextContent('2行目のテキストです。');
  });

  it('03_Markdown描画_02 MarkdownRenderer が画像（![alt](url)）を .article-media-wrap でラップして描画すること', () => {
    const { container } = render(
      <MarkdownRenderer content={'前の行\n![テスト画像](/assets/20260726/test.webp)\n次の行'} />
    );
    const wrap = container.querySelector('.article-media-wrap');
    expect(wrap).toBeInTheDocument();
    const img = wrap?.querySelector('img');
    expect(img).toHaveAttribute('src', '/assets/20260726/test.webp');
    expect(img).toHaveAttribute('alt', 'テスト画像');
  });

  it('03_Markdown描画_03 MarkdownRenderer が <video> タグを .article-media-wrap でラップして描画すること', () => {
    const { container } = render(
      <MarkdownRenderer content={'動画の前\n<video controls src="/assets/20260726/movie.mp4"></video>\n動画の後'} />
    );
    const video = container.querySelector('.article-media-wrap video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', '/assets/20260726/movie.mp4');
  });

  it('03_Markdown描画_04 MarkdownRenderer に空文字やUUIDv7文字列を渡してもクラッシュしないこと', () => {
    const { unmount } = render(<MarkdownRenderer content="" />);
    unmount();

    render(<MarkdownRenderer content="018f3a5e-7a1b-7a1b-8a1b-7a1b8a1b7a1b" />);
    expect(screen.getByText('018f3a5e-7a1b-7a1b-8a1b-7a1b8a1b7a1b')).toBeInTheDocument();
  });

  it('03_記事詳細_12 generateMetadata で excerpt が空の記事にフォールバック description が設定されること', async () => {
    vi.spyOn(postsModule, 'getPostBySlug').mockReturnValueOnce({
      slug: '20260101',
      title: '抜粋なし記事',
      date: '2026-01-01',
      excerpt: '',
      content: '本文',
      listPage: 1,
      isFeatured: false,
    });
    const meta = await generateMetadata({ params: Promise.resolve({ slug: '20260101' }) });
    expect(meta.description).toBe('抜粋なし記事の記事詳細');
    vi.restoreAllMocks();
  });

  it('03_記事詳細_13 BackToListLink で isFeatured=true 遷移および sessionStorage 例外発生時にクラッシュしないこと', () => {
    sessionStorage.setItem('hiyokoniki_from_list', 'true');
    const { unmount } = render(<BackToListLink listPage={1} isFeatured={true} />);
    fireEvent.click(screen.getByRole('link', { name: /記事一覧へ戻る/ }));
    expect(sessionStorage.getItem('hiyokoniki_return_is_featured')).toBe('true');
    unmount();

    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new Error('storage disabled');
    });
    render(<BackToListLink />);
    fireEvent.click(screen.getByRole('link', { name: /記事一覧へ戻る/ }));
    spy.mockRestore();
  });
});
