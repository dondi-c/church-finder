import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import Map from "@/components/Map";
import ChurchInfo from "@/components/ChurchInfo";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type Church = {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  photos?: { photo_reference: string }[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
};

export default function Home() {
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const { toast } = useToast();

  const handleLocationClick = useCallback(() => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const map = document.querySelector('[role="map"]') as HTMLElement;
        if (map) {
          const event = new CustomEvent("setCenter", {
            detail: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
          });
          map.dispatchEvent(event);
        }
        setIsLocating(false);
      },
      (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setIsLocating(false);
      }
    );
  }, [toast]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Church Finder
          </h1>
          <p className="text-muted-foreground mt-2">
            Find places of worship in your area
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="relative overflow-hidden h-[600px]">
              <Map onChurchSelect={setSelectedChurch} />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-4 right-4 z-10"
                onClick={handleLocationClick}
                disabled={isLocating}
              >
                {isLocating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" />
                )}
                {isLocating ? "Locating..." : "My Location"}
              </Button>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <ChurchInfo church={selectedChurch} />
          </div>
        </div>
      </div>
    </div>
  );
}
