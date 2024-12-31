import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Church } from "../pages/Home";
import LoadingState from "@/components/LoadingState";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface MapProps {
  onChurchSelect: (church: Church) => void;
  selectedDenomination: string | null;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface MapConfig {
  apiKey: string;
}

export default function Map({ onChurchSelect, selectedDenomination }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const { toast } = useToast();

  const { data: mapConfig, isLoading, isError, error } = useQuery<MapConfig>({
    queryKey: ["/api/maps/script"],
    retry: false,
  });

  const requestLocation = useCallback((map: any) => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Your browser doesn't support geolocation. You can still browse the map manually.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        map.setCenter(userLocation);
        map.setZoom(14);

        toast({
          title: "Location Found",
          description: "Showing churches near you.",
        });
        setIsLocating(false);
        setLocationError(null);
      },
      (error) => {
        let errorMessage = "Unable to get your location. ";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission was denied. To enable location access:\n1. Click the location icon in your browser's address bar\n2. Select 'Allow' for this site\n3. Refresh the page";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is currently unavailable. Please try again later.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please check your connection and try again.";
            break;
          default:
            errorMessage = "An unexpected error occurred while getting your location.";
        }

        setLocationError(errorMessage);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [toast]);

  const searchChurches = useCallback((map: any) => {
    const service = new window.google.maps.places.PlacesService(map);
    const bounds = map.getBounds();
    if (!bounds) return;

    const request = {
      bounds,
      type: "church",
      fields: ["name", "geometry", "place_id", "vicinity", "rating", "photos"],
    };

    service.nearbySearch(request, async (results: any, status: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        // Clear existing markers
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        for (const place of results) {
          try {
            if (!place.geometry?.location || !place.place_id) continue;

            // Get photo references directly from the place result
            const photos = place.photos?.map((photo: any) => ({
              photo_reference: photo.photo_reference,
            })).slice(0, 1) || [];

            console.log("Photo reference for", place.name, ":", photos[0]?.photo_reference);


            const response = await fetch(
              `/api/churches/${place.place_id}?${new URLSearchParams({
                name: place.name || "",
                vicinity: place.vicinity || "",
                lat: place.geometry.location.lat().toString(),
                lng: place.geometry.location.lng().toString(),
                rating: place.rating?.toString() || "",
              })}`
            );

            if (!response.ok) {
              console.error("Error fetching church:", await response.text());
              continue;
            }

            const churchData = await response.json();

            // Skip if denomination filter is active and doesn't match
            if (selectedDenomination && churchData.denomination !== selectedDenomination) {
              continue;
            }

            const marker = new window.google.maps.Marker({
              map,
              position: place.geometry.location,
              title: place.name,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#4f46e5",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#ffffff",
              },
            });

            marker.addListener("click", () => {
              const church: Church = {
                place_id: place.place_id,
                name: place.name,
                vicinity: place.vicinity,
                rating: place.rating,
                photos,
                geometry: {
                  location: {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                  },
                },
              };

              onChurchSelect(church);
            });

            markersRef.current.push(marker);
          } catch (error) {
            console.error("Error processing church:", error);
          }
        }
      }
    });
  }, [onChurchSelect, selectedDenomination]);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      const defaultCenter = { lat: -33.8688, lng: 151.2093 };

      const map = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 13,
        styles: [
          {
            featureType: "poi.business",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      mapInstanceRef.current = map;

      mapRef.current.addEventListener("setCenter", ((
        e: CustomEvent<{ lat: number; lng: number }>
      ) => {
        map.setCenter(e.detail);
        map.setZoom(14);
      }) as EventListener);

      map.addListener("idle", () => {
        searchChurches(map);
      });

      requestLocation(map);
    } catch (error) {
      console.error("Error initializing map:", error);
      toast({
        title: "Map Error",
        description: "Failed to initialize the map. Please refresh the page.",
        variant: "destructive",
      });
    }
  }, [searchChurches, toast, requestLocation]);

  useEffect(() => {
    if (!mapConfig?.apiKey) return;

    const loadGoogleMaps = async () => {
      try {
        if (window.google?.maps) {
          initializeMap();
          return;
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${mapConfig.apiKey}&libraries=places`;
        script.async = true;

        await new Promise<void>((resolve, reject) => {
          script.onload = () => {
            initializeMap();
            resolve();
          };
          script.onerror = () => reject(new Error("Failed to load Google Maps"));
          document.head.appendChild(script);
        });
      } catch (error) {
        console.error("Error loading Google Maps:", error);
        toast({
          title: "Error",
          description: "Failed to load Google Maps. Please refresh the page.",
          variant: "destructive",
        });
      }
    };

    loadGoogleMaps();

    return () => {
      if (mapInstanceRef.current) {
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];
      }
    };
  }, [mapConfig?.apiKey, initializeMap, toast]);

  if (isError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/50">
        <div className="text-center p-4">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load the map"}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="relative w-full h-full">
      {locationError && (
        <Alert variant="destructive" className="absolute top-4 left-4 right-4 z-10 max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Location Error</AlertTitle>
          <AlertDescription className="whitespace-pre-line">
            {locationError}
          </AlertDescription>
        </Alert>
      )}
      <div ref={mapRef} role="map" className="w-full h-full" />
    </div>
  );
}