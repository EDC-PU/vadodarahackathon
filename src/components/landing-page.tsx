

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
import Autoplay from "embla-carousel-autoplay"
import { Announcement } from '@/lib/types';
import { motion, useAnimation, useInView } from "framer-motion";
import { CountUp } from './count-up';


interface SpocDetails {
  [key: string]: { name: string; email: string; contact: string }
}

interface LandingPageProps {
  spocDetails: SpocDetails;
  announcements: Announcement[];
}

const AnimatedSection = ({ children, className, id }: { children: React.ReactNode, className?: string, id: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={cn('py-20 md:py-28', className)}
    >
      {children}
    </motion.section>
  );
};


const SectionTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <h2
      className={cn("text-3xl font-bold mb-4 font-headline relative inline-block", className)}
    >
      {children}
       <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-brand-yellow via-brand-orange to-brand-red"
        initial={{ width: 0 }}
        whileInView={{ width: "100%" }}
        transition={{ duration: 1, delay: 0.5 }}
        viewport={{ once: true }}
      />
    </h2>
  );
};


const HeroSection = () => {
    const tagline = "Your Gateway to Smart India Hackathon 2025";
    const controls = useAnimation();
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true });


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
                ref={ref}
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
                
                 <motion.div 
                    variants={itemVariants} 
                    className="my-8"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.8, type: "spring" }}
                >
                     <motion.div
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                        transition={{ delay: 0.8, duration: 1 }}
                        className={isInView ? 'glitch' : ''}
                        data-text="Vadodara Hackathon 6.0"
                    >
                        <Image
                            src="/vhlogosvg.svg"
                            alt="Vadodara Hackathon 6.0 Logo"
                            width={600}
                            height={120}
                            className="max-w-xl w-full h-auto drop-shadow-[0_0_10px_hsl(var(--brand-orange)/0.6)]"
                            priority
                        />
                    </motion.div>
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
                <SectionTitle>Rewards &amp; Recognition</SectionTitle>
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
                            <p>Incubation, Funding, IP Filing, &amp; Market Access.</p>
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
               <SectionTitle>About The Hackathon</SectionTitle>
              <p className="text-foreground/80">
               Vadodara Hackathon 6.0 is an internal hackathon organized with the primary purpose of fostering innovation and problem-solving within our community. The event aims to bring together creative minds and tech enthusiasts to collaborate, brainstorm, and develop innovative solutions to real-world problems.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                  <motion.div
                    className="glass-card p-4 rounded-lg text-center"
                    whileHover={{ scale: 1.05, boxShadow: "0px 0px 15px hsl(var(--brand-orange))" }}
                  >
                      <BarChart className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold"><CountUp end={400} />+</p>
                      <p className="text-sm text-muted-foreground">Teams Expected</p>
                  </motion.div>
                  <motion.div
                     className="glass-card p-4 rounded-lg text-center"
                     whileHover={{ scale: 1.05, boxShadow: "0px 0px 15px hsl(var(--brand-red))" }}
                  >
                      <FileQuestion className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold"><CountUp end={250} />+</p>
                      <p className="text-sm text-muted-foreground">Problem Statements</p>
                  </motion.div>
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
                 <SectionTitle>Timeline</SectionTitle>
                <p className="max-w-2xl mx-auto text-foreground/80 mb-8">
                  Mark your calendars for these important dates.
                </p>
                <div className="flex flex-col md:flex-row justify-center items-center gap-8">
                   <Card className="glass-card p-6 text-center transform hover:-translate-y-2 transition-transform duration-300">
                        <Calendar className="h-10 w-10 text-primary mx-auto mb-4" />
                        <CardTitle className="text-xl mt-2">Intra-Institute Round</CardTitle>
                        <CardContent className="mt-2 text-foreground/80 p-0">
                            <p>3rd, 4th &amp; 5th September, 2025</p>
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
                <div className="text-center">
                    <SectionTitle>Gallery</SectionTitle>
                </div>
                 <Carousel className="w-full mt-12" opts={{ loop: true }} plugins={[autoplayPlugin.current]}>
                    <CarouselContent>
                    {galleryImages.map((src, index) => (
                        <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                            <div className="p-1">
                                <motion.div
                                    className="overflow-hidden glass-card rounded-lg"
                                    whileHover={{ scale: 1.03, boxShadow: "0 0 20px hsl(var(--brand-red))" }}
                                >
                                    <Image
                                        src={src}
                                        alt={`Gallery Image ${index + 1}`}
                                        width={600}
                                        height={400}
                                        className="w-full h-full object-cover aspect-video transition-transform"
                                    />
                                </motion.div>
                            </div>
                        </CarouselItem>
                    ))}
                    </CarouselContent>
                    <CarouselPrevious className="animate-neon-pulse-arrows"/>
                    <CarouselNext className="animate-neon-pulse-arrows"/>
                </Carousel>
            </div>
        </AnimatedSection>
        
        <AnimatedSection id="spocs">
            <div className="container max-w-4xl text-center">
                <SectionTitle>Institute SPOCs</SectionTitle>
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
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
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
                        </motion.div>
                    )}
                </div>
            </div>
        </AnimatedSection>


        <AnimatedSection id="contact">
            <div className="container max-w-7xl">
                 <div className="text-center">
                    <SectionTitle>Get In Touch</SectionTitle>
                </div>
                <div className="grid md:grid-cols-3 gap-8 text-center mt-12">
                 <motion.div whileHover={{ y: -5, boxShadow: "0 0 20px hsl(var(--brand-yellow))" }} className="glass-card p-6 flex flex-col items-center">
                    <Mail className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold">Email Us</h3>
                    <a href="mailto:pierc@paruluniversity.ac.in" className="text-foreground/80 hover:text-primary">pierc@paruluniversity.ac.in</a>
                </motion.div>
                <motion.div whileHover={{ y: -5, boxShadow: "0 0 20px hsl(var(--brand-orange))" }} className="glass-card p-6 flex flex-col items-center">
                    <Phone className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold">Phone</h3>
                    <p className="text-foreground/80">0266-8260350</p>
                </motion.div>
                <motion.div whileHover={{ y: -5, boxShadow: "0 0 20px hsl(var(--brand-red))" }} className="glass-card p-6 flex flex-col items-center">
                    <MapPin className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold">Our Address</h3>
                    <p className="text-foreground/80 max-w-xs">PARUL INNOVATION &amp; ENTREPRENEURSHIP RESEARCH CENTRE (PIERC), Parul University</p>
                </motion.div>
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
