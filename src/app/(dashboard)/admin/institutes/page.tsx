
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, PlusCircle, Trash2, Library, Save, Link as LinkIcon } from "lucide-react";
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
import { Label } from "@/components/ui/label";

export default function ManageInstitutesPage() {
    const { user, loading: authLoading } = useAuth();
    const [institutes, setInstitutes] = useState<Institute[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newInstitute, setNewInstitute] = useState("");
    const [nominationLimits, setNominationLimits] = useState<Record<string, number | string>>({});
    const [nominationFormUrls, setNominationFormUrls] = useState<Record<string, string>>({});
    const { toast } = useToast();

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, "institutes"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const institutesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Institute));
            setInstitutes(institutesData);
            
            const limits: Record<string, number> = {};
            const urls: Record<string, string> = {};
            institutesData.forEach(inst => {
                if (inst.nominationLimit) {
                    limits[inst.id] = inst.nominationLimit;
                }
                if (inst.nominationFormUrl) {
                    urls[inst.id] = inst.nominationFormUrl;
                }
            });
            setNominationLimits(limits);
            setNominationFormUrls(urls);

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
                nominationFormUrl: "", // Default empty URL
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

    const handleUrlChange = (id: string, value: string) => {
        setNominationFormUrls(prev => ({...prev, [id]: value }));
    }

    const handleSaveInstituteData = async (id: string) => {
        const limit = nominationLimits[id];
        const url = nominationFormUrls[id];
        const numericLimit = Number(limit);

        if (isNaN(numericLimit) || numericLimit < 0) {
            toast({ title: "Invalid Input", description: "Please enter a valid non-negative number for the limit.", variant: "destructive" });
            return;
        }

        if (url && !url.startsWith('http')) {
            toast({ title: "Invalid URL", description: "Please enter a valid URL.", variant: "destructive"});
            return;
        }

        setIsSubmitting(true);
        try {
            const instituteRef = doc(db, 'institutes', id);
            await updateDoc(instituteRef, { 
                nominationLimit: numericLimit,
                nominationFormUrl: url || ""
            });
            toast({ title: "Success", description: "Institute data updated." });
        } catch (error) {
            console.error("Error updating institute data:", error);
            toast({ title: "Error", description: "Could not update institute data.", variant: "destructive" });
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
                <p className="text-muted-foreground">Add institutes, set team nomination limits, and specify nomination form templates.</p>
            </header>

            <div className="grid gap-8 xl:grid-cols-3">
                <Card className="xl:col-span-1">
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
                                <span className="ml-2 hidden sm:inline">Add</span>
                            </Button>
                        </form>
                    </CardContent>
                </Card>
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle>Institute List</CardTitle>
                        <CardDescription>Manage settings for each institute.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                             <div className="space-y-3">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        ) : institutes.length > 0 ? (
                            institutes.map((inst) => (
                                <div key={inst.id} className="flex flex-col gap-4 p-4 bg-secondary rounded-md">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <Library className="h-5 w-5 text-muted-foreground" />
                                            <span className="font-semibold text-lg">{inst.name}</span>
                                        </div>
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                        <div>
                                            <Label htmlFor={`limit-${inst.id}`} className="text-xs text-muted-foreground">Nomination Limit</Label>
                                            <Input
                                                id={`limit-${inst.id}`}
                                                type="number"
                                                value={nominationLimits[inst.id] ?? ''}
                                                onChange={(e) => handleLimitChange(inst.id, e.target.value)}
                                                className="h-9"
                                                placeholder="e.g., 5"
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                         <div>
                                            <Label htmlFor={`url-${inst.id}`} className="text-xs text-muted-foreground">Nomination Form URL (.docx)</Label>
                                            <Input
                                                id={`url-${inst.id}`}
                                                type="url"
                                                value={nominationFormUrls[inst.id] ?? ''}
                                                onChange={(e) => handleUrlChange(inst.id, e.target.value)}
                                                className="h-9"
                                                placeholder="https://example.com/template.docx"
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>
                                    <Button size="sm" className="w-full md:w-auto self-end" onClick={() => handleSaveInstituteData(inst.id)} disabled={isSubmitting}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Changes for {inst.name}
                                    </Button>
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
