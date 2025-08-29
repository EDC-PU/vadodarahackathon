
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";
import { AlertTriangle } from "lucide-react";

interface RegistrationReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegistrationReminderDialog({ isOpen, onClose }: RegistrationReminderDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Registration Deadline Reminder
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-4 text-base text-foreground">
            Your team's registration is still pending. Please ensure your team has <strong>6 members</strong>, including at least <strong>one female member</strong>, before the deadline.
            <br /><br />
            <strong className="text-destructive">Deadline: August 31st, 2025 | 11:59 PM</strong>
            <br /><br />
            Teams that have not completed registration by the deadline will not be considered for the hackathon.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={onClose}>Understood, Close</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
