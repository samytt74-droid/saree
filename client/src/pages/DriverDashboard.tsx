import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Truck, 
  MapPin, 
  Clock, 
  DollarSign, 
  LogOut,
  Navigation,
  Phone,
  CheckCircle,
  XCircle,
  Package,
  User,
  Bell,
  Eye,
  RefreshCw
} from 'lucide-react';
import type { Order, Driver } from '@shared/schema';

interface DriverDashboardProps {
  onLogout: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onLogout }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [driverStatus, setDriverStatus] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // تحقق من تسجيل الدخول وجلب بيانات السائق
  useEffect(() => {
    const token = localStorage.getItem('driver_token');
    const driverData = localStorage.getItem('driver_user');
    
    if (!token || !driverData) {
      console.log('❌ لا توجد بيانات تسجيل دخول، إعادة توجيه...');
      window.location.href = '/driver-login';
      return;
    }

    try {
      const driver = JSON.parse(driverData);
      console.log('✅ تم تحميل بيانات السائق:', driver.name);
      setCurrentDriver(driver);
      setDriverStatus(driver.isAvailable);
    } catch (error) {
      console.error('Error parsing driver data:', error);
      console.log('❌ خطأ في تحليل بيانات السائق، إعادة توجيه...');
      handleLogout();
    }
  }, []);

  // جلب الطلبات المتاحة مع تحديث تلقائي
  const { data: availableOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders', { status: 'confirmed', driverId: currentDriver?.id }],
    enabled: !!currentDriver?.id && driverStatus,
    refetchInterval: 5000, // تحديث كل 5 ثوان
  });

  // جلب الطلبات الحالية للسائق
  const { data: myOrders = [], refetch: refetchMyOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders', { driverId: currentDriver?.id, status: 'on_way,preparing,ready' }],
    enabled: !!currentDriver?.id,
    refetchInterval: 3000,
  });

  // قبول طلب
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('PUT', `/api/orders/${orderId}`, {
        status: 'on_way',
        driverId: currentDriver?.id,
      });
      return response.json();
    },
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      refetchOrders();
      refetchMyOrders();
      toast({
        title: "تم قبول الطلب",
        description: "يمكنك الآن بدء رحلة التوصيل",
      });
      setShowOrderDetails(false);
      setSelectedOrder(null);
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في قبول الطلب. قد يكون تم قبوله من سائق آخر",
        variant: "destructive"
      });
      refetchOrders(); // تحديث القائمة
    }
  });

  // إكمال طلب
  const completeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('PUT', `/api/orders/${orderId}`, {
        status: 'delivered',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      refetchMyOrders();
      toast({
        title: "تم تسليم الطلب",
        description: "تم تحديث حالة الطلب بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تسليم الطلب",
        variant: "destructive"
      });
    }
  });

  // تحديث حالة السائق
  const updateDriverStatus = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      if (!currentDriver?.id) throw new Error('No driver ID');
      
      const response = await apiRequest('PUT', `/api/drivers/${currentDriver.id}`, {
        isAvailable,
      });
      return response.json();
    },
    onSuccess: (_, isAvailable: boolean) => {
      setDriverStatus(isAvailable);
      if (currentDriver) {
        const updatedDriver = { ...currentDriver, isAvailable };
        setCurrentDriver(updatedDriver);
        localStorage.setItem('driver_user', JSON.stringify(updatedDriver));
      }
      
      toast({
        title: isAvailable ? "أنت متاح الآن" : "أنت غير متاح",
        description: isAvailable ? "ستتلقى طلبات جديدة" : "لن تتلقى طلبات جديدة",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تحديث الحالة",
        variant: "destructive"
      });
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_user');
    onLogout();
  };

  const getOrderItems = (itemsString: string) => {
    try {
      return JSON.parse(itemsString);
    } catch {
      return [];
    }
  };

  const parseDecimal = (value: string | null): number => {
    if (!value) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleAcceptOrder = (orderId: string) => {
    acceptOrderMutation.mutate(orderId);
  };

  if (!currentDriver) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const todayEarnings = parseDecimal(currentDriver.earnings) || 450;
  const todayOrders = myOrders.filter(order => {
    const today = new Date().toDateString();
    const orderDate = new Date(order.createdAt).toDateString();
    return today === orderDate;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - محسن للهاتف */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">{currentDriver.name}</h1>
                <p className="text-xs text-muted-foreground">سائق توصيل</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="driver-status" className="text-xs text-foreground">متاح</Label>
                <Switch
                  id="driver-status"
                  checked={driverStatus}
                  onCheckedChange={(checked) => updateDriverStatus.mutate(checked)}
                  disabled={updateDriverStatus.isPending}
                  size="sm"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4 pb-20">
        {/* إحصائيات اليوم - محسنة للهاتف */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-6 w-6 text-green-500 mx-auto mb-1" />
              <h3 className="text-lg font-bold text-foreground">
                {todayEarnings} ريال
              </h3>
              <p className="text-xs text-muted-foreground">أرباح اليوم</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 text-center">
              <Package className="h-6 w-6 text-primary mx-auto mb-1" />
              <h3 className="text-lg font-bold text-foreground">
                {todayOrders}
              </h3>
              <p className="text-xs text-muted-foreground">طلبات اليوم</p>
            </CardContent>
          </Card>
        </div>

        {/* الطلبات الحالية */}
        {myOrders.filter(order => order.status === 'on_way').length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-800 text-lg">
                <Package className="h-5 w-5" />
                الطلبات الحالية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {myOrders.filter(order => order.status === 'on_way').map((order) => (
                <div key={order.id} className="bg-white border border-orange-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">طلب #{order.id.slice(0, 8)}</h4>
                      <p className="text-xs text-muted-foreground">{order.customerName}</p>
                    </div>
                    <Badge className="bg-orange-500 hover:bg-orange-500 text-xs">جاري التوصيل</Badge>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-foreground line-clamp-1">{order.deliveryAddress}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-foreground">{order.customerPhone}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`tel:${order.customerPhone}`)}
                      className="text-xs"
                    >
                      <Phone className="h-3 w-3" />
                      اتصال
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress)}`)}
                      className="text-xs"
                    >
                      <Navigation className="h-3 w-3" />
                      خريطة
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => completeOrderMutation.mutate(order.id)}
                      disabled={completeOrderMutation.isPending}
                      className="text-xs bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-3 w-3" />
                      تسليم
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* الطلبات المتاحة */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-primary" />
                الطلبات المتاحة
                {availableOrders.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {availableOrders.length}
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchOrders()}
                disabled={ordersLoading}
              >
                <RefreshCw className={`h-4 w-4 ${ordersLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!driverStatus ? (
              <div className="text-center py-6">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">قم بتفعيل حالة التوفر لاستقبال الطلبات</p>
              </div>
            ) : ordersLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : availableOrders.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {availableOrders.map((order) => {
                  const items = getOrderItems(order.items);
                  const totalAmount = parseDecimal(order.totalAmount);
                  const commission = Math.round(totalAmount * 0.1);
                  
                  return (
                    <div key={order.id} className="border border-border rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-foreground text-sm">طلب #{order.id.slice(0, 8)}</h4>
                          <p className="text-xs text-muted-foreground">{order.customerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary text-sm">{totalAmount} ريال</p>
                          <p className="text-xs text-green-600">عمولة: {commission} ريال</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-foreground line-clamp-1">{order.deliveryAddress}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-foreground">
                            {items.length} عنصر - {order.paymentMethod === 'cash' ? 'دفع نقدي' : 'مدفوع مسبقاً'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewOrder(order)}
                          className="text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          عرض التفاصيل
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleAcceptOrder(order.id)}
                          disabled={acceptOrderMutation.isPending}
                          className="text-xs bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          قبول الطلب
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد طلبات متاحة في الوقت الحالي</p>
                <p className="text-xs text-muted-foreground mt-1">سيتم إشعارك عند توفر طلبات جديدة</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ملخص الأرباح */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              ملخص الأرباح
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-muted-foreground">هذا الأسبوع</p>
                <p className="text-lg font-bold text-foreground">1,250 ريال</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-muted-foreground">هذا الشهر</p>
                <p className="text-lg font-bold text-foreground">4,800 ريال</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-muted-foreground">متوسط الطلب</p>
                <p className="text-lg font-bold text-foreground">85 ريال</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-muted-foreground">التقييم</p>
                <p className="text-lg font-bold text-foreground">4.9 ⭐</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* نافذة تفاصيل الطلب */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full max-h-[80vh] rounded-t-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">تفاصيل الطلب #{selectedOrder.id.slice(0, 8)}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOrderDetails(false)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* معلومات العميل */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold mb-2">معلومات العميل</h4>
                <div className="space-y-1">
                  <p className="text-sm"><strong>الاسم:</strong> {selectedOrder.customerName}</p>
                  <p className="text-sm"><strong>الهاتف:</strong> {selectedOrder.customerPhone}</p>
                  <p className="text-sm"><strong>العنوان:</strong> {selectedOrder.deliveryAddress}</p>
                  {selectedOrder.notes && (
                    <p className="text-sm"><strong>ملاحظات:</strong> {selectedOrder.notes}</p>
                  )}
                </div>
              </div>

              {/* تفاصيل الطلب */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-semibold mb-2">تفاصيل الطلب</h4>
                <div className="space-y-2">
                  {getOrderItems(selectedOrder.items).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">{parseFloat(item.price) * item.quantity} ريال</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>المجموع:</span>
                      <span className="text-primary">{parseDecimal(selectedOrder.totalAmount)} ريال</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>عمولتك:</span>
                      <span>{Math.round(parseDecimal(selectedOrder.totalAmount) * 0.1)} ريال</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowOrderDetails(false)}
                  className="w-full"
                >
                  إغلاق
                </Button>
                <Button
                  onClick={() => handleAcceptOrder(selectedOrder.id)}
                  disabled={acceptOrderMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {acceptOrderMutation.isPending ? 'جاري القبول...' : 'قبول الطلب'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};