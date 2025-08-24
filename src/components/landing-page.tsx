

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Award, Code, Cpu, Mail, MapPin, Phone, Users, Calendar, Trophy, FileText, BarChart, FileQuestion, Loader2, LayoutDashboard, MoveRight } from 'lucide-react';
import Image from 'next/image';
import { INSTITUTES } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useState, useEffect, useRef } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from './ui/skeleton';
import { AnnouncementsSection } from './announcements-section';
import { cn } from '@/lib/utils';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import Autoplay from "embla-carousel-autoplay"
import { Announcement } from '@/lib/types';
import { motion, useAnimation } from "framer-motion";


interface SpocDetails {
  [key: string]: { name: string; email: string; contact: string }
}

interface LandingPageProps {
  spocDetails: SpocDetails;
  announcements: Announcement[];
}

const AnimatedSection = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useScrollAnimation(ref);

  return (
    <section
      ref={ref}
      className={cn(
        'py-20 md:py-28 scroll-animate',
        isInView ? 'in-view' : '',
        className
      )}
    >
      {children}
    </section>
  );
};

const HeroSection = () => {
    const tagline = "Your Gateway to Smart India Hackathon 2025";
    const controls = useAnimation();

    useEffect(() => {
        const sequence = async () => {
            await controls.start("visible");
        };
        sequence();
    }, [controls]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.3, delayChildren: 0.2 },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
    };
    
    const svgVariants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: 0.05,
            },
        },
    };

    const pathVariants = {
        hidden: {
            pathLength: 0,
            fill: "rgba(255, 255, 255, 0)",
        },
        visible: {
            pathLength: 1,
            fill: "rgba(255, 255, 255, 1)",
            transition: {
                pathLength: { type: "spring", duration: 1.5, bounce: 0 },
                fill: {
                    delay: 1.2,
                    duration: 0.8,
                },
            },
        },
    };

    return (
        <section id="home" className="relative min-h-[90vh] py-20 md:py-32 flex items-center justify-center overflow-hidden bg-brand-black">
            <div className="absolute inset-0 z-0">
                 {/* Animated Streaks */}
                <div className="absolute top-0 left-1/4 w-1 h-full bg-brand-red/20 animate-light-streaks" style={{ animationDelay: '0s' }}></div>
                <div className="absolute top-0 left-2/4 w-1 h-full bg-brand-orange/20 animate-light-streaks" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-0 left-3/4 w-1 h-full bg-brand-yellow/20 animate-light-streaks" style={{ animationDelay: '4s' }}></div>
                 {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-red/20 via-transparent to-brand-orange/20 animate-gradient-pan bg-[length:200%_200%]" />
            </div>

            <motion.div 
                className="container max-w-7xl text-center z-10 flex flex-col items-center"
                variants={containerVariants}
                initial="hidden"
                animate={controls}
            >
                <motion.h2
                    className="text-xl md:text-2xl font-medium tracking-wider text-white/80"
                    variants={itemVariants}
                >
                     {tagline.split(" ").map((word, index) => {
                        if (word === "Hackathon" || word === "2025") {
                            return (
                                <motion.span 
                                    key={index} 
                                    className="text-brand-orange animate-pulse"
                                    style={{textShadow: '0 0 5px #FF1E1E'}}
                                >
                                    {word}{' '}
                                </motion.span>
                            );
                        }
                        return <span key={index}>{word} </span>;
                    })}
                </motion.h2>

                <motion.div variants={itemVariants} className="my-8">
                     <motion.svg 
                        width="100%" 
                        height="auto" 
                        viewBox="0 0 655 121" 
                        className="max-w-xl w-full h-auto drop-shadow-[0_0_10px_hsl(var(--brand-orange)/0.6)]"
                        variants={svgVariants}
                        initial="hidden"
                        animate="visible"
                    >
                         <defs>
                            <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style={{stopColor: 'hsl(var(--brand-yellow))'}} />
                                <stop offset="50%" style={{stopColor: 'hsl(var(--brand-orange))'}} />
                                <stop offset="100%" style={{stopColor: 'hsl(var(--brand-red))'}} />
                            </linearGradient>
                        </defs>
                        <motion.path 
                            d="M87.14 84.34V37.24H92.24V58.44L105.74 37.24H111.44L96.84 59.84L111.84 84.34H106.14L94.74 64.94L92.24 67.54V84.34H87.14Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M117.84 84.34V37.24H141.54V42.34H122.94V57.64H139.54V62.74H122.94V84.34H117.84Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M148.14 84.34V37.24H153.24V84.34H148.14Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M160.04 84.34V37.24H165.14V84.34H160.04Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M201.24 73.34L204.14 84.34H198.84L190.14 59.84L181.84 84.34H176.54L179.44 73.34H168.04V37.24H212.84V73.34H201.24ZM188.04 55.44L183.94 42.34H173.14V73.34H174.54L184.24 42.64L190.14 55.44H188.04Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M219.44 84.34V37.24H224.54V84.34H219.44Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M246.34 85.34C240.34 85.34 235.34 83.84 231.34 80.84L233.84 76.44C237.04 78.84 241.14 80.04 245.14 80.04C248.14 80.04 250.34 79.24 251.74 77.64C253.14 76.04 253.84 74.04 253.84 71.64V70.04C250.64 73.24 246.24 74.84 240.64 74.84C234.04 74.84 228.84 72.54 225.04 68.04C221.24 63.44 219.34 57.64 219.34 50.54C219.34 43.44 221.24 37.64 225.04 33.14C228.84 28.64 234.04 26.34 240.64 26.34C246.24 26.34 250.64 27.94 253.84 31.14V26.84H258.94V71.64C258.94 76.04 257.94 79.44 255.94 81.84C253.94 84.24 250.64 85.34 246.34 85.34ZM244.74 69.74C248.54 69.74 251.64 68.24 254.04 65.24C256.54 62.24 257.74 58.14 257.74 52.84C257.74 47.54 256.54 43.44 254.04 40.54C251.64 37.64 248.54 36.14 244.74 36.14C240.94 36.14 237.84 37.64 235.44 40.54C233.04 43.44 231.84 47.54 231.84 52.84C231.84 58.14 233.04 62.24 235.44 65.24C237.84 68.24 240.94 69.74 244.74 69.74Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M283.65 84.34L266.05 37.24H272.25L285.35 74.24L298.45 37.24H304.65L287.05 84.34H283.65Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M336.56 85.34C329.86 85.34 324.46 83.44 320.36 79.64L323.46 75.54C326.66 78.44 330.96 79.94 336.26 79.94C342.36 79.94 345.36 77.84 345.36 73.64C345.36 71.94 344.86 70.54 343.86 69.44C342.86 68.34 341.26 67.24 339.06 66.14L332.36 62.74C327.96 60.54 324.56 58.34 322.16 56.14C319.76 53.94 318.56 50.94 318.56 47.14C318.56 42.14 320.56 38.24 324.56 35.44C328.56 32.64 333.66 31.24 339.86 31.24C344.86 31.24 349.36 32.44 353.36 34.84L350.86 39.14C347.86 37.44 344.46 36.54 340.66 36.54C335.56 36.54 333.06 38.24 333.06 41.64C333.06 43.14 333.56 44.34 334.56 45.24C335.56 46.14 337.26 46.94 339.66 47.64L346.56 50.94C352.36 53.54 355.96 56.24 357.36 59.04C358.76 61.84 359.46 65.44 359.46 69.84C359.46 75.34 357.26 79.64 352.86 82.74C348.56 85.74 343.06 85.34 336.56 85.34Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M366.52 84.34V37.24H371.62V84.34H366.52Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M400.91 84.34V37.24H418.51C425.81 37.24 431.11 38.84 434.41 42.04C437.81 45.24 439.51 49.64 439.51 55.24C439.51 60.84 437.81 65.24 434.41 68.44C431.11 71.64 425.81 73.24 418.51 73.24H406.01V84.34H400.91ZM418.11 68.14C422.01 68.14 424.91 66.84 426.81 64.24C428.81 61.64 429.81 58.44 429.81 54.64C429.81 50.84 428.81 47.64 426.81 45.04C424.91 42.44 422.01 41.14 418.11 41.14H406.01V68.14H418.11Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M472.01 84.34V37.24H477.11V73.44L490.41 37.24H496.21L480.91 63.64L496.81 84.34H490.81L479.21 66.84L477.11 69.14V84.34H472.01Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M523.51 84.34V37.24H528.61V84.34H523.51Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M536.01 84.34V37.24H541.11V84.34H536.01Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M584.21 84.34L577.81 73.14C579.51 71.94 580.91 70.34 582.01 68.34C583.11 66.34 583.61 64.14 583.61 61.74C583.61 56.64 581.81 52.64 578.21 49.74C574.61 46.84 569.81 45.34 563.81 45.34C558.81 45.34 554.51 46.54 550.91 49.04L553.71 53.04C556.51 51.14 559.81 50.24 563.61 50.24C567.81 50.24 570.81 51.54 572.61 54.14C574.41 56.74 575.31 59.44 575.31 62.24C575.31 64.34 574.81 66.14 573.81 67.64C572.81 69.14 571.41 70.64 569.61 72.14L562.91 76.94L558.61 84.34H544.11V37.24H590.21V42.34H549.21V79.24H560.81L573.51 61.64L578.81 68.04L582.01 64.04L584.21 84.34Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M624.96 85.34C618.36 85.34 613.16 83.04 609.36 78.54C605.56 73.94 603.66 68.14 603.66 61.04C603.66 53.94 605.56 48.14 609.36 43.64C613.16 39.14 618.36 36.84 624.96 36.84C631.56 36.84 636.76 39.14 640.56 43.64C644.36 48.14 646.26 53.94 646.26 61.04C646.26 68.14 644.36 73.94 640.56 78.54C636.76 83.04 631.56 85.34 624.96 85.34ZM624.96 80.24C629.76 80.24 633.46 78.14 636.06 73.94C638.66 69.74 639.96 65.14 639.96 60.14C639.96 55.14 638.66 50.54 636.06 46.34C633.46 42.14 629.76 40.04 624.96 40.04C620.16 40.04 616.46 42.14 613.86 46.34C611.26 50.54 609.96 55.14 609.96 60.14C609.96 65.14 611.26 69.74 613.86 73.94C616.46 78.14 620.16 80.24 624.96 80.24Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M60.42 84.34V37.24H65.52V58.44L79.02 37.24H84.72L70.12 59.84L85.12 84.34H79.42L68.02 64.94L65.52 67.54V84.34H60.42Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M26.42 84.34L9.82 37.24H16.02L29.12 74.24L42.22 37.24H48.42L30.82 84.34H26.42Z" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M48.06 10.96C48.06 17.56 46.16 22.86 42.36 26.86C38.56 30.86 33.66 32.86 27.66 32.86C21.66 32.86 16.76 30.86 12.96 26.86C9.16 22.86 7.26 17.56 7.26 10.96C7.26 4.36 9.16 -0.94 12.96 -4.94C16.76 -8.94 21.66 -10.94 27.66 -10.94C33.66 -10.94 38.56 -8.94 42.36 -4.94C46.16 -0.94 48.06 4.36 48.06 10.96ZM27.66 -5.84C23.86 -5.84 20.76 -4.34 18.36 -1.34C15.96 1.66 14.76 5.76 14.76 11.06C14.76 16.36 15.96 20.46 18.36 23.36C20.76 26.26 23.86 27.76 27.66 27.76C31.46 27.76 34.56 26.26 36.96 23.36C39.36 20.46 40.56 16.36 40.56 11.06C40.56 5.76 39.36 1.66 36.96 -1.34C34.56 -4.34 31.46 -5.84 27.66 -5.84Z" transform="translate(620.1 60.3) scale(1.2)" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M33.64 26.89L25.84 12.49L33.84 -1.71H26.34L20.94 7.69L15.54 -1.71H8.04L16.04 12.49L8.24 26.89H15.74L20.94 17.29L26.14 26.89H33.64Z" transform="translate(620.1 60.3) scale(1.2)" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                        <motion.path 
                            d="M-28.75 26.89V-1.71H-23.65V26.89H-28.75Z" transform="translate(620.1 60.3) scale(1.2)" 
                            stroke="url(#shimmer)" strokeWidth="0.5" variants={pathVariants}
                        />
                    </motion.svg>
                </motion.div>
                
                <motion.div 
                    className="flex flex-col sm:flex-row justify-center items-center gap-6"
                    variants={itemVariants}
                >
                    <Button
                        size="lg"
                        className="bg-transparent border-2 border-brand-yellow text-brand-yellow rounded-full animate-neon-pulse transition-transform hover:scale-105"
                        asChild
                    >
                        <Link href="/register">Register Now</Link>
                    </Button>
                     <Button variant="link" size="lg" className="text-white group text-lg rounded-full" asChild>
                        <Link href="#about">
                            Learn More
                            <span className="block max-w-0 group-hover:max-w-full transition-all duration-300 h-0.5 bg-brand-red"></span>
                        </Link>
                    </Button>
                </motion.div>
            </motion.div>
        </section>
    );
};


