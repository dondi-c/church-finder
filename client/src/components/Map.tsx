import { useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Church } from "../pages/Home";
import LoadingState from "./LoadingState";
import { useToast } from "@/hooks/use-toast";

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

  const { data: mapScript, isLoading } = useQuery({
    queryKey: ["/api/maps/script"],
    queryFn: async () => {
      const res = await fetch("/api/maps/script");
      const { apiKey } = await res.json();
      return new Promise<void>((resolve) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    },
  });

  const searchChurches = useCallback(async (map: any) => {
    const service = new window.google.maps.places.PlacesService(map);
    const bounds = map.getBounds();
    
    const request = {
      bounds,
      type: ["church"],
    };

    service.nearbySearch(request, (results: Church[], status: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
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
      }
    });
  }, [onChurchSelect]);

  useEffect(() => {
    if (!mapScript || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 40.7128, lng: -74.0060 },
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

    map.addListener("bounds_changed", () => {
      const center = map.getCenter();
      if (!center) return;
      
      localStorage.setItem("lastMapPosition", JSON.stringify({
        lat: center.lat(),
        lng: center.lng(),
        zoom: map.getZoom(),
      }));
    });

    // Restore last position
    const lastPosition = localStorage.getItem("lastMapPosition");
    if (lastPosition) {
      try {
        const { lat, lng, zoom } = JSON.parse(lastPosition);
        map.setCenter({ lat, lng });
        map.setZoom(zoom);
      } catch (error) {
        toast({
          title: "Error",
          description: "Could not restore last map position",
          variant: "destructive",
        });
      }
    }
  }, [mapScript, searchChurches, toast]);

  if (isLoading) {
    return <LoadingState />;
  }

  return <div ref={mapRef} role="map" className="w-full h-full" />;
}
