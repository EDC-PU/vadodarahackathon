
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trash2, ArrowUpDown } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { deleteUser } from "@/ai/flows/delete-user-flow";
import { Input } from "@/components/ui/input";

type SortKey = 'name' | 'email' | 'role' | 'institute' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection } | null>({ key: 'createdAt', direction: 'desc' });
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, orderBy("name")); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
        setUsers(usersData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching users:", error);
        toast({ title: "Error", description: "Failed to fetch users.", variant: "destructive" });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const handleDeleteUser = async (userToDelete: UserProfile) => {
    setIsProcessing(userToDelete.uid);
    try {
        const result = await deleteUser({ uid: userToDelete.uid });
        if (result.success) {
            toast({ title: "Success", description: result.message });
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error", description: "An unexpected error occurred while deleting the user.", variant: "destructive" });
    } finally {
        setIsProcessing(null);
    }
  };

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };
  
  const filteredAndSortedUsers = useMemo(() => {
    let sortableItems = [...users];
    
    // Filter first
    if (searchTerm) {
        sortableItems = sortableItems.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.institute && user.institute.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    // Then sort
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [users, searchTerm, sortConfig]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Manage Users</h1>
        <p className="text-muted-foreground">View and manage all user accounts on the portal.</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                {filteredAndSortedUsers.length} user(s) found.
              </CardDescription>
            </div>
            <Input 
                placeholder="Search by name, email, institute..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('name')}>Name {getSortIndicator('name')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('email')}>Email {getSortIndicator('email')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('role')}>Role {getSortIndicator('role')}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => requestSort('institute')}>Institute {getSortIndicator('institute')}</Button></TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedUsers.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>{user.role}</Badge></TableCell>
                    <TableCell>{user.institute || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={isProcessing === user.uid || user.role === 'admin'}>
                                    {isProcessing === user.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Delete {user.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the user account for {user.email} from both authentication and the database.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user)} className="bg-destructive hover:bg-destructive/90">Delete User</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filteredAndSortedUsers.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-10">No users match your search.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
