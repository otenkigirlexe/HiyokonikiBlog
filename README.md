# HiyokonikiBlog

![Tests](https://img.shields.io/badge/Tests-100%20passed-brightgreen)
![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black)
![React](https://img.shields.io/badge/React-19.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-3178C6)

Personal blog and homepage of **HiyokoNiki (`@otenkigirl_exe`)**, built as a fast, zero-runtime static web application powered by Next.js 16 (App Router) and Markdown content management with integrated local-only GUI editors.

🌐 **Production Website**: [https://hiyokoniki.jp/](https://hiyokoniki.jp/)

---

## 🌟 Overview & Key Features

**HiyokonikiBlog** migrated from legacy static HTML directories into a modern, maintainable **Next.js 16 Static Site Generation (SSG)** architecture while strictly preserving legacy URL compatibility (`https://hiyokoniki.jp/<YYYYMMDD>/`). It includes a dedicated local editing suite (`npm run editor`) that runs exclusively on `127.0.0.1` and is automatically stripped from production exports.

### 📝 Core Features

| Feature | Description |
| :--- | :--- |
| **2-Column Homepage (`/`)** | Responsive 2-column layout featuring the header visual & profile card on the left, and the featured latest post + searchable/filterable post archive (keyword search, year/month filters, sort order toggle, and note-style Load More) on the right. |
| **Article Detail (`/[slug]/`)** | Legacy-compatible root URL structure (`/20260726/`), Markdown rendering (images, `<video>`, custom spacing), prev/next post navigation, and smart list filter/scroll state restoration (`sessionStorage`). |
| **Dynamic OGP & Twitter Cards** | Automatic per-article OpenGraph and Twitter `summary_large_image` metadata generation using the first image of each post (falling back to `/header.webp`). |
| **Local Post Editor (`/editor/`)** | Local-only split-screen Markdown editor with sticky toolbar, real-time zero-latency preview (`useMemo`), automatic `cwebp -q 50` WebP conversion on upload, unused media auto-cleanup on save, overwrite protection, and post/asset deletion. |
| **Header & Profile Editor (`/header-editor/`)** | Local-only GUI editor for updating `public/header.webp` (transactional replacement with automatic `cwebp -q 50` conversion), header caption, profile name/handle, multi-line bio, and social link chips (add, reorder, delete). |
| **Environment & CI Diagnostics** | Hidden developer modal accessible by tapping the footer `build:` identifier 20 times, displaying Git SHA (`dev` locally), build timestamp (JST), Vitest results, and V8 coverage with 1-click clipboard copy. |

---

## 🏗️ Technical Architecture & Stack

**HiyokonikiBlog** uses Markdown + Frontmatter and JSON configuration files as a file-based single source of truth, compiling everything at build time into static HTML for Cloudflare Pages while providing a local loopback API server during authoring.

```text
 +-----------------------------+
 |   Content & Static Assets   |
 |  content/posts/*.md, public |
 +--------------+--------------+
                |
                v
 +-----------------------------+
 |    Local GUI Editor Suite   |
 |   (npm run editor / :3000)  |
 |  /editor/ & /header-editor/ |
 +--------------+--------------+
                |
                v
 +-----------------------------+
 |   CI Test & Build Engine    |
 |     (scripts/build.js)      |
 |  Vitest + Coverage + Strip  |
 +--------------+--------------+
                |
                v
 +-----------------------------+
 |       Next.js 16 (SSG)      |
 |    App Router Static Build  |
 +--------------+--------------+
                |
                v
 +-----------------------------+
 |      Cloudflare Pages       |
 |   Automated CI/CD Deploy    |
 +-----------------------------+
```

### 💻 Technologies

- **Framework**: Next.js 16.4.6 (App Router, Static HTML Export `output: 'export'`)
- **Core Library**: React 19.3.1 / TypeScript 7.0.2
- **Markdown & Metadata**: `marked` 18 + `gray-matter`
- **Styling & Typography**: Vanilla CSS (`globals.css`) with CSS Custom Properties, responsive media queries, and Google Fonts (`Noto Sans JP` via `next/font/google`)
- **Local Editor Backend**: Node.js HTTP Server (`127.0.0.1:3001`) + `busboy` (multipart media upload & transactional file writes)
- **Testing**: Vitest + React Testing Library + `@vitest/coverage-v8` (100+ automated test cases across 6 suites, 100% coverage)
- **Hosting & CI/CD**: Cloudflare Pages

---

## 📁 Repository Structure

```text
HiyokonikiBlog/
├── content/
│   ├── posts/                        # 93+ Markdown blog posts (<YYYYMMDD>.md)
│   ├── site.json                     # Header caption, profile bio, and social links
│   └── build-info.json               # Auto-generated build, Git SHA, test & coverage stats
├── public/
│   ├── assets/                       # Per-post images and videos (/assets/<slug>/*)
│   ├── header.webp                   # Homepage hero header image
│   └── icon.webp                     # High-resolution site & profile icon (WebP)
├── scripts/
│   ├── dev-all.js                    # Launches Local Editor API (:3001) + Next.js Dev (:3000)
│   └── build.js                      # Updates build-info.json, runs Next build, strips editors in CI
├── src/
│   ├── __tests__/                    # Vitest test suite (01_ui_layout ~ 06_data_integrity)
│   ├── app/
│   │   ├── [slug]/page.tsx           # Individual blog post page & OGP metadata generator
│   │   ├── components/               # UI components (PostList, FeaturedPostCard, FooterCreditsWithModal, etc.)
│   │   ├── editor/page.tsx           # Local-only Post Editor GUI (/editor/)
│   │   ├── header-editor/page.tsx    # Local-only Header & Profile Editor GUI (/header-editor/)
│   │   ├── globals.css               # Site-wide styles, layout grids, and mobile responsive rules
│   │   ├── layout.tsx                # Root layout, Noto Sans JP font, header & footer
│   │   └── page.tsx                  # 2-column homepage server component
│   └── lib/
│       └── posts.ts                  # Data access layer for Markdown posts and site.json
├── tools/
│   └── local-editor/
│       └── server.js                 # Loopback-only REST API for post/asset/profile CRUD
├── next.config.mjs                   # Next.js configuration (Static export & environment flags)
├── vitest.config.ts                  # Vitest & V8 coverage configuration
└── package.json                      # Scripts and dependencies
```

---

## 📊 Data Schema & Invariants

All blog content and site settings are stored as plain text files in `content/` and static media in `public/`:

| File / Directory | Entity | Primary Identifier | Description |
| :--- | :--- | :--- | :--- |
| `content/posts/<slug>.md` | Blog Post | `slug` (`YYYYMMDD`) | Frontmatter (`title`, `date`, `slug`) and Markdown body. |
| `public/assets/<slug>/*` | Post Media | File path | WebP/PNG/JPG images and MP4/WebM videos referenced by `/assets/<slug>/...`. |
| `content/site.json` | Site Profile | Singleton JSON | `headerCaption`, `profileName`, `profileHandle`, `bio`, and `socialLinks[]`. |
| `content/build-info.json` | Build Diagnostics | Singleton JSON | Version, Git commit SHA, JST build timestamp, Vitest counts, and V8 coverage percentages. |

### Data Integrity & Page Calculation Rules

- **Reverse Pagination Calculation (`listPage`)**: The newest post (`index === 0`) is displayed in the "Latest Post" (`FeaturedPostCard`) slot on Page 1, while subsequent posts (`index >= 1`) are paginated at 10 posts per page (`Math.floor((index - 1) / 10) + 1`). Navigating via "Next / Prev Post" automatically updates the "Back to List" button to return to the exact pagination page where that post resides.
- **Asset Existence Validation**: Automated tests (`06_data_integrity.test.ts`) parse every Markdown file and verify that 100% of referenced `/assets/...` images and videos physically exist under `public/assets/`.
- **Production Isolation**: When building with `--ci` or `CF_PAGES=1`, `scripts/build.js` sets `NEXT_PUBLIC_IS_LOCAL_BUILD=false` and physically removes `out/editor` and `out/header-editor` from the static export bundle.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20.x or later
- **npm**: v10.x or later

### Installation

```powershell
# Clone the repository
git clone https://github.com/otenkigirlexe/HiyokonikiBlog.git
cd HiyokonikiBlog

# Install dependencies
npm install
```

### Local Development & Editing

```powershell
# Start Next.js dev server (:3000) + Local Editor API (:3001)
npm run editor
```

- **Blog Homepage**: `http://localhost:3000/`
- **Local Post Editor**: `http://localhost:3000/editor/`
- **Header & Profile Editor**: `http://localhost:3000/header-editor/`

### Running Tests & Building

```powershell
# Run Vitest unit & integration test suite (100 tests)
npm test

# Run tests with V8 coverage report
npm run test:coverage

# Run full CI workflow (Vitest + Coverage -> Update build-info.json -> Next.js Static Export)
npm run build:ci

# Preview production static export build locally
npx serve out
```

---

## 🧪 Testing & Quality Assurance

The project enforces strict automated quality checks across **6 test suites (100+ tests total, 100% coverage)**:

- **100+ unit, integration, and UI tests** covering navigation, keyword search, dynamic year/month filters, combined filter matrices, and server components.
- **100% code coverage (Lines, Functions, Branches, Statements)** tracked automatically on each CI build and embedded into the application's footer diagnostics modal.
- **Strict asset & relational integrity validation** ensuring all Markdown posts and referenced media files physically exist before deployment.

1. **`01_ui_layout.test.tsx`**: Header/footer rendering, `site.json` profile & SNS chip reflection, local vs. production environment branching, OGP metadata, and the 20-tap developer diagnostics modal.
2. **`02_post_list_pagination.test.tsx`**: Featured latest post card, note-style Load More UI, real-time keyword search (including UUIDv7 zero-result check), exhaustive real-data year/month filter & sort combinations, and `sessionStorage` state restoration.
3. **`03_post_detail.test.tsx`**: Static params generation, dynamic OGP image extraction, Markdown HTML rendering (`<img>`, `<video>`, custom `<br>` spacing), prev/next article boundaries, and 404 handling.
4. **`04_post_editor.test.tsx`**: Local editor security guard in production, post loading, real-time preview, `409 Conflict` overwrite guard, media upload insertion, unused media cleanup, and post/asset deletion.
5. **`05_header_editor.test.tsx`**: Live profile/caption preview, adding/reordering/deleting social links, image selection preview (`URL.createObjectURL`), and transactional save API verification.
6. **`06_data_integrity.test.ts`**: Full scan of all 100+ Markdown files, slug uniqueness, `YYYY-MM-DD` date validation, 100% physical existence verification of all referenced images/videos in `public/assets/`, and `listPage` calculation invariants.

---

## 📝 License & Copyright

- **Content & Media**: All blog articles, photographs, illustrations, icons, and personal content belong to **HiyokoNiki (`@otenkigirl_exe`)**. (c) HiyokoNiki All Rights Reserved.
- **Source Code**: The application source code and architecture are maintained for `hiyokoniki.jp`.
