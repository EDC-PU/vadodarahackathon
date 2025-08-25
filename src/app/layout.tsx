
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

export const metadata: Metadata = {
  title: 'Vadodara Hackathon 6.0 | PIERC X PU',
  description: 'Welcome to the Vadodara Hackathon 6.0 , hosted by Parul University, PIERC.',
  icons: {
    icon: '/favicon.ico',
  },
  verification: {
    google: 'google992b607e8b55e6e8',
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
        {/* Google tag (gtag.js) */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=YOUR_GA_MEASUREMENT_ID`}
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'YOUR_GA_MEASUREMENT_ID');
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
