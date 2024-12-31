import { Church } from "lucide-react";

interface FallbackImageProps {
  className?: string;
}

export function FallbackImage({ className = "" }: FallbackImageProps) {
  return (
    <div className={`w-full h-48 bg-muted flex items-center justify-center rounded-md ${className}`}>
      <div className="text-center">
        <Church className="h-12 w-12 text-muted-foreground mb-2 mx-auto" />
        <p className="text-sm text-muted-foreground">Photo unavailable</p>
      </div>
    </div>
  );
}
