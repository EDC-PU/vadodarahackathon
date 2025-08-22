
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { Award, Code, Cpu, Mail, MapPin, Phone, Users, Calendar, Trophy, FileText, BarChart, FileQuestion } from 'lucide-react';
import Image from 'next/image';
import { INSTITUTES } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const spocDetails: { [key: string]: { name: string; email: string; contact: string } } = {
  "Parul Institute of Applied Sciences": { name: "Chintan Somaiyya", email: "chintan.somaiya23775@paruluniversity.ac.in", contact: "74054 05402" },
};


export default function LandingPage() {
  const [selectedInstitute, setSelectedInstitute] = useState<string | null>(null);

  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'About', href: '#about' },
    { name: 'Rewards', href: '#rewards' },
    { name: 'Contact', href: '#contact' },
  ];
  
  const images = [
    "https://i.ibb.co/ZYrrS9h/Screenshot-2024-08-19-111659.png",
    "https://i.ibb.co/MgFsf84/Screenshot-2024-08-19-111647.png",
    "https://i.ibb.co/3dTYdbL/Screenshot-2024-08-19-111637.png",
    "https://i.ibb.co/GPpH3Ly/IMG-8177.jpg",
    "https://i.ibb.co/j4YKZ74/IMG-8188.jpg",
    "https://i.ibb.co/FzD2f4M/IMG-8320.jpg",
    "https://i.ibb.co/fnF8YT4/IMG-8341.jpg",
    "https://i.ibb.co/CKg2ncH/IMG-8399.jpg",
    "https://i.ibb.co/DCgrKCR/IMG-8411.jpg",
    "https://i.ibb.co/dJjj99f/IMG-8415.jpg",
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 max-w-7xl items-center justify-between">
          <Link href="https://paruluniversity.ac.in/" target="_blank" rel="noopener noreferrer" className="flex items-center" prefetch={false}>
             <Image src="https://www.paruluniversity.ac.in/pu-web/images/logo.png" alt="Parul University Logo" width={180} height={60} style={{height: 'auto'}}/>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href} className="text-foreground/80 transition-colors hover:text-foreground" prefetch={false}>
                {link.name}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Register</Link>
                </Button>
              </div>
              <Link href="https://pierc.org/" target="_blank" rel="noopener noreferrer" className="items-center hidden sm:flex" prefetch={false}>
                 <img src="https://www.pierc.org/assets/PIERC.svg" alt="PIERC Logo" className="h-10" />
              </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-32">
          <div className="container max-w-7xl text-center">
            <div className="flex justify-center mb-6">
                <Image src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon Logo" width={128} height={128} className="rounded-full" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 font-headline bg-clip-text text-transparent bg-gradient-to-r from-primary to-red-500">
              Vadodara Hackathon 6.0
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl text-foreground/80 mb-8">
             Your Gateway to Smart India Hackathon 2025!
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
              <Button size="lg" asChild className="hover:scale-105 transition-transform">
                <Link href="/register?category=Software">
                  <Code className="mr-2 h-5 w-5" /> Register (Software)
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="hover:scale-105 transition-transform">
                <Link href="/register?category=Hardware">
                  <Cpu className="mr-2 h-5 w-5" /> Register (Hardware)
                </Link>
              </Button>
            </div>
            <p className="text-muted-foreground">Brochure & Problem Statements Coming Soon!</p>
          </div>
        </section>

        <section id="spoc" className="py-20 bg-card">
          <div className="container max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-2 font-headline">How to Register for Vadodara Hackathon 6.0</h2>
            <p className="text-muted-foreground mb-4">Have any doubts or queries?</p>
            <h3 className="text-2xl font-semibold mb-4 font-headline">Get Contact details of your Institute SPOC</h3>
             <div className="max-w-md mx-auto mb-4">
                <Select onValueChange={setSelectedInstitute}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Your Institute" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTITUTES.map((inst) => (
                      <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            {selectedInstitute && spocDetails[selectedInstitute] && (
              <Card className="mt-6 text-left max-w-md mx-auto bg-background animate-in fade-in-50">
                <CardHeader>
                  <CardTitle>SPOC Details for {selectedInstitute}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p><strong>Name:</strong> {spocDetails[selectedInstitute].name}</p>
                  <p><strong>Email:</strong> <a href={`mailto:${spocDetails[selectedInstitute].email}`} className="text-primary hover:underline">{spocDetails[selectedInstitute].email}</a></p>
                  <p><strong>Contact:</strong> <a href={`tel:${spocDetails[selectedInstitute].contact.replace(/\s/g, '')}`} className="text-primary hover:underline">{spocDetails[selectedInstitute].contact}</a></p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section id="dates" className="py-20">
          <div className="container max-w-7xl">
            <h2 className="text-3xl font-bold text-center mb-12 font-headline">Important Dates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                <Card className="p-6 border-2 border-transparent hover:border-primary hover:shadow-lg transition-all">
                  <div className="flex justify-center mb-4"><Calendar className="h-8 w-8 text-primary"/></div>
                  <h3 className="text-xl font-semibold mb-2">Registration Starts</h3>
                  <p className="text-foreground/70">To be Announced</p>
                </Card>
                <Card className="p-6 border-2 border-transparent hover:border-primary hover:shadow-lg transition-all">
                  <div className="flex justify-center mb-4"><Calendar className="h-8 w-8 text-destructive"/></div>
                  <h3 className="text-xl font-semibold mb-2">Registration Ends</h3>
                  <p className="text-foreground/70">To be Announced</p>
                </Card>
                <Card className="p-6 border-2 border-transparent hover:border-primary hover:shadow-lg transition-all">
                  <div className="flex justify-center mb-4"><Users className="h-8 w-8 text-primary"/></div>
                  <h3 className="text-xl font-semibold mb-2">Intra-Institute Round</h3>
                  <p className="text-foreground/70">To be Announced</p>
                </Card>
                <Card className="p-6 border-2 border-transparent hover:border-primary hover:shadow-lg transition-all">
                  <div className="flex justify-center mb-4"><Trophy className="h-8 w-8 text-yellow-500"/></div>
                  <h3 className="text-xl font-semibold mb-2">Grand Finale & Valedictory</h3>
                  <p className="text-foreground/70">To be Announced</p>
                </Card>
            </div>
          </div>
        </section>


        <section id="rewards" className="py-20 bg-card">
          <div className="container max-w-7xl text-center">
            <h2 className="text-3xl font-bold mb-4 font-headline">Rewards & Recognition</h2>
            <p className="max-w-3xl mx-auto text-foreground/80 mb-12">
              Winners will be felicitated and recommended to SIH 2025. Other benefits include incubation & funding support, IP filing support, business development assistance, market access, and continuous mentoring.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-primary/10 border-primary p-6">
                <CardTitle className="flex flex-col items-center justify-center gap-2">
                  <Trophy className="h-10 w-10 text-yellow-400" />
                  <span className="text-2xl mt-2">Winners</span>
                </CardTitle>
                <CardContent className="mt-4 text-foreground/80">
                  <p>Felicitation and recommendation to SIH 2025.</p>
                </CardContent>
              </Card>
              <Card className="p-6">
                 <CardTitle className="flex flex-col items-center justify-center gap-2">
                  <Award className="h-10 w-10 text-primary" />
                  <span className="text-2xl mt-2">Support</span>
                </CardTitle>
                <CardContent className="mt-4 text-foreground/80">
                  <p>Incubation, Funding, IP Filing, Business Development & Market Access.</p>
                </CardContent>
              </Card>
              <Card className="p-6">
                 <CardTitle className="flex flex-col items-center justify-center gap-2">
                  <Users className="h-10 w-10 text-accent" />
                  <span className="text-2xl mt-2">Guidance</span>
                </CardTitle>
                <CardContent className="mt-4 text-foreground/80">
                  <p>Continuous mentoring and guidance from industry experts.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        <section id="about" className="py-20">
          <div className="container max-w-7xl grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4 font-headline">About Vadodara Hackathon 5.0</h2>
              <p className="text-foreground/80 mb-4">
               Vadodara Hackathon 5.0, held on September 9th-10th, 2024, was an internal hackathon organized with the primary purpose of fostering innovation and problem-solving within the Vadodara community. The event aimed to bring together creative minds and tech enthusiasts to collaborate, brainstorm, and develop innovative solutions to real-world problems.
              </p>
              <div className="grid grid-cols-2 gap-6 text-center mt-8">
                  <div className="p-4 rounded-lg bg-card">
                      <BarChart className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold">175</p>
                      <p className="text-sm text-muted-foreground">Teams Registered</p>
                  </div>
                  <div className="p-4 rounded-lg bg-card">
                      <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold">89</p>
                      <p className="text-sm text-muted-foreground">Teams for Finale</p>
                  </div>
                   <div className="p-4 rounded-lg bg-card">
                       <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold">45</p>
                      <p className="text-sm text-muted-foreground">Teams Nominated for SIH</p>
                  </div>
                  <div className="p-4 rounded-lg bg-card">
                      <FileQuestion className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-2xl font-bold">239</p>
                      <p className="text-sm text-muted-foreground">Problem Statements</p>
                  </div>
              </div>
            </div>
            <div>
              <Carousel className="w-full max-w-xl mx-auto">
                <CarouselContent>
                  {images.map((src, index) => (
                    <CarouselItem key={index}>
                      <Image
                        src={src}
                        alt={`Vadodara Hackathon 5.0 - Image ${index + 1}`}
                        width={600}
                        height={400}
                        className="rounded-lg shadow-xl object-cover aspect-[3/2]"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          </div>
        </section>


        <section id="contact" className="py-20 bg-card">
          <div className="container max-w-7xl">
            <h2 className="text-3xl font-bold text-center mb-12 font-headline">Get In Touch</h2>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center">
                <Mail className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold">Email Us</h3>
                <a href="mailto:pierc@paruluniversity.ac.in" className="text-foreground/80 hover:text-primary">pierc@paruluniversity.ac.in</a>
              </div>
              <div className="flex flex-col items-center">
                <Phone className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold">Phone</h3>
                <p className="text-foreground/80">0266-8260350</p>
              </div>
              <div className="flex flex-col items-center">
                <MapPin className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold">Our Address</h3>
                <p className="text-foreground/80 max-w-xs">PARUL INNOVATION & ENTREPRENEURSHIP RESEARCH CENTRE (PIERC), BBA Building, Parul University, P.O.Limda, Ta.Waghodia – 391760</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-muted border-t">
        <div className="container max-w-7xl py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                  <Image src="https://www.paruluniversity.ac.in/pu-web/images/logo.png" alt="Parul University Logo" width={150} height={50} />
                  <div className="w-px h-10 bg-border"></div>
                  <img src="https://www.pierc.org/assets/PIERC.svg" alt="PIERC Logo" className="h-10" />
              </div>
              <div className="text-center md:text-right text-sm text-foreground/60">
                <p>&copy; {new Date().getFullYear()} Vadodara Hackathon. All rights reserved.</p>
                <p>An initiative by Parul University, PIERC.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
