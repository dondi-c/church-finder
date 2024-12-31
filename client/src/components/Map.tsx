import { useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Church } from "../pages/Home";
import LoadingState from "@/components/LoadingState";
import { useToast } from "@/hooks/use-toast";

interface MapProps {
  onChurchSelect: (church: Church) => void;
}

// Add proper type declarations for Google Maps
declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

export default function Map({ onChurchSelect }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const { toast } = useToast();

  const { data: mapConfig, isLoading, isError, error } = useQuery({
    queryKey: ["/api/maps/script"],
    retry: false,
  });

  const searchChurches = useCallback((map: google.maps.Map) => {
    const service = new google.maps.places.PlacesService(map);
    const bounds = map.getBounds();
    if (!bounds) return;

    const request = {
      bounds,
      type: "church",
    };

    service.nearbySearch(
      request,
      (
        results: google.maps.places.PlaceResult[],
        status: google.maps.places.PlacesServiceStatus
      ) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          // Clear existing markers
          markersRef.current.forEach((marker) => marker.setMap(null));
          markersRef.current = [];

          results.forEach((place) => {
            if (place.geometry?.location) {
              const marker = new google.maps.Marker({
                map,
                position: place.geometry.location,
                title: place.name,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#4f46e5",
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: "#ffffff",
                },
              });

              marker.addListener("click", () => {
                if (place.place_id && place.name && place.vicinity) {
                  onChurchSelect({
                    place_id: place.place_id,
                    name: place.name,
                    vicinity: place.vicinity,
                    rating: place.rating,
                    geometry: {
                      location: {
                        lat: place.geometry!.location!.lat(),
                        lng: place.geometry!.location!.lng(),
                      },
                    },
                    photos: place.photos?.map((photo) => ({
                      photo_reference: photo.getUrl(),
                    })),
                  });
                }
              });

              markersRef.current.push(marker);
            }
          });
        }
      }
    );
  }, [onChurchSelect]);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.006 },
        zoom: 13,
        styles: [
          {
            featureType: "poi.business",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      mapInstanceRef.current = map;

      // Add custom event listener for centering
      mapRef.current.addEventListener("setCenter", ((
        e: CustomEvent<{ lat: number; lng: number }>
      ) => {
        map.setCenter(e.detail);
        map.setZoom(14);
      }) as EventListener);

      // Search for churches when map becomes idle
      map.addListener("idle", () => {
        searchChurches(map);
      });

      // Try to get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            map.setCenter(userLocation);
            map.setZoom(14);
          },
          () => {
            // Using default location (already set)
          }
        );
      }
    } catch (error) {
      console.error("Error initializing map:", error);
      toast({
        title: "Error",
        description: "Failed to initialize the map. Please refresh the page.",
        variant: "destructive",
      });
    }
  }, [searchChurches, toast]);

  useEffect(() => {
    if (!mapConfig?.apiKey) return;

    const loadGoogleMaps = async () => {
      try {
        // If Google Maps is already loaded, initialize the map
        if (window.google?.maps) {
          initializeMap();
          return;
        }

        // Load Google Maps script
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

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        // Clear all markers
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

  return <div ref={mapRef} role="map" className="w-full h-full" />;
}