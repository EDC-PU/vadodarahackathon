
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, Trash2, Link as LinkIcon } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, where } from "firebase/firestore";
import { Announcement, AnnouncementAudience } from "@/lib/types";
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
import Link from "next/link";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { cn } from "@/lib/utils";

export default function SpocAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const mainRef = useRef<HTMLDivElement>(null);
  const isInView = useScrollAnimation(mainRef);

  useEffect(() => {
    if (!user?.institute) {
        setLoading(false);
        return;
    }
    setLoading(true);
    const announcementsCollection = collection(db, 'announcements');
    const q = query(
        announcementsCollection, 
        where("audience", "==", "institute"),
        where("institute", "==", user.institute),
        orderBy("createdAt", "desc")
    );
    
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
  }, [user?.institute, toast]);
  
  const handleCreateAnnouncement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.institute) {
        toast({ title: "Error", description: "You must be associated with an institute to post an announcement.", variant: "destructive" });
        return;
    }
    
    setIsCreating(true);
    const formData = new FormData(event.currentTarget);
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const url = formData.get('url') as string;
    
    try {
        await addDoc(collection(db, "announcements"), {
            title,
            content,
            url,
            audience: 'institute',
            institute: user.institute,
            authorName: `${user.name} (SPOC)`,
            createdAt: serverTimestamp(),
        });
        toast({ title: "Success", description: "Announcement has been posted to your institute's teams."});
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
    <div ref={mainRef} className={cn("p-4 sm:p-6 lg:p-8 scroll-animate", isInView && "in-view")}>
        <header className="mb-8">
            <h1 className="text-3xl font-bold font-headline">Institute Announcements</h1>
            <p className="text-muted-foreground">Post updates that will be visible to all teams from {user?.institute}.</p>
        </header>

         <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>New Announcement</CardTitle>
                    <CardDescription>Create a new announcement for your institute.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                        <div>
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" name="title" placeholder="e.g., Internal Deadline Reminder" required disabled={isCreating} />
                        </div>
                         <div>
                            <Label htmlFor="content">Content</Label>
                            <Textarea id="content" name="content" placeholder="Write the main content of your announcement here." required disabled={isCreating} className="min-h-32"/>
                        </div>
                        <div>
                            <Label htmlFor="url">URL (Optional)</Label>
                            <Input id="url" name="url" type="url" placeholder="https://example.com/more-info" disabled={isCreating} />
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
                    <CardDescription>A list of all announcements posted for your institute, newest first.</CardDescription>
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
                            {announcement.url && (
                                <Link href={announcement.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1.5 mt-2">
                                    <LinkIcon className="h-3 w-3" />
                                    <span>Related Link</span>
                                </Link>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                                Posted on {announcement.createdAt ? new Date(announcement.createdAt.seconds * 1000).toLocaleDateString() : '...'}
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
                    )) : <p className="text-muted-foreground text-center py-8">You have not posted any announcements yet.</p>}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
