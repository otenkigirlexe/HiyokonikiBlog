import React from 'react';
import { getAllPosts, getSiteConfig } from '@/lib/posts';
import PostList from './components/PostList';
import FeaturedPostCard from './components/FeaturedPostCard';

export default function Home() {
  const allPosts = getAllPosts();
  const siteConfig = getSiteConfig();
  const featuredPost = allPosts.length > 0 ? allPosts[0] : null;
  const remainingPosts = allPosts.slice(1);

  return (
    <div className="home-layout">
      {/* 左カラム：統合カード */}
      <aside className="left-column">
        <div className="card-frame">
          <div className="intro-image-wrap">
            <a href="/header.webp" target="_blank" rel="noopener noreferrer">
              <img
                src="/header.webp"
                alt={siteConfig.headerCaption}
                className="aspect-preserved-image"
              />
            </a>
          </div>
          <div className="intro-body">
            <p className="intro-caption">{siteConfig.headerCaption}</p>

            <hr className="intro-divider" />

            <div className="profile-header">
              <img src="/icon.webp" alt={siteConfig.profileName} className="profile-avatar" />
              <div>
                <h1 className="intro-title">{siteConfig.profileName}</h1>
                {siteConfig.profileHandle && (
                  <p className="profile-sub">{siteConfig.profileHandle}</p>
                )}
              </div>
            </div>

            <p className="profile-bio">{siteConfig.bio}</p>

            <div className="social-chips">
              {siteConfig.socialLinks.map((link, idx) => (
                <a
                  key={`${link.label}-${idx}`}
                  href={link.url}
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

      {/* 右カラム */}
      <main className="right-column">
        {/* 右上：最新記事枠 */}
        {featuredPost && <FeaturedPostCard post={featuredPost} />}

        {/* 右下：最新以外の記事一覧枠 */}
        <PostList posts={remainingPosts} />
      </main>
    </div>
  );
}
