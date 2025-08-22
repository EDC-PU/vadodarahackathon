"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "./ui/badge";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "./ui/dropdown-menu";

const teams = [
  { name: "Tech Titans", leader: "Rohan Shah", members: 6, category: "Software", status: "Complete" },
  { name: "Code Crusaders", leader: "Priya Patel", members: 4, category: "Software", status: "Incomplete" },
  { name: "Hardware Heroes", leader: "Amit Singh", members: 6, category: "Hardware", status: "Complete" },
];

export default function SpocDashboard() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">SPOC Dashboard</h1>
        <p className="text-muted-foreground">Manage teams from your institute: <strong>Parul University</strong></p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Institute Teams</CardTitle>
          <CardDescription>A list of all teams registered from your institute.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Team Leader</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.name}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.leader}</TableCell>
                  <TableCell>{team.members}/6</TableCell>
                  <TableCell>
                    <Badge variant={team.category === 'Software' ? 'default' : 'secondary'}>{team.category}</Badge>
                  </TableCell>
                  <TableCell>
                     <Badge variant={team.status === 'Complete' ? 'outline' : 'destructive'}>{team.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit Team</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
