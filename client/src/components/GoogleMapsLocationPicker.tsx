import { useState, useEffect } from 'react';
import { MapPin, Navigation, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  area?: string;
  city?: string;
  distance?: number;
}

interface GoogleMapsLocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  restaurantLocation?: { lat: number; lng: number };
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleMapsLocationPicker({ 
  onLocationSelect, 
  restaurantLocation,
  className = "",
  isOpen,
  onClose
}: GoogleMapsLocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const { toast } = useToast();

  // طلب إذن الموقع عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      checkLocationPermission();
    }
  }, [isOpen]);

  const checkLocationPermission = async () => {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setHasLocationPermission(permission.state === 'granted');
        
        if (permission.state === 'granted') {
          getCurrentLocation();
        }
      } catch (error) {
        console.error('Error checking location permission:', error);
      }
    }
  };

  const requestLocationPermission = async () => {
    setIsGettingLocation(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setHasLocationPermission(true);
          const location: LocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: `الموقع الحالي (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`,
            area: 'الموقع الحالي',
            city: 'صنعاء'
          };
          
          // حساب المسافة إذا كان موقع المطعم متوفراً
          if (restaurantLocation) {
            location.distance = calculateDistance(
              position.coords.latitude,
              position.coords.longitude,
              restaurantLocation.lat,
              restaurantLocation.lng
            );
          }
          
          setSelectedLocation(location);
          setIsGettingLocation(false);
          
          toast({
            title: "تم تحديد موقعك بنجاح",
            description: "يمكنك الآن المتابعة مع الطلب",
          });
        },
        (error) => {
          console.error('Location error:', error);
          setIsGettingLocation(false);
          toast({
            title: "خطأ في تحديد الموقع",
            description: "يرجى السماح بالوصول للموقع أو اختيار موقع يدوياً",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setIsGettingLocation(false);
      toast({
        title: "خدمة الموقع غير متوفرة",
        description: "يرجى اختيار موقع من القائمة المحفوظة",
        variant: "destructive",
      });
    }
  };

  const getCurrentLocation = () => {
    if (hasLocationPermission) {
      requestLocationPermission();
    }
  };

  // حساب المسافة بين نقطتين (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  // مواقع محفوظة للاختبار
  const savedLocations: LocationData[] = [
    { lat: 15.3694, lng: 44.1910, address: 'صنعاء القديمة، باب اليمن', area: 'باب اليمن', city: 'صنعاء' },
    { lat: 15.3547, lng: 44.2066, address: 'صنعاء الجديدة، شارع الزبيري', area: 'الزبيري', city: 'صنعاء' },
    { lat: 15.3400, lng: 44.1947, address: 'صنعاء، حي السبعين', area: 'السبعين', city: 'صنعاء' },
    { lat: 15.3333, lng: 44.2167, address: 'صنعاء، شارع الستين', area: 'الستين', city: 'صنعاء' },
    { lat: 15.3250, lng: 44.2083, address: 'صنعاء، شارع الخمسين', area: 'الخمسين', city: 'صنعاء' },
  ].map(location => ({
    ...location,
    distance: restaurantLocation ? calculateDistance(
      location.lat, location.lng, 
      restaurantLocation.lat, restaurantLocation.lng
    ) : undefined
  }));

  const selectLocation = (location: LocationData) => {
    setSelectedLocation(location);
    onLocationSelect(location);
    onClose();
  };

  const openGoogleMaps = (location: LocationData) => {
    const url = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            تحديد موقع التوصيل
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* زر الموقع الحالي */}
          <Card>
            <CardContent className="p-4">
              <Button
                onClick={requestLocationPermission}
                disabled={isGettingLocation}
                className="w-full flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
                data-testid="button-current-location"
              >
                {isGettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                {isGettingLocation ? 'جاري تحديد الموقع...' : 'استخدام موقعي الحالي'}
              </Button>
              
              {!hasLocationPermission && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  يرجى السماح بالوصول للموقع للحصول على موقعك الدقيق
                </p>
              )}
            </CardContent>
          </Card>

          {/* المواقع المحفوظة */}
          <div>
            <h4 className="font-medium mb-3">المواقع المحفوظة</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {savedLocations.map((location, index) => (
                <Card 
                  key={index} 
                  className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedLocation?.lat === location.lat && selectedLocation?.lng === location.lng
                      ? 'border-primary bg-primary/5'
                      : ''
                  }`}
                  onClick={() => selectLocation(location)}
                  data-testid={`location-option-${index}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{location.area}</p>
                            <p className="text-xs text-muted-foreground">{location.address}</p>
                            {location.distance && (
                              <p className="text-xs text-blue-600">
                                المسافة: {location.distance.toFixed(1)} كم
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openGoogleMaps(location);
                          }}
                          data-testid={`button-view-map-${index}`}
                        >
                          🗺️
                        </Button>
                        
                        {selectedLocation?.lat === location.lat && selectedLocation?.lng === location.lng && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* الموقع المحدد */}
          {selectedLocation && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">تم تحديد الموقع:</p>
                    <p className="text-xs text-green-700">{selectedLocation.address}</p>
                    {selectedLocation.distance && (
                      <p className="text-xs text-green-600">
                        المسافة من المطعم: {selectedLocation.distance.toFixed(1)} كم
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}