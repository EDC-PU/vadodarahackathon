
import type {NextConfig} from 'next';
import { config } from 'dotenv';

config({ path: '.env.local' });

const nextConfig: NextConfig = {
  // Trigger cache invalidation to fix HMR chunk loading issue.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pierc-portal-new.vercel.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.pierc.org',
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'www.paruluniversity.ac.in',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'mnaignsupdlayf72.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
