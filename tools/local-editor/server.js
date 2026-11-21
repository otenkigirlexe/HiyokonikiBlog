const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const Busboy = require('busboy');

const PORT = 3001;
const HOST = '127.0.0.1'; // Bind exclusively to localhost loopback

const REPO_ROOT = path.resolve(__dirname, '../../');
const POSTS_DIR = path.resolve(REPO_ROOT, 'content/posts');
const ASSETS_DIR = path.resolve(REPO_ROOT, 'public/assets');

// Security helper: strictly validate slug
function isValidSlug(slug) {
  return /^[a-zA-Z0-9_-]+$/.test(slug) && !slug.includes('..');
}

// Security helper: ensure child path is strictly within parent dir
function isSafePath(parentDir, targetPath) {
  const relative = path.relative(parentDir, targetPath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

// Security helper: allowed media extensions
const ALLOWED_MEDIA_EXT = new Set(['.webp', '.mp4', '.png', '.jpg', '.jpeg', '.gif', '.avif', '.webm', '.mov']);

// Extensions that should be automatically converted to WebP via cwebp -q 50 (Method A)
const CWEBP_CONVERTIBLE_EXT = new Set(['.jpg', '.jpeg', '.png']);

function resolveCwebpBinary() {
  const defaultWinPath = 'C:\\libwebp-1.6.0-windows-x64\\bin\\cwebp.exe';
  if (fs.existsSync(defaultWinPath)) {
    return defaultWinPath;
  }
  return 'cwebp';
}

const server = http.createServer((req, res) => {
  // Security: only allow requests from localhost
  const remoteAddress = req.socket.remoteAddress;
  if (remoteAddress !== '127.0.0.1' && remoteAddress !== '::1' && remoteAddress !== '::ffff:127.0.0.1') {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access denied: local only');
    return;
  }

  // Handle CORS for local editor if running across ports
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = parsedUrl.pathname;

  // API 1: List all posts (GET /api/posts)
  if (pathname === '/api/posts' && req.method === 'GET') {
    try {
      if (!fs.existsSync(POSTS_DIR)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ posts: [] }));
        return;
      }
      const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')).sort().reverse();
      const list = files.map(f => {
        const fullPath = path.join(POSTS_DIR, f);
        const content = fs.readFileSync(fullPath, 'utf8');
        const titleMatch = content.match(/title:\s*"([^"]+)"/);
        const dateMatch = content.match(/date:\s*"([^"]+)"/);
        const slug = f.replace(/\.md$/, '');
        return {
          slug,
          title: titleMatch ? titleMatch[1] : slug,
          date: dateMatch ? dateMatch[1] : '',
        };
      });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ posts: list }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // API 2: Get single post content (GET /api/posts/:slug)
  if (pathname.startsWith('/api/posts/') && req.method === 'GET') {
    const slug = decodeURIComponent(pathname.replace('/api/posts/', ''));
    if (!isValidSlug(slug)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid slug' }));
      return;
    }
    const targetFile = path.resolve(POSTS_DIR, `${slug}.md`);
    if (!isSafePath(POSTS_DIR, targetFile) || !fs.existsSync(targetFile)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Post not found' }));
      return;
    }
    const raw = fs.readFileSync(targetFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ slug, raw }));
    return;
  }

  // API 3: Save post (POST /api/posts/save)
  if (pathname === '/api/posts/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { slug, title, date, bodyContent, allowOverwrite } = JSON.parse(body);
        if (!isValidSlug(slug)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid slug format' }));
          return;
        }

        const targetFile = path.resolve(POSTS_DIR, `${slug}.md`);
        if (!isSafePath(POSTS_DIR, targetFile)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden path traversal' }));
          return;
        }

        if (fs.existsSync(targetFile) && !allowOverwrite) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '同日の記事ファイルが既に存在します。「上書き許可」にチェックを入れて保存してください。', exists: true }));
          return;
        }

        // Format Markdown with frontmatter
        const fileContent = [
          '---',
          `title: "${(title || slug).replace(/"/g, '\\"')}"`,
          `date: "${date || new Date().toISOString().slice(0, 10)}"`,
          `slug: "${slug}"`,
          '---',
          '',
          (bodyContent || '').trim(),
          '',
        ].join('\n');

        fs.mkdirSync(POSTS_DIR, { recursive: true });
        fs.writeFileSync(targetFile, fileContent, 'utf8');

        // Also ensure public/assets/<slug> exists and clean up unused media files
        const assetDir = path.resolve(ASSETS_DIR, slug);
        const removedAssets = [];
        if (!fs.existsSync(assetDir)) {
          fs.mkdirSync(assetDir, { recursive: true });
        } else if (isSafePath(ASSETS_DIR, assetDir)) {
          const textToSearch = bodyContent || '';
          const existingFiles = fs.readdirSync(assetDir);
          for (const fname of existingFiles) {
            const fullAssetPath = path.resolve(assetDir, fname);
            if (!fs.statSync(fullAssetPath).isFile()) continue;
            // Check if referenced as /assets/<slug>/<fname> or encoded filename
            const assetUrl = `/assets/${slug}/${fname}`;
            const encodedAssetUrl = `/assets/${slug}/${encodeURIComponent(fname)}`;
            if (!textToSearch.includes(assetUrl) && !textToSearch.includes(encodedAssetUrl)) {
              fs.rmSync(fullAssetPath, { force: true });
              removedAssets.push(fname);
            }
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, slug, removedAssets }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API 3.5: Delete post and its assets (POST /api/posts/delete)
  if (pathname === '/api/posts/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { slug } = JSON.parse(body);
        if (!isValidSlug(slug)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid slug format' }));
          return;
        }

        const targetFile = path.resolve(POSTS_DIR, `${slug}.md`);
        if (!isSafePath(POSTS_DIR, targetFile)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden path traversal' }));
          return;
        }

        if (!fs.existsSync(targetFile)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '指定された記事ファイルが見つかりません' }));
          return;
        }

        fs.rmSync(targetFile, { force: true });

        // 対応する public/assets/<slug> フォルダも存在する場合は削除
        const assetDir = path.resolve(ASSETS_DIR, slug);
        if (isSafePath(ASSETS_DIR, assetDir) && fs.existsSync(assetDir)) {
          fs.rmSync(assetDir, { recursive: true, force: true });
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, slug }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API 4: Upload media (POST /api/upload)
  if (pathname === '/api/upload' && req.method === 'POST') {
    try {
      const busboy = Busboy({ headers: req.headers, limits: { fileSize: 100 * 1024 * 1024 } });
      let slug = parsedUrl.searchParams.get('slug') || '';
      const uploadedFiles = [];
      const writePromises = [];
      let uploadError = null;

      busboy.on('field', (fieldname, val) => {
        if (fieldname === 'slug' && val.trim()) slug = val.trim();
      });

      busboy.on('file', (fieldname, file, info) => {
        const { filename } = info;
        if (!isValidSlug(slug)) {
          uploadError = 'Invalid slug provided';
          file.resume();
          return;
        }

        const ext = path.extname(filename).toLowerCase();
        if (!ALLOWED_MEDIA_EXT.has(ext)) {
          uploadError = `対応していないファイル形式です (${ext})。対応形式: ${Array.from(ALLOWED_MEDIA_EXT).join(', ')}`;
          file.resume();
          return;
        }

        // Sanitize filename
        const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
        const targetDir = path.resolve(ASSETS_DIR, slug);
        if (!isSafePath(ASSETS_DIR, targetDir)) {
          uploadError = 'Invalid asset path';
          file.resume();
          return;
        }

        fs.mkdirSync(targetDir, { recursive: true });
        const shouldConvertToWebp = CWEBP_CONVERTIBLE_EXT.has(ext);
        const baseNameWithoutExt = safeFilename.slice(0, safeFilename.length - ext.length);
        const finalFilename = shouldConvertToWebp ? `${baseNameWithoutExt}.webp` : safeFilename;
        const finalFilePath = path.resolve(targetDir, finalFilename);
        const rawWritePath = shouldConvertToWebp
          ? path.resolve(targetDir, `${safeFilename}.tmp.${Date.now()}`)
          : finalFilePath;

        const writePromise = new Promise((resolve, reject) => {
          const writeStream = fs.createWriteStream(rawWritePath);
          file.pipe(writeStream);

          writeStream.on('finish', () => {
            try {
              if (shouldConvertToWebp) {
                const cwebpBin = resolveCwebpBinary();
                execFileSync(cwebpBin, ['-q', '50', rawWritePath, '-o', finalFilePath], {
                  stdio: 'ignore',
                });
                if (fs.existsSync(rawWritePath)) {
                  fs.rmSync(rawWritePath, { force: true });
                }
              }

              uploadedFiles.push({
                filename: finalFilename,
                url: `/assets/${slug}/${finalFilename}`,
                isVideo: ext === '.mp4' || ext === '.webm' || ext === '.mov',
              });
              resolve();
            } catch (convErr) {
              if (shouldConvertToWebp && fs.existsSync(rawWritePath)) {
                fs.rmSync(rawWritePath, { force: true });
              }
              uploadError = `WebP変換エラー (cwebp): ${convErr.message}`;
              reject(convErr);
            }
          });

          writeStream.on('error', err => {
            if (shouldConvertToWebp && fs.existsSync(rawWritePath)) {
              fs.rmSync(rawWritePath, { force: true });
            }
            uploadError = `ファイル書き込みエラー: ${err.message}`;
            reject(err);
          });
        });

        writePromises.push(writePromise);
      });

      busboy.on('finish', async () => {
        try {
          await Promise.all(writePromises);
        } catch (_) {
          // uploadError is already set in writeStream error handler
        }

        if (uploadError) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: uploadError }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, files: uploadedFiles }));
      });

      req.pipe(busboy);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // API 5: Get site config (GET /api/site)
  if (pathname === '/api/site' && req.method === 'GET') {
    try {
      const siteJsonPath = path.resolve(REPO_ROOT, 'content/site.json');
      const defaultConfig = {
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

      let resultConfig = { ...defaultConfig };
      if (fs.existsSync(siteJsonPath)) {
        const parsed = JSON.parse(fs.readFileSync(siteJsonPath, 'utf8'));
        if (typeof parsed.headerCaption === 'string' && parsed.headerCaption.trim()) {
          resultConfig.headerCaption = parsed.headerCaption.trim();
        }
        if (typeof parsed.profileName === 'string' && parsed.profileName.trim()) {
          resultConfig.profileName = parsed.profileName.trim();
        }
        if (typeof parsed.profileHandle === 'string') {
          resultConfig.profileHandle = parsed.profileHandle.trim();
        }
        if (typeof parsed.bio === 'string') {
          resultConfig.bio = parsed.bio;
        }
        if (Array.isArray(parsed.socialLinks)) {
          resultConfig.socialLinks = parsed.socialLinks.filter(
            item =>
              item &&
              typeof item.label === 'string' &&
              typeof item.url === 'string' &&
              item.label.trim() !== '' &&
              item.url.trim() !== ''
          );
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(resultConfig));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // API 6: Update header.webp and site config transactionally (POST /api/site/header)
  if (pathname === '/api/site/header' && req.method === 'POST') {
    try {
      const busboy = Busboy({ headers: req.headers, limits: { fileSize: 50 * 1024 * 1024 } });
      let headerCaption = null;
      let profileName = null;
      let profileHandle = null;
      let bio = null;
      let socialLinksRaw = null;
      let tempImagePath = null;
      let tempImageExt = '';
      let uploadError = null;
      const writePromises = [];

      busboy.on('field', (fieldname, val) => {
        if (fieldname === 'headerCaption') {
          headerCaption = val.trim();
        } else if (fieldname === 'profileName') {
          profileName = val.trim();
        } else if (fieldname === 'profileHandle') {
          profileHandle = val.trim();
        } else if (fieldname === 'bio') {
          bio = val.replace(/\r\n/g, '\n');
        } else if (fieldname === 'socialLinks') {
          socialLinksRaw = val;
        }
      });

      busboy.on('file', (fieldname, file, info) => {
        const { filename } = info;
        if (!filename) {
          file.resume();
          return;
        }

        const ext = path.extname(filename).toLowerCase();
        if (!ALLOWED_MEDIA_EXT.has(ext)) {
          uploadError = `対応していない画像形式です (${ext})`;
          file.resume();
          return;
        }

        const publicDir = path.resolve(REPO_ROOT, 'public');
        fs.mkdirSync(publicDir, { recursive: true });
        const tmpFile = path.resolve(publicDir, `header.webp.tmp.${Date.now()}${ext}`);
        tempImagePath = tmpFile;
        tempImageExt = ext;

        const writePromise = new Promise((resolve, reject) => {
          const writeStream = fs.createWriteStream(tmpFile);
          file.pipe(writeStream);
          writeStream.on('finish', resolve);
          writeStream.on('error', err => {
            uploadError = `画像一時保存エラー: ${err.message}`;
            reject(err);
          });
        });

        writePromises.push(writePromise);
      });

      busboy.on('finish', async () => {
        try {
          await Promise.all(writePromises);
        } catch (_) {
          // uploadError already set
        }

        if (uploadError) {
          if (tempImagePath && fs.existsSync(tempImagePath)) {
            fs.rmSync(tempImagePath, { force: true });
          }
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: uploadError }));
          return;
        }

        try {
          // 1. 新しい画像が選択されていた場合：一時ファイル検証後、.jpg/.jpeg/.png なら cwebp -q 50 で WebP 変換し、既存 header.webp を削除してリネーム
          if (tempImagePath) {
            if (!fs.existsSync(tempImagePath) || fs.statSync(tempImagePath).size === 0) {
              if (fs.existsSync(tempImagePath)) fs.rmSync(tempImagePath, { force: true });
              throw new Error('アップロードされた画像ファイルが空です');
            }
            const targetHeaderPath = path.resolve(REPO_ROOT, 'public/header.webp');
            if (CWEBP_CONVERTIBLE_EXT.has(tempImageExt)) {
              const convertedTmpPath = `${tempImagePath}.converted.webp`;
              const cwebpBin = resolveCwebpBinary();
              execFileSync(cwebpBin, ['-q', '50', tempImagePath, '-o', convertedTmpPath], {
                stdio: 'ignore',
              });
              fs.rmSync(tempImagePath, { force: true });
              tempImagePath = convertedTmpPath;
            }
            if (fs.existsSync(targetHeaderPath)) {
              fs.rmSync(targetHeaderPath, { force: true });
            }
            fs.renameSync(tempImagePath, targetHeaderPath);
          }

          // 2. サイト設定（headerCaption / profileName / profileHandle / bio / socialLinks）を content/site.json にトランザクション保存
          const siteJsonPath = path.resolve(REPO_ROOT, 'content/site.json');
          let currentData = {
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
          if (fs.existsSync(siteJsonPath)) {
            try {
              const existing = JSON.parse(fs.readFileSync(siteJsonPath, 'utf8'));
              currentData = { ...currentData, ...existing };
            } catch (_) {
              // ignore parse error and use defaults
            }
          }

          if (headerCaption !== null) {
            currentData.headerCaption = headerCaption;
          }
          if (profileName !== null && profileName !== '') {
            currentData.profileName = profileName;
          }
          if (profileHandle !== null) {
            currentData.profileHandle = profileHandle;
          }
          if (bio !== null) {
            currentData.bio = bio;
          }
          if (socialLinksRaw !== null) {
            const parsedLinks = JSON.parse(socialLinksRaw);
            if (Array.isArray(parsedLinks)) {
              currentData.socialLinks = parsedLinks
                .map(item => ({
                  label: typeof item.label === 'string' ? item.label.trim() : '',
                  url: typeof item.url === 'string' ? item.url.trim() : '',
                }))
                .filter(item => item.label !== '' && item.url !== '');
            }
          }

          const tmpJsonPath = path.resolve(REPO_ROOT, `content/site.json.tmp.${Date.now()}`);
          fs.mkdirSync(path.dirname(siteJsonPath), { recursive: true });
          fs.writeFileSync(
            tmpJsonPath,
            JSON.stringify(currentData, null, 2) + '\n',
            'utf8'
          );
          if (fs.existsSync(siteJsonPath)) {
            fs.rmSync(siteJsonPath, { force: true });
          }
          fs.renameSync(tmpJsonPath, siteJsonPath);

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(
            JSON.stringify({
              success: true,
              ...currentData,
              imageUpdated: Boolean(tempImagePath),
            })
          );
        } catch (err) {
          if (tempImagePath && fs.existsSync(tempImagePath)) {
            fs.rmSync(tempImagePath, { force: true });
          }
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      req.pipe(busboy);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Not found
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`Local editor server running at http://${HOST}:${PORT}`);
  console.log(`Bound strictly to loopback: ${HOST}`);
});
