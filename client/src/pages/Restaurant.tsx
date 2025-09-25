import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Star, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MenuItemCard from '../components/MenuItemCard';
import type { Restaurant, MenuItem } from '@shared/schema';
import { getRestaurantStatus, canOrderFromRestaurant } from '../utils/restaurantHours';

export default function Restaurant() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string | null>(null);

  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ['/api/restaurants', id],
    refetchInterval: 30000,
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ['/api/restaurants', id, 'menu'],
    refetchInterval: 20000,
  });

const menuCategories = menuItems 
  ? Array.from(new Set(menuItems.map(item => item.category))) 
  : [];
  
  // Auto-select first category when menu items load
  useEffect(() => {
    if (menuItems && menuCategories.length > 0 && !selectedMenuCategory) {
      setSelectedMenuCategory(menuCategories[0]);
    }
  }, [menuItems, menuCategories, selectedMenuCategory]);
  
  const filteredMenuItems = menuItems?.filter(item => item.category === selectedMenuCategory) || [];

  if (restaurantLoading) {
    return (
      <div className="animate-pulse">
        <div className="w-full h-64 bg-muted" />
        <div className="p-4 space-y-4">
          <div className="h-6 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">المطعم غير موجود</p>
      </div>
    );
  }

  const restaurantStatus = getRestaurantStatus(restaurant);
  const orderStatus = canOrderFromRestaurant(restaurant);

  return (
    <div>
      {/* Restaurant Header */}
      <div className="relative">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-64 object-cover"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70"
          onClick={() => setLocation('/')}
          data-testid="button-back"
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
          <h2 className="text-2xl font-bold text-white mb-2" data-testid="restaurant-name">
            {restaurant.name}
          </h2>
          <div className="flex items-center gap-4 text-white/90 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>{restaurant.rating} ({restaurant.reviewCount} تقييم)</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{restaurant.deliveryTime}</span>
            </div>
            <Badge 
              variant={restaurantStatus.isOpen ? "default" : "destructive"}
              className={restaurantStatus.statusColor === 'green' ? "bg-green-500 hover:bg-green-500" : 
                        restaurantStatus.statusColor === 'yellow' ? "bg-yellow-500 hover:bg-yellow-500" : ""}
            >
              {restaurantStatus.isOpen ? 'مفتوح' : 'مغلق'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Restaurant Status Alert */}
      {!orderStatus.canOrder && (
        <Alert className="m-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {orderStatus.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Menu Categories */}
      <div className="sticky top-0 bg-background border-b border-border z-30">
        <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar">
          {menuCategories.map((category) => (
            <Button
              key={category}
              variant={selectedMenuCategory === category ? "default" : "secondary"}
              className="whitespace-nowrap font-medium"
              onClick={() => setSelectedMenuCategory(category)}
              data-testid={`menu-category-${category}`}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <section className="p-4 space-y-4">
        {menuLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 flex gap-4">
                <div className="w-20 h-20 bg-muted rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredMenuItems.length ? (
          filteredMenuItems.map((item) => (
            <MenuItemCard 
              key={item.id} 
              item={item} 
              disabled={!orderStatus.canOrder}
              disabledMessage={orderStatus.message}
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
            />
          ))
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>لا توجد عناصر في هذا التصنيف</p>
          </div>
        )}
      </section>
    </div>
  );
}
