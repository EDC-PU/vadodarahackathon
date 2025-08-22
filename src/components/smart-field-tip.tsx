
"use client";

import { useState } from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getRegistrationTips } from "@/ai/flows/registration-tips";
import { RegistrationTipsInput } from "@/lib/types";

interface SmartFieldTipProps {
  fieldName: string;
  fieldValue?: string;
  formContext: string;
}

export function SmartFieldTip({ fieldName, fieldValue, formContext }: SmartFieldTipProps) {
  const [tip, setTip] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTip = async () => {
    if (tip) return; // Don't re-fetch if tip is already loaded

    setIsLoading(true);
    setError(null);
    try {
      const result = await getRegistrationTips({
        field: fieldName,
        value: fieldValue,
        formContext: formContext,
      } as RegistrationTipsInput);
      setTip(result.tip);
    } catch (err) {
      console.error("Error fetching AI tip:", err);
      setError("Could not load tip.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover onOpenChange={(open) => { if(open) fetchTip() }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" type="button" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-primary">
          <Lightbulb className="h-4 w-4" />
          <span className="sr-only">Get help</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" side="right" align="center">
        <div className="text-sm">
          {isLoading && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating tip...</span>
            </div>
          )}
          {error && <p className="text-destructive">{error}</p>}
          {!isLoading && !error && tip && <p>{tip}</p>}
          {!isLoading && !error && !tip && <p>No tip available for this field.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
