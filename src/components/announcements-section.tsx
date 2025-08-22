
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Megaphone } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { Announcement } from "@/lib/types";

interface AnnouncementsSectionProps {
    itemCount?: number;
}

export function AnnouncementsSection({ itemCount = 5 }: AnnouncementsSectionProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const announcementsCollection = collection(db, 'announcements');
    const q = query(announcementsCollection, orderBy("createdAt", "desc"), limit(itemCount));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
        setAnnouncements(data);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching announcements:", error);
        setLoading(false);
    });
    
    return () => unsubscribe();
  }, [itemCount]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Megaphone className="text-primary"/> Recent Announcements
        </CardTitle>
        <CardDescription>Stay up-to-date with the latest news and updates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : announcements.length > 0 ? (
          announcements.map(announcement => (
            <div key={announcement.id} className="p-3 border-l-4 border-primary/50 bg-secondary/50 rounded-r-md">
              <h4 className="font-semibold">{announcement.title}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{announcement.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {announcement.createdAt ? new Date(announcement.createdAt.seconds * 1000).toLocaleDateString() : ''}
              </p>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-center py-4">No announcements have been posted yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
