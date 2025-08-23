
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Separator } from "./ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc } from "firebase/firestore";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { INSTITUTES } from "@/lib/constants";
import { useSearchParams } from "next/navigation";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["leader", "member", "spoc"], { required_error: "Please select a role." }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export function SignupForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('inviteToken');

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [isDeadlineLoading, setIsDeadlineLoading] = useState(true);
  const { toast } = useToast();
  const { handleLogin } = useAuth();
  
  useEffect(() => {
    const fetchDeadline = async () => {
        try {
            const configDocRef = doc(db, "config", "event");
            const configDoc = await getDoc(configDocRef);
            if (configDoc.exists() && configDoc.data().registrationDeadline) {
                setDeadline(configDoc.data().registrationDeadline.toDate());
            }
        } catch (error) {
            console.error("Error fetching registration deadline:", error);
        } finally {
            setIsDeadlineLoading(false);
        }
    };
    fetchDeadline();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      role: inviteToken ? 'member' : undefined,
    },
  });

  useEffect(() => {
    if (inviteToken) {
        form.setValue('role', 'member');
    }
  }, [inviteToken, form]);

  const isRegistrationClosed = deadline ? new Date() > deadline : false;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    sessionStorage.setItem('sign-up-role', values.role);
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
    const selectedRole = form.getValues("role");
    if (!selectedRole) {
        toast({ title: "Role Required", description: "Please select your role before signing in with Google.", variant: "destructive" });
        setIsGoogleLoading(false);
        return;
    }
    
    sessionStorage.setItem('sign-up-role', selectedRole);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await handleLogin(result.user);
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      toast({
        title: "Google Sign-In Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }
  
  if (isDeadlineLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>I am registering as a...</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value} 
                    defaultValue={field.value}
                    disabled={!!inviteToken}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="leader">Team Leader</SelectItem>
                      <SelectItem value="member">Team Member (Invited)</SelectItem>
                      <SelectItem value="spoc">Institute SPOC</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} disabled={isLoading || isGoogleLoading} />
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
