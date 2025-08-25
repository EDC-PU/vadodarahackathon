
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, PlusCircle, Trash2, Library } from "lucide-react";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Institute {
    id: string;
    name: string;
}

export default function ManageInstitutesPage() {
    const { user, loading: authLoading } = useAuth();
    const [institutes, setInstitutes] = useState<Institute[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newInstitute, setNewInstitute] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "institutes"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const institutesData = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name as string }));
            setInstitutes(institutesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching institutes:", error);
            toast({ title: "Error", description: "Could not fetch institutes.", variant: "destructive" });
            setLoading(false);
        });
        return () => unsubscribe();
    }, [toast]);

    const handleAddInstitute = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newInstitute.trim()) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "institutes"), {
                name: newInstitute.trim()
            });
            toast({ title: "Success", description: "Institute added successfully." });
            setNewInstitute("");
        } catch (error) {
            console.error("Error adding institute:", error);
            toast({ title: "Error", description: "Could not add institute.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteInstitute = async (instituteId: string) => {
        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, "institutes", instituteId));
            toast({ title: "Success", description: "Institute removed." });
        } catch (error) {
            console.error("Error deleting institute:", error);
            toast({ title: "Error", description: "Could not delete institute.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (authLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold font-headline">Manage Institutes</h1>
                <p className="text-muted-foreground">Add or remove institutes available across the portal.</p>
            </header>

            <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Add Institute</CardTitle>
                        <CardDescription>Enter the name of a new institute to add it to the portal.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddInstitute} className="flex items-center gap-2">
                            <Input
                                value={newInstitute}
                                onChange={(e) => setNewInstitute(e.target.value)}
                                placeholder="e.g., Parul Institute of Design"
                                disabled={isSubmitting}
                            />
                            <Button type="submit" disabled={isSubmitting || !newInstitute.trim()}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                                <span className="ml-2">Add</span>
                            </Button>
                        </form>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Institute List</CardTitle>
                        <CardDescription>The following institutes are available for selection.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {loading ? (
                             <div className="space-y-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : institutes.length > 0 ? (
                            institutes.map((inst) => (
                                <div key={inst.id} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                                    <div className="flex items-center gap-2">
                                        <Library className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{inst.name}</span>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" disabled={isSubmitting}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently remove "{inst.name}" from the list of available institutes.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteInstitute(inst.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No institutes added yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
