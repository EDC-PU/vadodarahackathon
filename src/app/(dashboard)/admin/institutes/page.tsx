
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, PlusCircle, Trash2, Library, Save } from "lucide-react";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";
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
import { Institute } from "@/lib/types";

export default function ManageInstitutesPage() {
    const { user, loading: authLoading } = useAuth();
    const [institutes, setInstitutes] = useState<Institute[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newInstitute, setNewInstitute] = useState("");
    const [nominationLimits, setNominationLimits] = useState<Record<string, number | string>>({});
    const { toast } = useToast();

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "institutes"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const institutesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Institute));
            setInstitutes(institutesData);
            
            const limits: Record<string, number> = {};
            institutesData.forEach(inst => {
                if (inst.nominationLimit) {
                    limits[inst.id] = inst.nominationLimit;
                }
            });
            setNominationLimits(limits);

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
                name: newInstitute.trim(),
                nominationLimit: 5, // Default limit
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

    const handleLimitChange = (id: string, value: string) => {
        setNominationLimits(prev => ({ ...prev, [id]: value }));
    };

    const handleSaveLimit = async (id: string) => {
        const limit = nominationLimits[id];
        const numericLimit = Number(limit);

        if (isNaN(numericLimit) || numericLimit < 0) {
            toast({ title: "Invalid Input", description: "Please enter a valid non-negative number.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const instituteRef = doc(db, 'institutes', id);
            await updateDoc(instituteRef, { nominationLimit: numericLimit });
            toast({ title: "Success", description: "Nomination limit updated." });
        } catch (error) {
            console.error("Error updating limit:", error);
            toast({ title: "Error", description: "Could not update nomination limit.", variant: "destructive" });
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
                <h1 className="text-3xl font-bold font-headline">Manage Institutes & Nominations</h1>
                <p className="text-muted-foreground">Add institutes and set team nomination limits for the university-level round.</p>
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
                        <CardTitle>Institute List & Nomination Limits</CardTitle>
                        <CardDescription>Set the maximum number of teams each institute can nominate.</CardDescription>
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
                                <div key={inst.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 bg-secondary rounded-md gap-2">
                                    <div className="flex items-center gap-2">
                                        <Library className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{inst.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Input
                                            type="number"
                                            value={nominationLimits[inst.id] ?? ''}
                                            onChange={(e) => handleLimitChange(inst.id, e.target.value)}
                                            className="h-8 w-20 bg-background"
                                            placeholder="Limit"
                                            disabled={isSubmitting}
                                        />
                                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleSaveLimit(inst.id)} disabled={isSubmitting}>
                                            <Save className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={isSubmitting}>
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
