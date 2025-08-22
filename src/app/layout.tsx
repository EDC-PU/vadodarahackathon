import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { Inter } from "next/font/google"
import { cn } from '@/lib/utils';

const fontInter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: 'Vadodara Hackathon Portal',
  description: 'Welcome to the Vadodara Hackathon, hosted by Parul University, PIERC.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
