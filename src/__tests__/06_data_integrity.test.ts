import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAllPosts, getPostBySlug, getSiteConfig } from '@/lib/posts';

const REPO_ROOT = process.cwd();
const POSTS_DIR = path.join(REPO_ROOT, 'content', 'posts');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');
const SITE_JSON_PATH = path.join(REPO_ROOT, 'content', 'site.json');

describe('06_データ整合性・リレーション実在確認・posts.ts 単体テスト', () => {
  it('06_データ整合性_01 content/site.json が存在し、必須フィールドと有効なURLのsocialLinksを持つこと', () => {
    expect(fs.existsSync(SITE_JSON_PATH)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(SITE_JSON_PATH, 'utf8'));

    expect(typeof raw.headerCaption).toBe('string');
    expect(raw.headerCaption.trim().length).toBeGreaterThan(0);
    expect(typeof raw.profileName).toBe('string');
    expect(raw.profileName.trim().length).toBeGreaterThan(0);
    expect(typeof raw.bio).toBe('string');
    expect(Array.isArray(raw.socialLinks)).toBe(true);

    for (const link of raw.socialLinks) {
      expect(link.label.trim().length).toBeGreaterThan(0);
      expect(link.url).toMatch(/^https?:\/\//);
    }
  });

  it('06_データ整合性_02 public/header.webp および public/icon.webp が実在しサイズが 0 バイトより大きいこと', () => {
    const headerPath = path.join(PUBLIC_DIR, 'header.webp');
    const iconPath = path.join(PUBLIC_DIR, 'icon.webp');

    expect(fs.existsSync(headerPath)).toBe(true);
    expect(fs.statSync(headerPath).size).toBeGreaterThan(0);

    expect(fs.existsSync(iconPath)).toBe(true);
    expect(fs.statSync(iconPath).size).toBeGreaterThan(0);
  });

  it('06_データ整合性_03 content/posts/*.md 全記事の slug が一意（重複なし）であり YYYYMMDD 形式であること', () => {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    expect(files.length).toBeGreaterThanOrEqual(90);

    const slugSet = new Set<string>();
    for (const file of files) {
      const slugFromFile = file.replace(/\.md$/, '');
      expect(slugFromFile).toMatch(/^\d{8}$/);
      expect(slugSet.has(slugFromFile)).toBe(false);
      slugSet.add(slugFromFile);
    }
  });

  it('06_データ整合性_04 全記事の frontmatter に title, date, slug が存在し date が YYYY-MM-DD 形式であること', () => {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const fullPath = path.join(POSTS_DIR, file);
      const { data } = matter(fs.readFileSync(fullPath, 'utf8'));
      const expectedSlug = file.replace(/\.md$/, '');

      expect(typeof data.title).toBe('string');
      expect(data.title.trim().length).toBeGreaterThan(0);
      expect(data.slug).toBe(expectedSlug);
      expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('06_データ整合性_05 全記事本文内の画像（![...](/assets/...)）および動画（<video src="/assets/...">）が public/assets/ に100%実在すること', () => {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    const missingAssets: string[] = [];

    for (const file of files) {
      const fullPath = path.join(POSTS_DIR, file);
      const { content } = matter(fs.readFileSync(fullPath, 'utf8'));

      // Markdown images
      const imgRegex = /!\[[^\]]*\]\((\/assets\/[^)\s]+)\)/g;
      let match: RegExpExecArray | null;
      while ((match = imgRegex.exec(content)) !== null) {
        const assetRelPath = match[1];
        const assetDiskPath = path.join(PUBLIC_DIR, assetRelPath);
        if (!fs.existsSync(assetDiskPath)) {
          missingAssets.push(`${file} -> ${assetRelPath}`);
        }
      }

      // HTML videos
      const videoRegex = /<video[^>]+src=["'](\/assets\/[^"']+)["']/g;
      while ((match = videoRegex.exec(content)) !== null) {
        const assetRelPath = match[1];
        const assetDiskPath = path.join(PUBLIC_DIR, assetRelPath);
        if (!fs.existsSync(assetDiskPath)) {
          missingAssets.push(`${file} -> ${assetRelPath}`);
        }
      }
    }

    expect(missingAssets).toEqual([]);
  });

  it('06_データ整合性_06 全記事本文に不要な <p> タグの残留がないこと', () => {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const { content } = matter(fs.readFileSync(path.join(POSTS_DIR, file), 'utf8'));
      expect(content).not.toContain('<p>');
    }
  });

  it('06_データアクセス_01 getAllPosts() が全記事を slug 降順（新しい順）でソートして返すこと', () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThanOrEqual(90);

    for (let i = 0; i < posts.length - 1; i++) {
      expect(posts[i].slug >= posts[i + 1].slug).toBe(true);
    }
  });

  it('06_データアクセス_02 getPostBySlug() が実在ID（先頭・中間・末尾）に対して正しい前後記事（nextPost / prevPost）を返すこと', () => {
    const allPosts = getAllPosts();
    const first = getPostBySlug(allPosts[0].slug)!;
    expect(first.nextPost).toBeNull();
    expect(first.prevPost?.slug).toBe(allPosts[1].slug);

    const mid = getPostBySlug(allPosts[5].slug)!;
    expect(mid.nextPost?.slug).toBe(allPosts[4].slug);
    expect(mid.prevPost?.slug).toBe(allPosts[6].slug);

    const last = getPostBySlug(allPosts[allPosts.length - 1].slug)!;
    expect(last.nextPost?.slug).toBe(allPosts[allPosts.length - 2].slug);
    expect(last.prevPost).toBeNull();
  });

  it('06_データアクセス_03 getPostBySlug("99999999")（存在しないID）に対して null を返すこと', () => {
    expect(getPostBySlug('99999999')).toBeNull();
  });

  it('06_データアクセス_04 getPostBySlug() の逆算ページ番号 listPage と isFeatured が全記事の位置と100%一致すること', () => {
    const allPosts = getAllPosts();

    // 0番目（最新記事枠）
    const p0 = getPostBySlug(allPosts[0].slug)!;
    expect(p0.isFeatured).toBe(true);
    expect(p0.listPage).toBe(1);

    // 1番目（記事一覧の1ページ目・先頭）
    const p1 = getPostBySlug(allPosts[1].slug)!;
    expect(p1.isFeatured).toBe(false);
    expect(p1.listPage).toBe(1);

    // 10番目（記事一覧の1ページ目・10件目）
    const p10 = getPostBySlug(allPosts[10].slug)!;
    expect(p10.isFeatured).toBe(false);
    expect(p10.listPage).toBe(1);

    // 11番目（記事一覧の2ページ目・1件目）
    const p11 = getPostBySlug(allPosts[11].slug)!;
    expect(p11.isFeatured).toBe(false);
    expect(p11.listPage).toBe(2);

    // 21番目（記事一覧の3ページ目・1件目）
    const p21 = getPostBySlug(allPosts[21].slug)!;
    expect(p21.isFeatured).toBe(false);
    expect(p21.listPage).toBe(3);
  });

  it('06_データアクセス_05 getSiteConfig() が site.json の設定値を正しく読み込んで返すこと', () => {
    const cfg = getSiteConfig();
    expect(cfg.profileName).toBe('ひよこニキ');
    expect(cfg.socialLinks.length).toBeGreaterThan(0);
  });

  it('06_データアクセス_06 全記事の抜粋（excerpt）が120文字以下に丸められMarkdownリンク記法が除去されていること', () => {
    const allPosts = getAllPosts();
    for (const p of allPosts) {
      if (p.excerpt) {
        expect(p.excerpt.length).toBeLessThanOrEqual(120);
        expect(p.excerpt).not.toMatch(/\[[^\]]+\]\([^)]+\)/);
      }
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('06_データアクセス_07 postsDirectory 不存在時・記事ファイル不存在時・frontmatter欠損時に安全にフォールバックすること', () => {
    // 1. postsDirectory 不存在時 → []
    vi.spyOn(fs, 'existsSync').mockReturnValueOnce(false);
    expect(getAllPosts()).toEqual([]);

    // 2. frontmatter 欠損（title/slug/date なし）＋ 見出し(#)・区切り線(---) を含む記事（昇順・降順混在でソート両分岐網羅）
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValueOnce(['20260102.md', '20260101.md', '20260103.md'] as any);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('# 見出し\n---\n本文テキスト\n' as any);
    const posts = getAllPosts();
    expect(posts).toHaveLength(3);
    expect(posts[0].slug).toBe('20260103');
    expect(posts[2].slug).toBe('20260101');
    expect(posts[2].title).toBe('20260101');
    expect(posts[2].date).toBe('');
    expect(posts[2].excerpt).toBe('本文テキスト');

    // getPostBySlug でも frontmatter 欠損が安全にフォールバックされること
    vi.spyOn(fs, 'readdirSync').mockReturnValueOnce(['20260101.md'] as any);
    const detail = getPostBySlug('20260101');
    expect(detail?.slug).toBe('20260101');
    expect(detail?.title).toBe('20260101');
    expect(detail?.date).toBe('');

    // 3. 一覧にはあるが個別ファイルが直前に消えた場合 → null
    vi.restoreAllMocks();
    const existsSpy = vi.spyOn(fs, 'existsSync');
    existsSpy.mockReturnValueOnce(true); // getAllPosts() の postsDirectory
    existsSpy.mockReturnValueOnce(false); // getPostBySlug() の fullPath
    vi.spyOn(fs, 'readdirSync').mockReturnValueOnce(['20260101.md'] as any);
    vi.spyOn(fs, 'readFileSync').mockReturnValueOnce('---\nslug: "20260101"\n---\n本文' as any);
    expect(getPostBySlug('20260101')).toBeNull();
  });

  it('06_データアクセス_08 site.json が不存在・破損JSON・型不一致フィールドの場合にデフォルト設定へフォールバックすること', () => {
    // 1. site.json 不存在
    vi.spyOn(fs, 'existsSync').mockReturnValueOnce(false);
    const defCfg = getSiteConfig();
    expect(defCfg.profileName).toBe('ひよこニキ');
    expect(defCfg.socialLinks.length).toBe(5);

    // 2. 破損JSON（catch 分岐）
    vi.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValueOnce('{ broken json' as any);
    const errCfg = getSiteConfig();
    expect(errCfg.profileName).toBe('ひよこニキ');

    // 3. 空文字や型不一致フィールド（全フォールバック分岐）
    vi.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValueOnce(
      JSON.stringify({
        headerCaption: '   ',
        profileName: '',
        profileHandle: 12345,
        bio: null,
        socialLinks: 'not-an-array',
      }) as any
    );
    const fallbackCfg = getSiteConfig();
    expect(fallbackCfg.headerCaption).toBe('2024年6月27日、ファンミ後の新幹線。');
    expect(fallbackCfg.profileName).toBe('ひよこニキ');
    expect(fallbackCfg.profileHandle).toBe('@otenkigirl_exe');
    expect(fallbackCfg.bio).toContain('新海誠監督作品');
    expect(fallbackCfg.socialLinks.length).toBe(5);
  });
});
