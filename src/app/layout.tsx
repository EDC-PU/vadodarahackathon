
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { Inter } from "next/font/google"
import { cn } from '@/lib/utils';
import Script from 'next/script';

const fontInter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const title = 'Vadodara Hackathon 6.0 | PIERC & Parul University';
const description = 'Join Vadodara Hackathon 6.0, the premier innovation challenge hosted by PIERC and Parul University. Collaborate, code, and create solutions for real-world problems. Register now!';
const url = 'https://vadodarahackathon.pierc.org';

export const metadata: Metadata = {
  title: title,
  description: description,
  keywords: ['Vadodara Hackathon', 'Parul University', 'PIERC', 'Hackathon 2025', 'Smart India Hackathon', 'SIH', 'Coding Competition', 'Innovation Challenge', 'Gujarat'],
  authors: [{ name: 'Parul University & PIERC' }],
  metadataBase: new URL(url),
  openGraph: {
    title: title,
    description: description,
    url: url,
    siteName: 'Vadodara Hackathon 6.0 Portal',
    images: [
      {
        url: 'https://www.pierc.org/vhlogo.png', // Main OG image
        width: 1200,
        height: 630,
        alt: 'Vadodara Hackathon 6.0 Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: title,
    description: description,
    images: ['https://www.pierc.org/vhlogo.png'],
  },
  icons: {
    icon: '/favicon.ico',
  },
  verification: {
    google: 'Fs3-LSr4iB5QCFGSJPXhKQ7nTRZZUOMMysGEj3cz0Po',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="Fs3-LSr4iB5QCFGSJPXhKQ7nTRZZUOMMysGEj3cz0Po" />
        {/* Google tag (gtag.js) */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=G-3P33CMH217`}
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-3P33CMH217');
            `,
          }}
        />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-body antialiased dark",
          fontInter.variable
        )}
        suppressHydrationWarning={true}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
