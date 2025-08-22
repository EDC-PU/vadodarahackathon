'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Logo } from '@/components/logo';
import { Award, Code, Cpu, Mail, MapPin, Phone, Users } from 'lucide-react';
import Image from 'next/image';

export default function LandingPage() {
  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'About', href: '#about' },
    { name: 'Rewards', href: '#rewards' },
    { name: 'Contact', href: '#contact' },
  ];

  const highlights = [
    { icon: <Users className="h-8 w-8 text-primary" />, title: 'Collaborate & Innovate', description: 'Work in teams to solve real-world problems and create groundbreaking solutions.' },
    { icon: <Code className="h-8 w-8 text-primary" />, title: 'Software Track', description: 'Showcase your coding skills in web, mobile, AI/ML, and more.' },
    { icon: <Cpu className="h-8 w-8 text-primary" />, title: 'Hardware Track', description: 'Build and demonstrate innovative hardware projects using IoT, robotics, and embedded systems.' },
    { icon: <Award className="h-8 w-8 text-primary" />, title: 'Exciting Prizes', description: 'Compete for a large prize pool and gain recognition from industry leaders.' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-7xl items-center justify-between">
          <Link href="#" className="flex items-center gap-2 font-bold text-lg" prefetch={false}>
            <Logo className="h-8 w-8 text-primary" />
            <span>Vadodara Hackathon 6.0</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href} className="text-foreground/80 transition-colors hover:text-foreground" prefetch={false}>
                {link.name}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Register</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-32">
          <div className="container max-w-7xl text-center">
            <div className="flex justify-center mb-6">
                <Image src="https://placehold.co/150x150.png" alt="Vadodara Hackathon Logo" width={150} height={150} className="rounded-full" data-ai-hint="hackathon logo" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 font-headline bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              Vadodara Hackathon 6.0
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl text-foreground/80 mb-8">
              Hosted by Parul University, PIERC. Join us for 24 hours of innovation, collaboration, and creation.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" asChild className="bg-gradient-to-r from-primary to-blue-400 hover:scale-105 transition-transform">
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
          </div>
        </section>

        <section id="about" className="py-20 bg-card">
          <div className="container max-w-7xl grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4 font-headline">About The Hackathon</h2>
              <p className="text-foreground/80 mb-4">
                Vadodara Hackathon is a premier event that brings together bright minds to tackle challenging problems. It's a platform for students to showcase their talent, learn new skills, and network with peers and industry experts. This year, we are back with our 6th edition, bigger and better than ever!
              </p>
              <p className="text-foreground/80">
                Organized by Parul University's Incubation & Entrepreneurship Research Centre (PIERC), we aim to foster a culture of innovation and entrepreneurship among students.
              </p>
            </div>
            <div>
              <Image src="https://placehold.co/600x400.png" alt="Hackathon event" width={600} height={400} className="rounded-lg shadow-xl" data-ai-hint="students coding" />
            </div>
          </div>
        </section>

        <section id="highlights" className="py-20">
          <div className="container max-w-7xl">
            <h2 className="text-3xl font-bold text-center mb-12 font-headline">Event Highlights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {highlights.map((highlight, index) => (
                <Card key={index} className="text-center p-6 border-2 border-transparent hover:border-primary hover:shadow-lg transition-all">
                  <div className="flex justify-center mb-4">{highlight.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{highlight.title}</h3>
                  <p className="text-foreground/70">{highlight.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="rewards" className="py-20 bg-card">
          <div className="container max-w-7xl text-center">
            <h2 className="text-3xl font-bold mb-4 font-headline">Rewards & Recognition</h2>
            <p className="max-w-2xl mx-auto text-foreground/80 mb-12">
              Winners will not only receive cash prizes but also mentorship opportunities, certificates, and cool swags!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-primary/10 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Award className="h-8 w-8 text-yellow-400" />
                    <span className="text-2xl">1st Place</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">₹1,00,000</p>
                  <p className="text-foreground/70 mt-2">+ Goodies & Mentorship</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                     <Award className="h-8 w-8 text-gray-400" />
                     <span className="text-2xl">2nd Place</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary/90">₹50,000</p>
                  <p className="text-foreground/70 mt-2">+ Goodies</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                     <Award className="h-8 w-8 text-orange-400" />
                     <span className="text-2xl">3rd Place</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary/80">₹25,000</p>
                  <p className="text-foreground/70 mt-2">+ Goodies</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="contact" className="py-20">
          <div className="container max-w-7xl">
            <h2 className="text-3xl font-bold text-center mb-12 font-headline">Get In Touch</h2>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center">
                <Mail className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold">Email</h3>
                <a href="mailto:contact@vuhackathon.com" className="text-foreground/80 hover:text-primary">contact@vuhackathon.com</a>
              </div>
              <div className="flex flex-col items-center">
                <Phone className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold">Phone</h3>
                <p className="text-foreground/80">+91 12345 67890</p>
              </div>
              <div className="flex flex-col items-center">
                <MapPin className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold">Venue</h3>
                <p className="text-foreground/80">Parul University, PIERC, Vadodara</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-card border-t">
        <div className="container max-w-7xl py-6 text-center text-sm text-foreground/60">
          <p>&copy; {new Date().getFullYear()} Vadodara Hackathon. All rights reserved.</p>
          <p>An initiative by Parul University, PIERC.</p>
        </div>
      </footer>
    </div>
  );
}
