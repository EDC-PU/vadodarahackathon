"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, PlusCircle, User, Users, Wrench } from "lucide-react";

const spocs = [
  { name: "Dr. Smith", email: "smith@msu.ac.in", phone: "9876543210", institute: "Maharaja Sayajirao University" },
  { name: "Prof. Jones", email: "jones@nuv.ac.in", phone: "8765432109", institute: "Navrachana University" },
];

const teams = [
    { name: "Tech Titans", institute: "Parul University", members: 6, category: "Software" },
    { name: "Circuit Breakers", institute: "MSU", members: 5, category: "Hardware" },
];

export default function AdminDashboard() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage the hackathon, participants, and SPOCs.</p>
      </header>
      
      <Tabs defaultValue="overview">
        <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="spocs">Manage SPOCs</TabsTrigger>
              <TabsTrigger value="teams">All Teams</TabsTrigger>
              <TabsTrigger value="settings">Event Settings</TabsTrigger>
            </TabsList>
            <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export All Data
            </Button>
        </div>

        <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">150</div>
                        <p className="text-xs text-muted-foreground">+20 since last week</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">850</div>
                         <p className="text-xs text-muted-foreground">Across all teams</p>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="spocs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>SPOC Management</CardTitle>
                <CardDescription>Create and manage institute SPOCs.</CardDescription>
              </div>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add SPOC
              </Button>
            </CardHeader>
            <CardContent>
                {/* SPOC Table would go here */}
                <p>SPOC list will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams">
           <Card>
            <CardHeader>
              <CardTitle>All Registered Teams</CardTitle>
              <CardDescription>View and manage all teams across all institutes.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* All Teams Table would go here */}
                <p>A table with all team data will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
             <CardHeader>
              <CardTitle>Event Information</CardTitle>
              <CardDescription>Update hackathon details like dates, rewards, and documents.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Event settings form would go here */}
              <p>Form to edit event settings will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
