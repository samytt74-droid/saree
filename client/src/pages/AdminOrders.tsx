import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, CheckCircle, XCircle, Phone, MapPin, Filter, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Order } from '@shared/schema';

export default function AdminOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: statusFilter !== 'all' ? ['/api/orders', statusFilter] : ['/api/orders'],
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest('PUT', `/api/orders/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "تم تحديث حالة الطلب",
        description: "تم تحديث حالة الطلب بنجاح",
      });
    },
  });

  const getOrderItems = (itemsString: string) => {
    try {
      return JSON.parse(itemsString);
    } catch {
      return [];
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'في الانتظار', color: 'bg-yellow-500' },
      confirmed: { label: 'مؤكد', color: 'bg-blue-500' },
      preparing: { label: 'قيد التحضير', color: 'bg-orange-500' },
      on_way: { label: 'في الطريق', color: 'bg-purple-500' },
      delivered: { label: 'تم التوصيل', color: 'bg-green-500' },
      cancelled: { label: 'ملغي', color: 'bg-red-500' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={`${config.color} hover:${config.color}`}>{config.label}</Badge>;
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'on_way',
      on_way: 'delivered',
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

  const getNextStatusLabel = (currentStatus: string) => {
    const labels = {
      pending: 'تأكيد الطلب',
      confirmed: 'بدء التحضير',
      preparing: 'تجهيز للتوصيل',
      on_way: 'تم التوصيل',
    };
    return labels[currentStatus as keyof typeof labels];
  };

  const filteredOrders = orders?.filter(order => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة الطلبات</h1>
            <p className="text-muted-foreground">متابعة وإدارة جميع الطلبات</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-order-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الطلبات</SelectItem>
              <SelectItem value="pending">في الانتظار</SelectItem>
              <SelectItem value="confirmed">مؤكدة</SelectItem>
              <SelectItem value="preparing">قيد التحضير</SelectItem>
              <SelectItem value="on_way">في الطريق</SelectItem>
              <SelectItem value="delivered">تم التوصيل</SelectItem>
              <SelectItem value="cancelled">ملغية</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 bg-muted rounded w-32" />
                  <div className="h-6 bg-muted rounded w-20" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredOrders?.length ? (
          filteredOrders.map((order) => {
            const items = getOrderItems(order.items);
            const nextStatus = getNextStatus(order.status || 'pending');
            const nextStatusLabel = getNextStatusLabel(order.status || 'pending');
            
            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">طلب #{order.id}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('ar-YE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(order.status || 'pending')}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Customer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">معلومات العميل</h4>
                      <p className="text-sm text-foreground">{order.customerName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{order.customerPhone}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">عنوان التوصيل</h4>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="text-sm text-muted-foreground">{order.deliveryAddress}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">تفاصيل الطلب</h4>
                    <div className="space-y-2">
                      {items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-foreground">{item.name} × {item.quantity}</span>
                          <span className="text-muted-foreground">{item.price * item.quantity} ريال</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-border mt-2 pt-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">المجموع الفرعي:</span>
                        <span className="text-foreground">{order.subtotal} ريال</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">رسوم التوصيل:</span>
                        <span className="text-foreground">{order.deliveryFee} ريال</span>
                      </div>
                      <div className="flex justify-between items-center font-semibold">
                        <span className="text-foreground">المجموع:</span>
                        <span className="text-primary">{order.totalAmount} ريال</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment & Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">طريقة الدفع</h4>
                      <p className="text-sm text-muted-foreground">
                        {order.paymentMethod === 'cash' ? 'دفع نقدي' : 'مدفوع مسبقاً'}
                      </p>
                    </div>
                    {order.notes && (
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">ملاحظات</h4>
                        <p className="text-sm text-muted-foreground">{order.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-border">
                    {nextStatus && order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <Button
                        onClick={() => updateOrderStatusMutation.mutate({ 
                          id: order.id, 
                          status: nextStatus 
                        })}
                        disabled={updateOrderStatusMutation.isPending}
                        className="gap-2"
                        data-testid={`button-update-order-${order.id}`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        {nextStatusLabel}
                      </Button>
                    )}
                    
                    {order.status === 'pending' && (
                      <Button
                        variant="destructive"
                        onClick={() => updateOrderStatusMutation.mutate({ 
                          id: order.id, 
                          status: 'cancelled' 
                        })}
                        disabled={updateOrderStatusMutation.isPending}
                        className="gap-2"
                        data-testid={`button-cancel-order-${order.id}`}
                      >
                        <XCircle className="h-4 w-4" />
                        إلغاء الطلب
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => window.open(`tel:${order.customerPhone}`)}
                      className="gap-2"
                      data-testid={`button-call-customer-${order.id}`}
                    >
                      <Phone className="h-4 w-4" />
                      اتصال بالعميل
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        const address = encodeURIComponent(order.deliveryAddress);
                        const googleMapsUrl = order.customerLocationLat && order.customerLocationLng 
                          ? `https://www.google.com/maps?q=${order.customerLocationLat},${order.customerLocationLng}`
                          : `https://www.google.com/maps/search/?api=1&query=${address}`;
                        window.open(googleMapsUrl, '_blank');
                      }}
                      className="gap-2"
                      data-testid={`button-track-location-${order.id}`}
                    >
                      <Navigation className="h-4 w-4" />
                      تتبع الموقع
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {statusFilter === 'all' ? 'لا توجد طلبات' : `لا توجد طلبات ${statusFilter === 'pending' ? 'في الانتظار' : statusFilter === 'confirmed' ? 'مؤكدة' : statusFilter === 'preparing' ? 'قيد التحضير' : statusFilter === 'on_way' ? 'في الطريق' : statusFilter === 'delivered' ? 'مكتملة' : 'ملغية'}`}
            </h3>
            <p className="text-muted-foreground">
              {statusFilter === 'all' 
                ? 'ستظهر الطلبات هنا عند ورودها من العملاء'
                : 'لا توجد طلبات بهذه الحالة حالياً'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}