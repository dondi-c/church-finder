import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Church } from "../pages/Home";
import { MapPin, Star, Clock, Globe, Phone, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import ServiceTimeForm from "./ServiceTimeForm";

interface ChurchInfoProps {
  church: Church | null;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ChurchInfo({ church }: ChurchInfoProps) {
  const { data: churchDetails } = useQuery({
    queryKey: [`/api/churches/${church?.place_id}`],
    enabled: !!church?.place_id,
  });

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

        {churchDetails?.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <a 
              href={`tel:${churchDetails.phone}`}
              className="text-sm text-primary hover:underline"
            >
              {churchDetails.phone}
            </a>
          </div>
        )}

        {churchDetails?.website && (
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <a 
              href={churchDetails.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Visit Website
            </a>
          </div>
        )}

        {churchDetails?.denomination && (
          <p className="text-sm">
            <span className="font-medium">Denomination:</span>{" "}
            {churchDetails.denomination}
          </p>
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

        <Separator className="my-4" />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Service Times
            </h3>
            {churchDetails?.id && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Service Time</DialogTitle>
                  </DialogHeader>
                  <ServiceTimeForm churchId={churchDetails.id} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          {churchDetails?.serviceTimes && churchDetails.serviceTimes.length > 0 ? (
            churchDetails.serviceTimes.map((service) => (
              <div key={service.id} className="space-y-1">
                <p className="text-sm font-medium">
                  {dayNames[service.day_of_week]}
                  {service.service_type && ` - ${service.service_type}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(`2000-01-01T${service.start_time}`), 'h:mm a')} - 
                  {format(new Date(`2000-01-01T${service.end_time}`), 'h:mm a')}
                  {service.language !== 'English' && ` (${service.language})`}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No service times available</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}