export default function LandingPage({ spocDetails, announcements }: LandingPageProps) {
  const [selectedInstitute, setSelectedInstitute] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const autoplayPlugin = useRef(Autoplay({ delay: 2000, stopOnInteraction: true }));

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About', href: '#about' },
    { name: 'Timeline', href: '#timeline' },
    { name: 'Rewards', href: '#rewards' },
    { name: 'SPOCs', href: '#spocs'},
    { name: 'Contact', href: '#contact' },
  ];
  
  const aboutImages = [
    "https://i.ibb.co/ZYrrS9h/Screenshot-2024-08-19-111659.png",
    "https://i.ibb.co/MgFsf84/Screenshot-2024-08-19-111647.png",
    "https://i.ibb.co/3dTYdbL/Screenshot-2024-08-19-111637.png",
  ];

  const galleryImages = [
    '/VadodaraHackathon/1.jpg',
    '/VadodaraHackathon/2.jpg',
    '/VadodaraHackathon/3.jpg',
    '/VadodaraHackathon/4.jpg',
    '/VadodaraHackathon/5.jpg',
    '/VadodaraHackathon/6.jpg',
    '/VadodaraHackathon/7.jpg',
    '/VadodaraHackathon/8.jpg',
    '/VadodaraHackathon/9.jpg',
    '/VadodaraHackathon/10.jpg',
    '/VadodaraHackathon/11.jpg',
    '/VadodaraHackathon/12.jpg',
    '/VadodaraHackathon/13.jpg',
    '/VadodaraHackathon/14.jpg',
    '/VadodaraHackathon/15.jpg',
  ];
  

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/40">
      <header className="sticky top-0 z-50 w-full border-b border-border/20 bg-background/50 backdrop-blur-lg">
        <div className="container flex h-28 max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl" prefetch={false}>
             <Image src="https://www.pierc.org/_next/static/media/PIERC%20WHITE.a9ef7cc8.svg" alt="Vadodara Hackathon Logo" width={150} height={150}/>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Button key={link.name} variant="ghost" asChild>
                <Link href={link.href} className="text-foreground/80 transition-colors hover:text-foreground" prefetch={false}>
                  {link.name}
                </Link>
              </Button>
            ))}
          </nav>
           <div className="flex items-center gap-2">
              {authLoading ? (
                  <Skeleton className="h-10 w-40 rounded-full" />
              ) : user ? (
                  <Button asChild className="rounded-full glass-button hover:scale-105 transition-transform !text-foreground">
                    <Link href={`/${user.role}`}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Go to Dashboard
                    </Link>
                  </Button>
              ) : (
                  <>
                      <Button variant="ghost" asChild className="rounded-full">
                        <Link href="/login">Login</Link>
                      </Button>
                      <Button asChild className="rounded-full glass-button hover:scale-105 transition-transform !text-foreground">
                        <Link href="/register">Register <MoveRight className="ml-2 h-4 w-4" /></Link>
                      </Button>
                  </>
              )}
            </div>
        </div>
      </header>

      <main className="flex-1">
        <HeroSection />

        <AnimatedSection id="announcements">
          <div className="container max-w-4xl">
            <AnnouncementsSection audience="all" initialAnnouncements={announcements} />
          </div>
        </AnimatedSection>
        
        <AnimatedSection id="rewards" className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-accent/5 to-background -z-10"></div>
            <div className="container max-w-7xl text-center">
                <h2 className="text-3xl font-bold mb-4 font-headline">Rewards & Recognition</h2>
                <p className="max-w-3xl mx-auto text-foreground/80 mb-12">
                Winners get felicitated and recommended to SIH 2025, plus incubation support, funding opportunities, IP filing assistance, and continuous expert mentoring.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="glass-card p-6 text-center transform hover:-translate-y-2 transition-transform duration-300">
                        <Trophy className="h-10 w-10 text-amber-400 mx-auto mb-4" />
                        <CardTitle className="text-2xl mt-2">Winners Circle</CardTitle>
                        <CardContent className="mt-4 text-foreground/80 p-0">
                            <p>Direct recommendation to SIH 2025 and grand felicitation.</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card p-6 text-center transform hover:-translate-y-2 transition-transform duration-300">
                        <Award className="h-10 w-10 text-primary mx-auto mb-4" />
                        <CardTitle className="text-2xl mt-2">Growth Support</CardTitle>
                        <CardContent className="mt-4 text-foreground/80 p-0">
                            <p>Incubation, Funding, IP Filing, & Market Access.</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card p-6 text-center transform hover:-translate-y-2 transition-transform duration-300">
                        <Users className="h-10 w-10 text-accent mx-auto mb-4" />
                        <CardTitle className="text-2xl mt-2">Expert Guidance</CardTitle>
                        <CardContent className="mt-4 text-foreground/80 p-0">
                            <p>Continuous mentoring from industry leaders and experts.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AnimatedSection>

        <AnimatedSection id="about">
          <div className="container max-w-7xl grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold mb-4 font-headline">About The Hackathon</h2>
              <p className="text-foreground/80">
               Vadodara Hackathon 6.0 is an internal hackathon organized with the primary purpose of fostering innovation and problem-solving within our community. The event aims to bring together creative minds and tech enthusiasts to collaborate, brainstorm, and develop innovative solutions to real-world problems.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="glass-card p-4 rounded-lg text-center">
                      <BarChart className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold">400+</p>
                      <p className="text-sm text-muted-foreground">Teams Expected</p>
                  </div>
                  <div className="glass-card p-4 rounded-lg text-center">
                      <FileQuestion className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold">250+</p>
                      <p className="text-sm text-muted-foreground">Problem Statements</p>
                  </div>
              </div>
            </div>
            <div>
              <Carousel className="w-full max-w-xl mx-auto" plugins={[autoplayPlugin.current]}>
                <CarouselContent>
                  {aboutImages.map((src, index) => (
                    <CarouselItem key={index}>
                      <Image
                        src={src}
                        alt={`Vadodara Hackathon - Image ${index + 1}`}
                        width={600}
                        height={400}
                        className="rounded-lg shadow-xl object-cover aspect-[3/2] border border-primary/20"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-[-1rem]" />
                <CarouselNext className="right-[-1rem]"/>
              </Carousel>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection id="timeline">
            <div className="container max-w-4xl text-center">
                <h2 className="text-3xl font-bold mb-4 font-headline">Timeline</h2>
                <p className="max-w-2xl mx-auto text-foreground/80 mb-8">
                  Mark your calendars for these important dates.
                </p>
                <div className="flex flex-col md:flex-row justify-center items-center gap-8">
                   <Card className="glass-card p-6 text-center transform hover:-translate-y-2 transition-transform duration-300">
                        <Calendar className="h-10 w-10 text-primary mx-auto mb-4" />
                        <CardTitle className="text-xl mt-2">Intra-Institute Round</CardTitle>
                        <CardContent className="mt-2 text-foreground/80 p-0">
                            <p>3rd, 4th & 5th September, 2025</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card p-6 text-center transform hover:-translate-y-2 transition-transform duration-300">
                        <Trophy className="h-10 w-10 text-primary mx-auto mb-4" />
                        <CardTitle className="text-xl mt-2">Grand Finale</CardTitle>
                        <CardContent className="mt-2 text-foreground/80 p-0">
                            <p>6th September, 2025</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AnimatedSection>

        <AnimatedSection id="gallery">
            <div className="container max-w-7xl">
                <h2 className="text-3xl font-bold text-center mb-12 font-headline">Gallery</h2>
                 <Carousel className="w-full" opts={{ loop: true }} plugins={[autoplayPlugin.current]}>
                    <CarouselContent>
                    {galleryImages.map((src, index) => (
                        <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                            <div className="p-1">
                                <Card className="overflow-hidden glass-card">
                                    <CardContent className="p-0">
                                        <Image
                                            src={src}
                                            alt={`Gallery Image ${index + 1}`}
                                            width={600}
                                            height={400}
                                            className="w-full h-full object-cover aspect-video transition-transform hover:scale-105"
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        </CarouselItem>
                    ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            </div>
        </AnimatedSection>
        
        <AnimatedSection id="spocs">
            <div className="container max-w-4xl text-center">
                <h2 className="text-3xl font-bold mb-4 font-headline">Institute SPOCs</h2>
                <p className="max-w-2xl mx-auto text-foreground/80 mb-8">
                  Find the Single Point of Contact (SPOC) for your institute.
                </p>
                <div className="flex flex-col items-center gap-4">
                    <Select onValueChange={setSelectedInstitute}>
                        <SelectTrigger className="w-full max-w-md glass-card !border-primary/50">
                            <SelectValue placeholder="Select your institute to view SPOC details" />
                        </SelectTrigger>
                        <SelectContent>
                            {INSTITUTES.map((institute) => (
                            <SelectItem key={institute} value={institute}>
                                {institute}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedInstitute && (
                        <Card className="w-full max-w-md mt-4 glass-card text-left animate-in fade-in-50">
                            <CardHeader>
                                <CardTitle>{selectedInstitute}</CardTitle>
                            </CardHeader>
                             <CardContent>
                                {spocDetails[selectedInstitute] ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Users className="h-5 w-5 text-primary" />
                                        <span>{spocDetails[selectedInstitute].name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-primary" />
                                        <a href={`mailto:${spocDetails[selectedInstitute].email}`} className="hover:underline">{spocDetails[selectedInstitute].email}</a>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-5 w-5 text-primary" />
                                         <a href={`tel:${spocDetails[selectedInstitute].contact}`} className="hover:underline">{spocDetails[selectedInstitute].contact}</a>
                                    </div>
                                </div>
                                ) : (
                                <p className="text-foreground/80">No SPOC assigned for this institute yet. Please check back later.</p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AnimatedSection>


        <AnimatedSection id="contact">
            <div className="container max-w-7xl">
                <h2 className="text-3xl font-bold text-center mb-12 font-headline">Get In Touch</h2>
                <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="glass-card p-6 flex flex-col items-center">
                    <Mail className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold">Email Us</h3>
                    <a href="mailto:pierc@paruluniversity.ac.in" className="text-foreground/80 hover:text-primary">pierc@paruluniversity.ac.in</a>
                </div>
                <div className="glass-card p-6 flex flex-col items-center">
                    <Phone className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold">Phone</h3>
                    <p className="text-foreground/80">0266-8260350</p>
                </div>
                <div className="glass-card p-6 flex flex-col items-center">
                    <MapPin className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold">Our Address</h3>
                    <p className="text-foreground/80 max-w-xs">PARUL INNOVATION & ENTREPRENEURSHIP RESEARCH CENTRE (PIERC), Parul University</p>
                </div>
                </div>
            </div>
        </AnimatedSection>
      </main>

      <footer className="bg-secondary/20 border-t border-secondary/40">
        <div className="container max-w-7xl py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                  <img src="https://www.pierc.org/assets/logopu.svg" alt="Parul University Logo" className="h-12" />
                  <div className="w-px h-10 bg-border"></div>
                  <img src="https://www.pierc.org/_next/static/media/PIERC%20WHITE.a9ef7cc8.svg" alt="PIERC Logo" className="h-10" />
              </div>
              <div className="text-center md:text-right text-sm text-foreground/60">
                <p>&copy; {new Date().getFullYear()} Vadodara Hackathon. All rights reserved.</p>
                <div className="flex gap-4 justify-center md:justify-end mt-1">
                    <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
