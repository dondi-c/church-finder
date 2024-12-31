import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Church } from "../pages/Home";
import { MapPin, Star, Clock, Globe, Phone, Plus, Edit2, Navigation } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import ServiceTimeForm from "./ServiceTimeForm";
import ChurchDetailsForm from "./ChurchDetailsForm";
import ReviewForm from "./ReviewForm";
import { ChurchDetails, ServiceTime } from "@/types/church";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { FallbackImage } from "@/components/ui/fallback-image";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface ChurchInfoProps {
  church: Church | null;
}

export default function ChurchInfo({ church }: ChurchInfoProps) {
  const { toast } = useToast();
  const [imageError, setImageError] = useState(false);

  const { data: churchDetails, isError } = useQuery<ChurchDetails>({
    queryKey: [`/api/churches/${church?.place_id}`],
    enabled: !!church?.place_id,
  });

  // Query for church photo
  const { data: photoData, isError: photoError, error: photoQueryError } = useQuery<{ imageUrl: string }>({
    queryKey: [`/api/churches/photos/${encodeURIComponent(church?.name || '')}`],
    enabled: !!church?.name,
    retry: 1,
    onError: (error) => {
      console.error("Failed to fetch church photo:", error);
      toast({
        title: "Photo Error",
        description: "Could not load the church photo. Showing placeholder instead.",
        variant: "destructive",
      });
    }
  });

  const handleGetDirections = () => {
    if (church?.geometry?.location) {
      const { lat, lng } = church.geometry.location;
      window.open(
        `https://maps.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        '_blank'
      );
    }
  };

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

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">
            Error loading church details
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">{church.name}</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetDirections}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Get Directions
          </Button>
          {churchDetails && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Details
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Church Details</DialogTitle>
                </DialogHeader>
                <ChurchDetailsForm church={churchDetails} />
              </DialogContent>
            </Dialog>
          )}
        </div>
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
              {Number(church.rating).toFixed(1)}
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

        {churchDetails?.description && (
          <p className="text-sm text-muted-foreground">
            {churchDetails.description}
          </p>
        )}

        {church.name && (
          <div className="mt-4">
            {photoData?.imageUrl && !imageError ? (
              <img
                src={photoData.imageUrl}
                alt={church.name}
                className="w-full h-48 object-cover rounded-md"
                onError={() => {
                  console.error("Failed to load church photo from URL:", photoData.imageUrl);
                  setImageError(true);
                  toast({
                    title: "Photo Error",
                    description: "Could not load the church photo. Showing placeholder instead.",
                    variant: "destructive",
                  });
                }}
              />
            ) : (
              <FallbackImage />
            )}
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
            churchDetails.serviceTimes.map((service: ServiceTime) => (
              <div key={service.id} className="space-y-1">
                <p className="text-sm font-medium">
                  {dayNames[service.day_of_week]}
                  {service.service_type && ` - ${service.service_type}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(`2000-01-01T${service.start_time}`), "h:mm a")} -
                  {format(new Date(`2000-01-01T${service.end_time}`), "h:mm a")}
                  {service.language !== "English" && ` (${service.language})`}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No service times available</p>
          )}
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Star className="h-4 w-4" />
              Reviews & Ratings
            </h3>
            {churchDetails?.id && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Review
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Write a Review</DialogTitle>
                  </DialogHeader>
                  <ReviewForm churchId={churchDetails.id} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          {churchDetails?.reviews && churchDetails.reviews.length > 0 ? (
            <div className="space-y-4">
              {churchDetails.reviews.map((review) => (
                <div key={review.id} className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{review.user_name}</p>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reviews yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}