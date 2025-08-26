
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { AddSpocDialog } from "@/components/add-spoc-dialog";
import { Badge } from "@/components/ui/badge";

export default function ManageSpocsPage() {
  const [spocs, setSpocs] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddSpocOpen, setIsAddSpocOpen] = useState(false);
  const { toast } = useToast();

  const fetchSpocs = () => {
    setLoading(true);
    const usersCollection = collection(db, 'users');
    const spocsQuery = query(usersCollection, where("role", "==", "spoc"));
    
    const unsubscribe = onSnapshot(spocsQuery, (snapshot) => {
      const spocsData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setSpocs(spocsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching SPOCs:", error);
      toast({ title: "Error", description: "Failed to fetch SPOC data.", variant: "destructive" });
      setLoading(false);
    });
    
    return unsubscribe;
  };
  
  useEffect(() => {
    const unsubscribe = fetchSpocs();
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusVariant = (status?: 'pending' | 'approved' | 'rejected'): "default" | "secondary" | "destructive" => {
    switch (status) {
        case 'approved':
            return 'default';
        case 'pending':
            return 'secondary';
        case 'rejected':
            return 'destructive';
        default:
            return 'secondary';
    }
  }

  return (
    <>
      <AddSpocDialog
        isOpen={isAddSpocOpen}
        onOpenChange={setIsAddSpocOpen}
        onSpocAdded={() => { /* onSnapshot handles updates */ }}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold font-headline">Manage SPOCs</h1>
                <p className="text-muted-foreground">Create and manage institute Single Points of Contact.</p>
            </div>
            <Button onClick={() => setIsAddSpocOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add SPOC
            </Button>
        </header>

        <Card>
            <CardHeader>
              <CardTitle>SPOC List</CardTitle>
              <CardDescription>
                {spocs.length} SPOC(s) found. Login credentials are automatically emailed upon creation.
              </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : spocs.length > 0 ? (
                  <ul className="space-y-4">
                    {spocs.map(spoc => (
                        <li key={spoc.uid} className="p-4 border rounded-md flex justify-between items-start">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 flex-1">
                                <div className="space-y-1">
                                    <p className="font-semibold text-lg">{spoc.name}</p>
                                    <p className="text-sm text-muted-foreground">{spoc.email}</p>
                                    <p className="text-sm text-muted-foreground">{spoc.contactNumber || 'N/A'}</p>
                                    <p className="text-sm text-muted-foreground font-medium">{spoc.institute}</p>
                                </div>
                                 <div className="space-y-1 text-sm text-muted-foreground">
                                    <p><strong>AICTE No:</strong> {spoc.aicteApplicationNumber || 'N/A'}</p>
                                    <p><strong>Principal:</strong> {spoc.principalInitial || ''} {spoc.principalName || 'N/A'}</p>
                                    
                                </div>
                            </div>
                            <Badge variant={getStatusVariant(spoc.spocStatus)} className={spoc.spocStatus === 'approved' ? 'bg-green-600' : ''}>
                              {spoc.spocStatus ? spoc.spocStatus.charAt(0).toUpperCase() + spoc.spocStatus.slice(1) : 'N/A'}
                            </Badge>
                        </li>
                    ))}
                  </ul>
                ) : <p className="text-center text-muted-foreground py-4">No SPOCs have been created yet.</p>}
            </CardContent>
          </Card>
      </div>
    </>
  );
}
