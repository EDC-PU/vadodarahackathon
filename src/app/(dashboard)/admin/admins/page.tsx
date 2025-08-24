
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { makeAdmin } from "@/ai/flows/make-admin-flow";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { cn } from "@/lib/utils";

export default function ManageAdminsPage() {
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const { toast } = useToast();

  const mainRef = useRef<HTMLDivElement>(null);
  const isInView = useScrollAnimation(mainRef);

  const fetchAdmins = async () => {
    const usersCollection = collection(db, 'users');
    const adminsQuery = query(usersCollection, where("role", "==", "admin"));
    const adminSnapshot = await getDocs(adminsQuery);
    const adminsData = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    setAdmins(adminsData);
  }

  useEffect(() => {
    setLoading(true);
    const usersCollection = collection(db, 'users');
    const adminsQuery = query(usersCollection, where("role", "==", "admin"));
    const unsubscribe = onSnapshot(adminsQuery, (snapshot) => {
        const adminsData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setAdmins(adminsData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching admins:", error);
        toast({ title: "Error", description: "Failed to fetch admins.", variant: "destructive" });
        setLoading(false);
    });
    
    return () => unsubscribe();
  }, [toast]);

  const handleCreateAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingAdmin(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get('admin-email') as string;

    try {
      const result = await makeAdmin({ email });
      if (result.success) {
        toast({ title: "Success", description: result.message });
        (event.target as HTMLFormElement).reset();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch (error) {
       console.error("Error creating admin:", error);
       toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  return (
    <div ref={mainRef} className={cn("p-4 sm:p-6 lg:p-8 scroll-animate", isInView && "in-view")}>
        <header className="mb-8">
            <h1 className="text-3xl font-bold font-headline">Manage Admins</h1>
            <p className="text-muted-foreground">Grant or revoke administrator privileges.</p>
        </header>

        {loading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : (
             <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Create Admin</CardTitle>
                        <CardDescription>Add a new administrator by their registered email.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateAdmin} className="space-y-4">
                            <div>
                                <Label htmlFor="admin-email">User Email</Label>
                                <Input id="admin-email" name="admin-email" type="email" placeholder="user@example.com" required disabled={isCreatingAdmin} />
                            </div>
                            <Button type="submit" disabled={isCreatingAdmin}>
                                {isCreatingAdmin ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                Make Admin
                            </Button>
                        </form>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Current Admins</CardTitle>
                        <CardDescription>The following users have admin privileges.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {admins.length > 0 ? admins.map(admin => (
                            <div key={admin.uid} className="flex items-center gap-3 p-3 bg-secondary rounded-md">
                                <Shield className="h-5 w-5 text-primary"/>
                                <span className="font-medium">{admin.email}</span>
                            </div>
                        )) : <p className="text-muted-foreground">No admins found.</p>}
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  );
}
