
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,

  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Chrome, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getRedirectResult, signOut } from "firebase/auth";
import { Separator } from "./ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc } from "firebase/firestore";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Checkbox } from "./ui/checkbox";

interface SpocSignupFormProps {
    deadlineMillis?: number | null;
}

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).refine(
    (email) => email.endsWith('@paruluniversity.ac.in'),
    { message: "SPOC email must end with @paruluniversity.ac.in" }
  ),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
  terms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and policy.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});


export function SpocSignupForm({ deadlineMillis }: SpocSignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const { toast } = useToast();
  const { handleLogin } = useAuth();
  
  useEffect(() => {
    if (deadlineMillis) {
        setDeadline(new Date(deadlineMillis));
    }
  }, [deadlineMillis]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const isRegistrationClosed = deadline ? new Date() > deadline : false;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    sessionStorage.setItem('sign-up-role', 'spoc');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await handleLogin(userCredential.user);
    } catch (error: any) {
      console.error("Sign-up Error:", error);
      let errorMessage = "An unexpected error occurred.";
       if (error.code === 'auth/email-already-in-use') {
          errorMessage = "This email is already registered. Please login instead.";
       } else {
          errorMessage = error.message;
       }
       toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    const termsAccepted = form.getValues("terms");
    if (!termsAccepted) {
        toast({ title: "Terms Required", description: "You must accept the terms and privacy policy before signing in.", variant: "destructive" });
        setIsGoogleLoading(false);
        return;
    }
    
    sessionStorage.setItem('sign-up-role', 'spoc');
    
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      'login_hint': 'user@paruluniversity.ac.in'
    });

    try {
      const result = await signInWithPopup(auth, provider);
      
      if (!result.user.email?.endsWith('@paruluniversity.ac.in')) {
        await signOut(auth); // Sign out the user
        toast({
          title: "Invalid Email Domain",
          description: "SPOC registration requires an @paruluniversity.ac.in email address. Please sign in with your official university account.",
          variant: "destructive",
          duration: 8000,
        });
        setIsGoogleLoading(false);
        return;
      }

      await handleLogin(result.user);
    } catch (error: any)
       {
      console.error("Google Sign-In Error:", error);
      let errorMessage = "An unexpected error occurred.";
      if (error.code === 'auth/user-disabled') {
        errorMessage = "Your account is pending approval or has been disabled. Please contact an administrator."
      } else if (error.code !== 'auth/popup-closed-by-user') {
        errorMessage = error.message;
      } else {
        errorMessage = "Sign-in was cancelled."
      }
      toast({
        title: "Google Sign-In Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  if (isRegistrationClosed) {
      return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Registration Closed</AlertTitle>
            <AlertDescription>
                The registration deadline has passed. New sign-ups are no longer being accepted.
            </AlertDescription>
        </Alert>
      )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>University Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@paruluniversity.ac.in" {...field} disabled={isLoading || isGoogleLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                    <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        {...field} 
                        disabled={isLoading || isGoogleLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading || isGoogleLoading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        disabled={isLoading || isGoogleLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                    <FormControl>
                        <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading || isGoogleLoading}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>
                            I agree to the <Link href="/terms" target="_blank" className="underline text-primary hover:text-primary/80">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="underline text-primary hover:text-primary/80">Privacy Policy</Link>.
                        </FormLabel>
                        <FormMessage />
                    </div>
                    </FormItem>
                )}
            />
           
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up with Email
            </Button>

          </form>
        </Form>
        <div className="relative my-6">
          <Separator />
          <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">OR</span>
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
            {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Chrome className="mr-2 h-4 w-4" />
            )}
           Sign up with Google
        </Button>
      </CardContent>
    </Card>
  );
}
