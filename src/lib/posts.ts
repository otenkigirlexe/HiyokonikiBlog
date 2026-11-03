import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  excerpt?: string;
  thumbnail?: string;
}

export interface PostDetail extends PostMeta {
  content: string;
  prevPost?: PostMeta | null;
  nextPost?: PostMeta | null;
  listPage: number;
  isFeatured: boolean;
}

const postsDirectory = path.join(process.cwd(), 'content', 'posts');

function extractExcerptAndThumbnail(markdown: string): { excerpt: string; thumbnail?: string } {
  // First image thumbnail
  const imgMatch = markdown.match(/!\[.*?\]\((\/assets\/[^\)]+)\)/);
  const thumbnail = imgMatch ? imgMatch[1] : undefined;

  // Clean lines for excerpt
  const lines = markdown
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false;
      if (line.startsWith('#')) return false;
      if (line.startsWith('![')) return false;
      if (line.startsWith('<video')) return false;
      if (line.startsWith('---')) return false;
      return true;
    });

  let excerpt = lines.slice(0, 2).join(' ');
  excerpt = excerpt.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  if (excerpt.length > 120) {
    excerpt = excerpt.slice(0, 117) + '...';
  }

  return { excerpt, thumbnail };
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);
      const { excerpt, thumbnail } = extractExcerptAndThumbnail(content);

      return {
        slug: data.slug || fileName.replace(/\.md$/, ''),
        title: data.title || fileName.replace(/\.md$/, ''),
        date: data.date || '',
        excerpt,
        thumbnail,
      };
    });

  // Sort posts by date descending (or slug descending)
  return allPostsData.sort((a, b) => (a.slug < b.slug ? 1 : -1));
}

export function getPostBySlug(slug: string): PostDetail | null {
  const allPosts = getAllPosts();
  const currentIndex = allPosts.findIndex(p => p.slug === slug);
  if (currentIndex === -1) {
    return null;
  }

  const fullPath = path.join(postsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);
  const { excerpt, thumbnail } = extractExcerptAndThumbnail(content);

  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;

  // トップページの「最新記事」枠は currentIndex === 0、
  // 「記事一覧」枠は currentIndex >= 1（1ページあたり10件）
  const isFeatured = currentIndex === 0;
  const listPage = currentIndex === 0 ? 1 : Math.floor((currentIndex - 1) / 10) + 1;

  return {
    slug: data.slug || slug,
    title: data.title || slug,
    date: data.date || '',
    excerpt,
    thumbnail,
    content,
    prevPost,
    nextPost,
    listPage,
    isFeatured,
  };
}

export interface SocialLink {
  label: string;
  url: string;
}

export interface SiteConfig {
  headerCaption: string;
  profileName: string;
  profileHandle: string;
  bio: string;
  socialLinks: SocialLink[];
}

const siteConfigPath = path.join(process.cwd(), 'content', 'site.json');

export function getSiteConfig(): SiteConfig {
  const defaultConfig: SiteConfig = {
    headerCaption: '2024年6月27日、ファンミ後の新幹線。',
    profileName: 'ひよこニキ',
    profileHandle: '@otenkigirl_exe',
    bio: '新海誠監督作品とラブライブ！シリーズが好きです。\n天気の子とラブライブ！スーパースター！！が特に好き。',
    socialLinks: [
      { label: 'X / Twitter', url: 'https://www.twitter.com/otenkigirl_exe' },
      { label: 'Bluesky', url: 'https://bsky.app/profile/otenkigirlexe.bsky.social' },
      { label: 'Instagram', url: 'https://www.instagram.com/otenkigirl_exe/' },
      { label: 'Mastodon', url: 'https://mstdn.jp/@otenkigirl_exe' },
      { label: 'GitHub', url: 'https://github.com/otenkigirlexe' },
    ],
  };
  if (!fs.existsSync(siteConfigPath)) {
    return defaultConfig;
  }
  try {
    const raw = fs.readFileSync(siteConfigPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      headerCaption:
        typeof parsed.headerCaption === 'string' && parsed.headerCaption.trim()
          ? parsed.headerCaption.trim()
          : defaultConfig.headerCaption,
      profileName:
        typeof parsed.profileName === 'string' && parsed.profileName.trim()
          ? parsed.profileName.trim()
          : defaultConfig.profileName,
      profileHandle:
        typeof parsed.profileHandle === 'string'
          ? parsed.profileHandle.trim()
          : defaultConfig.profileHandle,
      bio:
        typeof parsed.bio === 'string'
          ? parsed.bio
          : defaultConfig.bio,
      socialLinks: Array.isArray(parsed.socialLinks)
        ? parsed.socialLinks.filter(
            (item: any) =>
              item &&
              typeof item.label === 'string' &&
              typeof item.url === 'string' &&
              item.label.trim() !== '' &&
              item.url.trim() !== ''
          )
        : defaultConfig.socialLinks,
    };
  } catch (_) {
    return defaultConfig;
  }
}
