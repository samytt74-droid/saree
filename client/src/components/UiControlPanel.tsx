import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUiSettings } from '@/context/UiSettingsContext';
import { Settings, Eye, Palette, Smartphone, UserCog } from 'lucide-react';

export function UiControlPanel() {
  const { loading, updateSetting, isFeatureEnabled } = useUiSettings();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  const handleToggle = (key: string, enabled: boolean) => {
    updateSetting(key, enabled.toString());
  };

  const handleNavigationToggle = (key: string, enabled: boolean) => {
    // Save to localStorage for immediate effect on customer app navigation
    localStorage.setItem(key, enabled.toString());
    // Also save to settings for persistence
    updateSetting(key, enabled.toString());
    
    // Trigger a custom event to notify Layout component immediately
    window.dispatchEvent(new CustomEvent('navigationSettingsChanged', {
      detail: { key, enabled }
    }));
    
    // Force refresh of UiSettings context
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h2 className="text-2xl font-bold">إعدادات التحكم في الواجهة</h2>
      </div>

      {/* إعدادات العرض الأساسية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            إعدادات العرض الأساسية
          </CardTitle>
          <CardDescription>
            تحكم في العناصر المعروضة في الصفحة الرئيسية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show_categories" className="flex-1">
              عرض تصنيفات المطاعم
            </Label>
            <Switch
              id="show_categories"
              checked={isFeatureEnabled('show_categories')}
              onCheckedChange={(checked) => handleToggle('show_categories', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show_search_bar" className="flex-1">
              عرض شريط البحث
            </Label>
            <Switch
              id="show_search_bar"
              checked={isFeatureEnabled('show_search_bar')}
              onCheckedChange={(checked) => handleToggle('show_search_bar', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show_special_offers" className="flex-1">
              عرض العروض الخاصة
            </Label>
            <Switch
              id="show_special_offers"
              checked={isFeatureEnabled('show_special_offers')}
              onCheckedChange={(checked) => handleToggle('show_special_offers', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show_cart_button" className="flex-1">
              عرض زر السلة
            </Label>
            <Switch
              id="show_cart_button"
              checked={isFeatureEnabled('show_cart_button')}
              onCheckedChange={(checked) => handleToggle('show_cart_button', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات المطاعم */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            إعدادات عرض المطاعم
          </CardTitle>
          <CardDescription>
            تحكم في المعلومات المعروضة للمطاعم
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show_ratings" className="flex-1">
              عرض تقييمات المطاعم
            </Label>
            <Switch
              id="show_ratings"
              checked={isFeatureEnabled('show_ratings')}
              onCheckedChange={(checked) => handleToggle('show_ratings', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show_delivery_time" className="flex-1">
              عرض وقت التوصيل
            </Label>
            <Switch
              id="show_delivery_time"
              checked={isFeatureEnabled('show_delivery_time')}
              onCheckedChange={(checked) => handleToggle('show_delivery_time', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show_minimum_order" className="flex-1">
              عرض الحد الأدنى للطلب
            </Label>
            <Switch
              id="show_minimum_order"
              checked={isFeatureEnabled('show_minimum_order')}
              onCheckedChange={(checked) => handleToggle('show_minimum_order', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show_restaurant_description" className="flex-1">
              عرض وصف المطعم
            </Label>
            <Switch
              id="show_restaurant_description"
              checked={isFeatureEnabled('show_restaurant_description')}
              onCheckedChange={(checked) => handleToggle('show_restaurant_description', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات الخدمات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            إعدادات الخدمات والميزات
          </CardTitle>
          <CardDescription>
            تحكم في الخدمات المتاحة في التطبيق
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable_location_services" className="flex-1">
              تفعيل خدمات الموقع
            </Label>
            <Switch
              id="enable_location_services"
              checked={isFeatureEnabled('enable_location_services')}
              onCheckedChange={(checked) => handleToggle('enable_location_services', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات التنقل */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            إعدادات التنقل المتقدم
          </CardTitle>
          <CardDescription>
            تحكم في ظهور أزرار التنقل المتقدمة في القائمة الجانبية للعملاء
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show_admin_panel" className="flex-1">
              عرض زر لوحة التحكم
            </Label>
            <Switch
              id="show_admin_panel"
              checked={isFeatureEnabled('show_admin_panel') || localStorage.getItem('show_admin_panel') === 'true'}
              onCheckedChange={(checked) => handleNavigationToggle('show_admin_panel', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show_delivery_app" className="flex-1">
              عرض زر تطبيق التوصيل
            </Label>
            <Switch
              id="show_delivery_app"
              checked={isFeatureEnabled('show_delivery_app') || localStorage.getItem('show_delivery_app') === 'true'}
              onCheckedChange={(checked) => handleNavigationToggle('show_delivery_app', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* إعدادات الصفحات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            إعدادات الوصول للصفحات
          </CardTitle>
          <CardDescription>
            تحكم في إظهار وإخفاء الصفحات الجديدة في تطبيق العملاء
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show_orders_page" className="flex-1">
              عرض صفحة قائمة الطلبات
            </Label>
            <Switch
              id="show_orders_page"
              checked={isFeatureEnabled('show_orders_page') || localStorage.getItem('show_orders_page') === 'true'}
              onCheckedChange={(checked) => handleNavigationToggle('show_orders_page', checked)}
              data-testid="switch-orders-page"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show_track_orders_page" className="flex-1">
              عرض صفحة تتبع الطلبات
            </Label>
            <Switch
              id="show_track_orders_page"
              checked={isFeatureEnabled('show_track_orders_page') || localStorage.getItem('show_track_orders_page') === 'true'}
              onCheckedChange={(checked) => handleNavigationToggle('show_track_orders_page', checked)}
              data-testid="switch-track-orders-page"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}