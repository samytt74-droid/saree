import { useState } from 'react';
import { useLocation } from 'wouter';
import { Home, Search, Receipt, User, Menu, Settings, Shield, MapPin, Clock, Truck, UserCog, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '../contexts/CartContext';
import CartButton from './CartButton';
import { useToast } from '@/hooks/use-toast';
import { useUiSettings } from '@/context/UiSettingsContext';

interface LayoutProps {
  children: React.ReactNode;
}


export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { state } = useCart();
  const getItemCount = () => state.items.reduce((sum, item) => sum + item.quantity, 0);
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isFeatureEnabled } = useUiSettings();
  
  // الاستماع لتغييرات إعدادات الواجهة
  useEffect(() => {
    const handleUiSettingsChange = (event: CustomEvent) => {
      const { key, value } = event.detail;
      
      // تحديث localStorage للتأثير الفوري
      localStorage.setItem(key, value);
      
      // إعادة تحميل الصفحة إذا كان التغيير يؤثر على التنقل
      if (key.includes('show_') && key.includes('_page')) {
        window.location.reload();
      }
    };
    
    window.addEventListener('uiSettingsChanged', handleUiSettingsChange as EventListener);
    return () => {
      window.removeEventListener('uiSettingsChanged', handleUiSettingsChange as EventListener);
    };
  }, []);
  
  // Get visibility settings from UiSettings instead of localStorage
  const showAdminPanel = isFeatureEnabled('show_admin_panel');
  const showDeliveryApp = isFeatureEnabled('show_delivery_app'); 
  const showOrdersPage = isFeatureEnabled('show_orders_page');
  const showTrackOrdersPage = isFeatureEnabled('show_track_orders_page');

  // Settings are now handled automatically by UiSettings context
  // No need for manual event listeners

  const isAdminPage = location.startsWith('/admin');
  const isDeliveryPage = location.startsWith('/delivery');

  // Dynamic navigation items based on visibility settings
  const navigationItems = [
    { icon: Home, label: 'الرئيسية', path: '/', testId: 'nav-home' },
    { icon: Search, label: 'البحث', path: '/search', testId: 'nav-search' },
    ...(showOrdersPage ? [{ icon: Receipt, label: 'طلباتي', path: '/orders', testId: 'nav-orders' }] : []),
    { icon: User, label: 'الملف الشخصي', path: '/profile', testId: 'nav-profile' },
  ];

  // Dynamic sidebar menu items based on visibility settings
  const baseSidebarMenuItems: Array<{
    icon: React.ComponentType<any>;
    label: string;
    path: string;
    testId: string;
    className?: string;
  }> = [
    { icon: User, label: 'الملف الشخصي', path: '/profile', testId: 'sidebar-profile' },
    ...(showOrdersPage ? [{ icon: Receipt, label: 'طلباتي', path: '/orders', testId: 'sidebar-orders' }] : []),
    { icon: MapPin, label: 'العناوين المحفوظة', path: '/addresses', testId: 'sidebar-addresses' },
    ...(showTrackOrdersPage ? [{ icon: Clock, label: 'تتبع الطلبات', path: '/track-orders', testId: 'sidebar-tracking' }] : []),
    { icon: Settings, label: 'الإعدادات', path: '/settings', testId: 'sidebar-settings' },
    { icon: Shield, label: 'سياسة الخصوصية', path: '/privacy', testId: 'sidebar-privacy' },
  ];
  
  // Admin and delivery buttons (conditionally added)
  const adminDeliveryItems: Array<{
    icon: React.ComponentType<any>;
    label: string;
    path: string;
    testId: string;
    className?: string;
  }> = [];
  if (showAdminPanel) {
    adminDeliveryItems.push({ 
      icon: UserCog, 
      label: 'لوحة التحكم', 
      path: '/admin/dashboard', 
      testId: 'sidebar-admin',
      className: 'text-blue-600 border-l-4 border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
    });
  }
  if (showDeliveryApp) {
    adminDeliveryItems.push({ 
      icon: Truck, 
      label: 'تطبيق التوصيل', 
      path: '/driver', 
      testId: 'sidebar-delivery',
      className: 'text-green-600 border-l-4 border-green-600 bg-green-50 dark:bg-green-900/20' 
    });
  }
  
  // Complete sidebar menu items
  const sidebarMenuItems = [...baseSidebarMenuItems, ...adminDeliveryItems];

  // وظيفة التعامل مع النقر على أيقونة الملف الشخصي - الانتقال إلى تطبيق التوصيل الحقيقي
  const handleProfileIconClick = () => {
    toast({
      title: "الانتقال إلى تطبيق التوصيل",
      description: "مرحباً بك في تطبيق السائق",
    });
    
    // الانتقال المباشر إلى تطبيق التوصيل الحقيقي
    window.location.href = '/driver';
  };


  return (
    <div className="max-w-md mx-auto bg-background min-h-screen shadow-xl relative">
      {/* Header - Redesigned to match reference */}
      <header className="gradient-header text-white sticky top-0 z-40 p-4">
        <div className="flex items-center justify-between mb-4">
          {/* Right side - Menu and User icons */}
          <div className="flex items-center gap-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  data-testid="button-menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="text-right">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">مرحباً بك</h3>
                        <p className="text-sm text-muted-foreground">في تطبيق السريع ون</p>
                      </div>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                
                <div className="mt-8 space-y-2">
                  {sidebarMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isSpecialButton = item.className;
                    return (
                      <Button
                        key={item.path}
                        variant="ghost"
                        className={`w-full justify-start gap-3 h-12 ${item.className || ''}`}
                        onClick={() => {
                          setLocation(item.path);
                          setSidebarOpen(false);
                        }}
                        data-testid={item.testId}
                      >
                        <Icon className={`h-5 w-5 ${isSpecialButton ? '' : 'text-primary'}`} />
                        <span className={isSpecialButton ? '' : 'text-foreground'}>{item.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleProfileIconClick}
              className="relative text-white hover:bg-white/20"
              title="الانتقال إلى تطبيق التوصيل"
              data-testid="button-profile"
            >
              <User className="h-6 w-6" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              data-testid="button-search"
            >
              <Search className="h-6 w-6" />
            </Button>
          </div>

          {/* Center - Title and Location */}
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold text-white">السريع ون</h1>
            <div className="flex items-center justify-center gap-1 text-sm text-white/90">
              <MapPin className="h-4 w-4" />
              <span> بخدمتك دايما</span>
            </div>
          </div>

          {/* Left side - Cart icon */}
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center relative cursor-pointer"
               onClick={() => window.dispatchEvent(new CustomEvent('openCart'))}>
            <ShoppingCart className="h-5 w-5 text-white" />
            {getItemCount() > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {getItemCount()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 bg-gray-50 min-h-screen">
        {children}
      </main>

      {/* Bottom Navigation - hide on admin and delivery pages */}
      {!isAdminPage && !isDeliveryPage && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card border-t border-border px-4 py-2">
          <div className="flex justify-around items-center">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={`flex flex-col items-center gap-1 py-2 px-3 ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setLocation(item.path)}
                  data-testid={item.testId}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Floating Cart Button - hide on admin and delivery pages */}
      {getItemCount() > 0 && !isAdminPage && !isDeliveryPage && <CartButton />}
    </div>
  );
}
