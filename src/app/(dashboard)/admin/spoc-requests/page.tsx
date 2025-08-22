
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { manageSpocRequest } from "@/ai/flows/manage-spoc-request-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function SpocRequestsPage() {
  const [requests, setRequests] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // Store UID of processing request
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const usersCollection = collection(db, 'users');
    const spocRequestsQuery = query(usersCollection, where("role", "==", "spoc"), where("spocStatus", "==", "pending"));
    
    const unsubscribe = onSnapshot(spocRequestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setRequests(requestsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching SPOC requests:", error);
      toast({ title: "Error", description: "Failed to fetch SPOC requests.", variant: "destructive" });
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [toast]);

  const handleRequest = async (uid: string, action: "approve" | "reject") => {
    setIsProcessing(uid);
    try {
      const result = await manageSpocRequest({ uid, action });
      if (result.success) {
        toast({ title: "Success", description: result.message });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
       toast({ title: "Error", description: `Failed to ${action} request: ${errorMessage}`, variant: "destructive" });
    } finally {
        setIsProcessing(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">SPOC Registration Requests</h1>
        <p className="text-muted-foreground">Approve or reject new requests from Institute SPOCs.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>
            {requests.length} request(s) awaiting approval. Approving a request will enable the SPOC's account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : requests.length > 0 ? (
            <ul className="space-y-4">
              {requests.map((spoc) => (
                <li key={spoc.uid} className="p-4 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="font-semibold text-lg">{spoc.name}</p>
                    <p className="text-sm text-muted-foreground">{spoc.email}</p>
                    <p className="text-sm text-muted-foreground font-medium mt-1">{spoc.institute}</p>
                  </div>
                  <div className="flex gap-2 self-start sm:self-center">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleRequest(spoc.uid, "approve")}
                      disabled={isProcessing === spoc.uid}
                      className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                    >
                      {isProcessing === spoc.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4" />}
                      <span className="ml-2">Approve</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleRequest(spoc.uid, "reject")}
                      disabled={isProcessing === spoc.uid}
                    >
                      {isProcessing === spoc.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                      <span className="ml-2">Reject</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
             <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>All caught up!</AlertTitle>
              <AlertDescription>
                There are no pending SPOC registration requests at this time.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
