
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
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ProblemStatementReminderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isLeader: boolean;
}

export function ProblemStatementReminderDialog({ isOpen, onClose, isLeader }: ProblemStatementReminderDialogProps) {
  const router = useRouter();

  const handleSelectClick = () => {
    onClose();
    router.push('/leader/select-problem-statement');
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Final Step: Select Your Problem Statement!
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-4 text-base text-foreground">
            Your team meets all the eligibility criteria, but you still need to select a problem statement to complete your registration.
            <br /><br />
            This is the final step. <strong className="text-destructive">If you do not select a problem statement before the deadline (August 31st, 2025), your team will be automatically dissolved and will not be eligible to participate.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {isLeader ? (
            <>
              <Button variant="outline" onClick={onClose}>I'll Do It Later</Button>
              <Button onClick={handleSelectClick}>Select Problem Statement</Button>
            </>
          ) : (
            <Button onClick={onClose}>Understood, I will inform my leader</Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
