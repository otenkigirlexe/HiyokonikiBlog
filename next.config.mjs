/** @type {import('next').NextConfig} */
const isCloudflare = process.env.CF_PAGES === '1' || Boolean(process.env.CF_PAGES_COMMIT_SHA);
const isLocalBuild = !isCloudflare;
const isDevServer = process.env.NODE_ENV === 'development';

const nextConfig = {
  // next dev（npm run editor）時は output: 'export' を外すことで
  // 全93記事の並列プリフェッチによるJSONパース競合や500エラーを防ぐ
  ...(isDevServer ? {} : { output: 'export' }),
  allowedDevOrigins: ['172.20.10.4', 'localhost', '127.0.0.1'],
  env: {
    NEXT_PUBLIC_IS_LOCAL_BUILD: isLocalBuild ? 'true' : 'false',
  },
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
