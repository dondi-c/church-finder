import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Church } from "../pages/Home";
import { MapPin, Star } from "lucide-react";

interface ChurchInfoProps {
  church: Church | null;
}

export default function ChurchInfo({ church }: ChurchInfoProps) {
  if (!church) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-muted-foreground">
            Select a church to see details
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">{church.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">{church.vicinity}</p>
        </div>
        
        {church.rating && (
          <div className="flex items-center gap-1">
            <Star className="h-5 w-5 text-yellow-400 fill-current" />
            <span className="text-sm font-medium">
              {church.rating.toFixed(1)}
            </span>
          </div>
        )}

        {church.photos?.[0] && (
          <div className="mt-4">
            <img
              src={`/api/maps/photo/${church.photos[0].photo_reference}`}
              alt={church.name}
              className="w-full h-48 object-cover rounded-md"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
