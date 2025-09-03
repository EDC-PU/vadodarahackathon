
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { JuryPanel, UpdateJuryPanelInput } from "@/lib/types";
import { updateJuryPanel } from "@/ai/flows/update-jury-panel-flow";

interface EditJuryPanelDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  panel: JuryPanel;
  onPanelUpdated: () => void;
}

const panelSchema = z.object({
  panelName: z.string().min(3, "Panel name must be at least 3 characters."),
});

export function EditJuryPanelDialog({ isOpen, onOpenChange, panel, onPanelUpdated }: EditJuryPanelDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof panelSchema>>({
    resolver: zodResolver(panelSchema),
    defaultValues: {
      panelName: "",
    },
  });

  useEffect(() => {
    if (panel) {
      form.reset({ panelName: panel.name });
    }
  }, [panel, form]);

  const onSubmit = async (values: z.infer<typeof panelSchema>) => {
    setIsLoading(true);
    try {
      const result = await updateJuryPanel({
        panelId: panel.id,
        panelName: values.panelName,
      });

      if (result.success) {
        toast({
          title: "Success!",
          description: result.message,
        });
        onPanelUpdated();
        onOpenChange(false);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Panel Name</DialogTitle>
          <DialogDescription>
            Update the name for this jury panel. Note: Changing jury members requires deleting and recreating the panel.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="panelName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Panel Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
