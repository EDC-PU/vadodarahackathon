
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Megaphone, Link as LinkIcon } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, limit, where } from "firebase/firestore";
import { Announcement, AnnouncementAudience } from "@/lib/types";
import Link from "next/link";

interface AnnouncementsSectionProps {
    itemCount?: number;
    audience: AnnouncementAudience | 'teams_and_all' | 'spocs_and_all';
    initialAnnouncements?: Announcement[]; // Optional prop for server-rendered data
}

export function AnnouncementsSection({ itemCount = 5, audience, initialAnnouncements }: AnnouncementsSectionProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements || []);
  const [loading, setLoading] = useState(!initialAnnouncements);

  useEffect(() => {
    // If initialAnnouncements are provided, we don't need to fetch on the client side initially.
    // The onSnapshot listener will still attach for real-time updates.
    if (audience === 'all' && initialAnnouncements) {
      setLoading(false);
    }
    
    setLoading(true);
    const announcementsCollection = collection(db, 'announcements');
    let audiences: (AnnouncementAudience | "all")[] = [];

    if (audience === 'teams_and_all') {
        audiences = ['all', 'teams'];
    } else if (audience === 'spocs_and_all') {
        audiences = ['all', 'spocs'];
    } else {
        audiences = [audience];
    }
    
    const q = query(
        announcementsCollection, 
        where("audience", "in", audiences),
        orderBy("createdAt", "desc"), 
        limit(itemCount)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
        setAnnouncements(data);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching announcements:", error);
        setLoading(false);
    });
    
    return () => unsubscribe();
  }, [itemCount, audience, initialAnnouncements]);

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
               {announcement.url && (
                <Link href={announcement.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1.5 mt-2">
                    <LinkIcon className="h-3 w-3" />
                    <span>Related Link</span>
                </Link>
              )}
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
