
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EventSettingsPage() {

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Event Settings</h1>
        <p className="text-muted-foreground">Update global hackathon information.</p>
      </header>
      
      <Card>
         <CardHeader>
          <CardTitle>Event Information</CardTitle>
          <CardDescription>Update hackathon details like dates, rewards, and important documents.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
             <div className="space-y-2">
                <Label htmlFor="event-dates">Event Dates</Label>
                <Input id="event-dates" placeholder="e.g., September 9th-10th, 2024" />
             </div>
             <div className="space-y-2">
                <Label htmlFor="brochure-url">Brochure URL</Label>
                <Input id="brochure-url" type="url" placeholder="https://example.com/brochure.pdf" />
             </div>
              <div className="space-y-2">
                <Label htmlFor="ps-url">Problem Statements URL</Label>
                <Input id="ps-url" type="url" placeholder="https://example.com/problem-statements.pdf" />
             </div>
             <Button>Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
