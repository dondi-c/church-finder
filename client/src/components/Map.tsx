import { useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Church } from "../pages/Home";
import LoadingState from "@/components/LoadingState";
import { useToast } from "@/hooks/use-toast";
import { fetchWithError } from "@/lib/api";

interface MapProps {
  onChurchSelect: (church: Church) => void;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function Map({ onChurchSelect }: MapProps) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const { toast } = useToast();

  const { data: mapConfig, isLoading, isError, error } = useQuery({
    queryKey: ["/api/maps/script"],
    queryFn: async () => {
      const response = await fetchWithError("/api/maps/script");
      const data = await response.json();
      console.log("Map config loaded:", data); // Debug log
      return data;
    },
  });

  useEffect(() => {
    if (!mapConfig?.apiKey || !mapRef.current) {
      console.log("Missing config or ref:", { hasConfig: !!mapConfig?.apiKey, hasRef: !!mapRef.current }); // Debug log
      return;
    }

    const loadGoogleMaps = async () => {
      try {
        if (window.google?.maps) {
          console.log("Google Maps already loaded, initializing map"); // Debug log
          initializeMap();
          return;
        }

        console.log("Loading Google Maps script"); // Debug log
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${mapConfig.apiKey}&libraries=places`;
          script.async = true;
          script.onload = () => {
            console.log("Google Maps script loaded successfully"); // Debug log
            resolve();
          };
          script.onerror = () => reject(new Error("Failed to load Google Maps"));
          document.head.appendChild(script);
        });

        initializeMap();
      } catch (error) {
        console.error("Error loading Google Maps:", error);
        toast({
          title: "Error",
          description: "Failed to load Google Maps",
          variant: "destructive",
        });
      }
    };

    loadGoogleMaps();
  }, [mapConfig?.apiKey, toast]);

  const searchChurches = useCallback(async (map: any) => {
    if (!window.google?.maps?.places) {
      console.error("Google Places API not loaded");
      return;
    }

    const service = new window.google.maps.places.PlacesService(map);
    const bounds = map.getBounds();

    const request = {
      bounds,
      type: ["church"],
    };

    service.nearbySearch(request, (results: Church[], status: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        console.log("Found churches:", results.length); // Debug log

        // Clear existing markers
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        results.forEach((place) => {
          const marker = new window.google.maps.Marker({
            map,
            position: place.geometry.location,
            title: place.name,
            icon: {
              url: "https://maps.google.com/mapfiles/kml/shapes/church.png",
              scaledSize: new window.google.maps.Size(32, 32),
            },
          });

          marker.addListener("click", () => {
            onChurchSelect(place);
          });

          markersRef.current.push(marker);
        });
      } else {
        console.error("Places search failed:", status);
      }
    });
  }, [onChurchSelect]);

  const initializeMap = useCallback(() => {
    if (!window.google?.maps) {
      console.error("Google Maps not loaded");
      return;
    }

    try {
      console.log("Initializing map"); // Debug log
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 }, // Default to New York City
        zoom: 13,
        styles: [
          {
            featureType: "poi.business",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      mapRef.current.addEventListener("setCenter", (e: CustomEvent) => {
        map.setCenter(e.detail);
        map.setZoom(14);
      });

      map.addListener("idle", () => {
        searchChurches(map);
      });

      // Try to get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log("Got user location"); // Debug log
            map.setCenter({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            map.setZoom(14);
          },
          (error) => {
            console.log("Geolocation failed:", error); // Debug log
            // If geolocation fails, use the default location (already set)
            console.log("Using default location");
          }
        );
      }

      return () => {
        // Cleanup markers
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];
      };
    } catch (error) {
      console.error("Error initializing map:", error);
      toast({
        title: "Error",
        description: "Failed to initialize the map",
        variant: "destructive",
      });
    }
  }, [searchChurches, toast]);

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