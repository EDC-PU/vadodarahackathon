
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { Announcement } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
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

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const announcementsCollection = collection(db, 'announcements');
    const q = query(announcementsCollection, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const announcementsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
        setAnnouncements(announcementsData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching announcements:", error);
        toast({ title: "Error", description: "Failed to fetch announcements.", variant: "destructive" });
        setLoading(false);
    });
    
    return () => unsubscribe();
  }, [toast]);
  
  const handleCreateAnnouncement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
        toast({ title: "Error", description: "You must be logged in to create an announcement.", variant: "destructive" });
        return;
    }
    
    setIsCreating(true);
    const formData = new FormData(event.currentTarget);
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;

    try {
        await addDoc(collection(db, "announcements"), {
            title,
            content,
            authorName: user.name,
            createdAt: serverTimestamp(),
        });
        toast({ title: "Success", description: "Announcement has been posted."});
        (event.target as HTMLFormElement).reset();
    } catch (error) {
        console.error("Error creating announcement:", error);
        toast({ title: "Error", description: "Could not post the announcement.", variant: "destructive" });
    } finally {
        setIsCreating(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    try {
      await deleteDoc(doc(db, "announcements", announcementId));
      toast({ title: "Success", description: "Announcement deleted." });
    } catch (error) {
       console.error("Error deleting announcement:", error);
       toast({ title: "Error", description: "Could not delete the announcement.", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
            <h1 className="text-3xl font-bold font-headline">Manage Announcements</h1>
            <p className="text-muted-foreground">Post updates that will be visible to all users.</p>
        </header>

         <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>New Announcement</CardTitle>
                    <CardDescription>Create a new announcement.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                        <div>
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" name="title" placeholder="e.g., Registration Deadline Extended" required disabled={isCreating} />
                        </div>
                         <div>
                            <Label htmlFor="content">Content</Label>
                            <Textarea id="content" name="content" placeholder="Write the main content of your announcement here." required disabled={isCreating} className="min-h-32"/>
                        </div>
                        <Button type="submit" disabled={isCreating}>
                            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Post Announcement
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Posted Announcements</CardTitle>
                    <CardDescription>A list of all posted announcements, newest first.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? (
                         <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : announcements.length > 0 ? announcements.map(announcement => (
                        <div key={announcement.id} className="p-4 border rounded-md relative group">
                            <h3 className="font-bold text-lg">{announcement.title}</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Posted by {announcement.authorName} on {announcement.createdAt ? new Date(announcement.createdAt.seconds * 1000).toLocaleDateString() : '...'}
                            </p>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 className="h-4 w-4"/>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the announcement.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteAnnouncement(announcement.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )) : <p className="text-muted-foreground text-center py-8">No announcements posted yet.</p>}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
