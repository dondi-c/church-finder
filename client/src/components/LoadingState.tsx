import { Loader2 } from "lucide-react";

export default function LoadingState() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted/50">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  );
}
