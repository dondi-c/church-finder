import { useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Church } from "../pages/Home";
import LoadingState from "@/components/LoadingState";
import { useToast } from "@/hooks/use-toast";

interface MapProps {
  onChurchSelect: (church: Church) => void;
  selectedDenomination: string | null;
}

// Define Google Maps types
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
  const { toast } = useToast();

  const { data: mapConfig, isLoading, isError, error } = useQuery<MapConfig>({
    queryKey: ["/api/maps/script"],
    retry: false,
  });

  const searchChurches = useCallback((map: any) => {
    const service = new window.google.maps.places.PlacesService(map);
    const bounds = map.getBounds();
    if (!bounds) return;

    const request = {
      bounds,
      type: "church",
    };

    service.nearbySearch(
      request,
      async (results: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          // Clear existing markers
          markersRef.current.forEach((marker) => marker.setMap(null));
          markersRef.current = [];

          for (const place of results) {
            if (place.geometry?.location && place.place_id) {
              try {
                // Fetch church details to check denomination
                const response = await fetch(
                  `/api/churches/${place.place_id}?${new URLSearchParams({
                    name: place.name || "",
                    vicinity: place.vicinity || "",
                    lat: place.geometry.location.lat().toString(),
                    lng: place.geometry.location.lng().toString(),
                    rating: place.rating?.toString() || "",
                  })}`
                );

                if (!response.ok) continue;

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
                  if (place.place_id && place.name && place.vicinity) {
                    const church: Church = {
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
                      photos: place.photos?.map((photo: any) => ({
                        photo_reference: photo.getUrl() || "",
                      })),
                    };

                    onChurchSelect(church);
                  }
                });

                markersRef.current.push(marker);
              } catch (error) {
                console.error("Error fetching church details:", error);
                toast({
                  title: "Error",
                  description: "Failed to load church details",
                  variant: "destructive",
                });
              }
            }
          }
        }
      }
    );
  }, [onChurchSelect, selectedDenomination, toast]);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      // Start with Sydney as default center
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

      // Try to get user's location immediately
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
            // If geolocation fails, use default center (already set)
            toast({
              title: "Location Access Denied",
              description: "Using default location. Click 'My Location' to try again.",
              variant: "destructive",
            });
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