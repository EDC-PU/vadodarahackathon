
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, onSnapshot, orderBy } from "firebase/firestore";
import { useState, useEffect, useCallback } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManageAdminDepartmentsPage() {
    const { user, loading: authLoading } = useAuth();
    const [institutes, setInstitutes] = useState<{ id: string; name: string }[]>([]);
    const [selectedInstitute, setSelectedInstitute] = useState<string>("");
    const [departments, setDepartments] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newDepartment, setNewDepartment] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, "institutes"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const institutesData = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name as string }));
            setInstitutes(institutesData);
        });
        return () => unsubscribe();
    }, []);

    const fetchDepartments = useCallback(async () => {
        if (!selectedInstitute) {
            setDepartments([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const deptDocRef = doc(db, "departments", selectedInstitute);
            const docSnap = await getDoc(deptDocRef);
            if (docSnap.exists()) {
                setDepartments(docSnap.data().departments.sort() || []);
            } else {
                setDepartments([]);
            }
        } catch (error) {
            console.error("Error fetching departments:", error);
            toast({ title: "Error", description: "Could not fetch departments.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [selectedInstitute, toast]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    const handleAddDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDepartment.trim() || !selectedInstitute) return;

        setIsSubmitting(true);
        const deptDocRef = doc(db, "departments", selectedInstitute);
        try {
            const docSnap = await getDoc(deptDocRef);
            if (docSnap.exists()) {
                await updateDoc(deptDocRef, {
                    departments: arrayUnion(newDepartment.trim())
                });
            } else {
                await setDoc(deptDocRef, {
                    name: selectedInstitute,
                    departments: [newDepartment.trim()]
                });
            }
            toast({ title: "Success", description: "Department added." });
            setNewDepartment("");
            fetchDepartments();
        } catch (error) {
            console.error("Error adding department:", error);
            toast({ title: "Error", description: "Could not add department.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteDepartment = async (departmentToDelete: string) => {
        if (!selectedInstitute) return;
        
        setIsSubmitting(true);
        const deptDocRef = doc(db, "departments", selectedInstitute);
        try {
            await updateDoc(deptDocRef, {
                departments: arrayRemove(departmentToDelete)
            });
            toast({ title: "Success", description: "Department removed." });
            fetchDepartments();
        } catch (error) {
            console.error("Error deleting department:", error);
            toast({ title: "Error", description: "Could not delete department.", variant: "destructive" });
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
                <h1 className="text-3xl font-bold font-headline">Manage Departments</h1>
                <p className="text-muted-foreground">Add or remove departments for any institute.</p>
            </header>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Select Institute</CardTitle>
                    <CardDescription>Choose an institute to manage its departments.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Select onValueChange={setSelectedInstitute} value={selectedInstitute}>
                        <SelectTrigger className="w-full max-w-md">
                            <SelectValue placeholder="Select an institute" />
                        </SelectTrigger>
                        <SelectContent>
                            {institutes.map((inst) => (
                                <SelectItem key={inst.id} value={inst.name}>{inst.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {selectedInstitute && (
                <div className="grid gap-8 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add Department</CardTitle>
                            <CardDescription>Enter a new department for <span className="font-bold">{selectedInstitute}</span>.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddDepartment} className="flex items-center gap-2">
                                <Input
                                    value={newDepartment}
                                    onChange={(e) => setNewDepartment(e.target.value)}
                                    placeholder="e.g., Computer Engineering"
                                    disabled={isSubmitting}
                                />
                                <Button type="submit" disabled={isSubmitting || !newDepartment.trim()}>
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                                    <span className="ml-2">Add</span>
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Department List</CardTitle>
                            <CardDescription>Available departments for <span className="font-bold">{selectedInstitute}</span>.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {loading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : departments.length > 0 ? (
                                departments.map((dept) => (
                                    <div key={dept} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                                        <span className="font-medium">{dept}</span>
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
                                                        This will permanently remove "{dept}" from the list of available departments for this institute.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteDepartment(dept)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-center py-4">No departments added yet for this institute.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
