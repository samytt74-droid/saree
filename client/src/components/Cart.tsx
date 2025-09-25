import { useState, useEffect } from 'react'; // أضف useEffect
import { Minus, Plus, Trash2, ShoppingBag, X, MapPin } from 'lucide-react'; // أضف MapPin
import { useCart } from '../contexts/CartContext';
import { GoogleMapsLocationPicker, LocationData } from './GoogleMapsLocationPicker';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button'; // أضف استيراد Button

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Cart({ isOpen, onClose }: CartProps) {
  const { state, updateQuantity, removeItem, addNotes, clearCart } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(5); // رسوم افتراضية
  const { toast } = useToast();
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    notes: ''
  });

  // جلب إعدادات رسوم التوصيل
  const { data: uiSettings } = useQuery({
    queryKey: ['/api/admin/ui-settings'],
  });

  // حساب رسوم التوصيل بناءً على المسافة
  useEffect(() => {
    if (selectedLocation && selectedLocation.distance) {
      const baseFee = parseFloat(uiSettings?.find((s: any) => s.key === 'delivery_fee_default')?.value || '5');
      const perKmFee = parseFloat(uiSettings?.find((s: any) => s.key === 'delivery_fee_per_km')?.value || '2');
      
      // حساب رسوم التوصيل: الرسوم الأساسية + (المسافة × رسوم الكيلومتر)
      const calculatedFee = baseFee + (selectedLocation.distance * perKmFee);
      setDeliveryFee(Math.round(calculatedFee));
    }
  }, [selectedLocation, uiSettings]);

  // الحصول على موقع المطعم للحساب
  const getRestaurantLocation = () => {
    if (state.restaurantId) {
      // في التطبيق الحقيقي، سنجلب موقع المطعم من API
      // للآن نستخدم موقع افتراضي
      return { lat: 15.3694, lng: 44.1910 };
    }
    return undefined;
  };
  if (!isOpen) return null;

  // Function to save customer info to user profile
  const saveCustomerInfoToProfile = async () => {
    try {
      // For now, we'll use the same demo user ID as in Profile component
      const userId = '5ea1edd8-b9e1-4c9e-84fb-25aa2741a0db';
      
      // Update user profile with delivery info
      await apiRequest('PUT', `/api/users/${userId}`, {
        name: customerInfo.name,
        phone: customerInfo.phone,
        address: selectedLocation?.address,
      });
    } catch (error) {
      console.error('Failed to save customer info to profile:', error);
      // Don't show error to user as this is a background operation
    }
  };

  const handleCheckout = async () => {
    if (!selectedLocation) {
      toast({
        title: "موقع التوصيل مطلوب",
        description: "يرجى تحديد موقع التوصيل من الخريطة",
        variant: "destructive",
      });
      return;
    }

    if (!customerInfo.name || !customerInfo.phone) {
      toast({
        title: "معلومات ناقصة",
        description: "يرجى إدخال الاسم ورقم الهاتف",
        variant: "destructive",
      });
      return;
    }

    try {
      const orderData = {
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        deliveryAddress: selectedLocation.address,
        customerLocationLat: selectedLocation.lat,
        customerLocationLng: selectedLocation.lng,
        notes: customerInfo.notes,
        paymentMethod: 'cash',
        items: JSON.stringify(state.items),
        subtotal: state.subtotal,
        deliveryFee: deliveryFee,
        totalAmount: state.subtotal + deliveryFee,
        restaurantId: state.restaurantId
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const order = await response.json();
        
        // Save customer info to profile after successful order
        await saveCustomerInfoToProfile();
        
        toast({
          title: "تم تأكيد طلبك بنجاح! 🎉",
          description: `رقم الطلب: ${order.order?.orderNumber || order.orderNumber}`,
        });
        clearCart();
        onClose();
      } else {
        throw new Error('فشل في إرسال الطلب');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast({
        title: "خطأ في إرسال الطلب",
        description: "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-end">
      <div className="bg-white w-full max-w-md h-5/6 rounded-t-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-red-500" size={24} />
            <h2 className="text-lg font-semibold">سلة التسوق</h2>
            {state.items.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {state.items.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <ShoppingBag size={64} className="mb-4 opacity-50" />
              <p>سلة التسوق فارغة</p>
              <p className="text-sm">أضف عناصر من المطاعم لتبدأ طلبك</p>
            </div>
          ) : (
            <>
              {/* Restaurant Name */}
              {state.restaurantName && (
                <div className="p-4 bg-gray-50 border-b">
                  <h3 className="font-medium text-gray-800">من {state.restaurantName}</h3>
                </div>
              )}

              {/* Cart Items */}
              <div className="p-4 space-y-4">
                {state.items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <p className="text-red-500 font-medium">{item.price} ر.ي</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 border rounded hover:bg-gray-50"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="px-3 py-1 bg-gray-100 rounded">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 border rounded hover:bg-gray-50"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <span className="font-medium">
                        {(parseFloat(item.price) * item.quantity).toFixed(2)} ر.ي
                      </span>
                    </div>

                    {/* Notes */}
                    <textarea
                      placeholder="ملاحظات خاصة بهذا العنصر"
                      value={item.notes || ''}
                      onChange={(e) => addNotes(item.id, e.target.value)}
                      className="w-full mt-2 p-2 border rounded text-sm resize-none"
                      rows={2}
                    />
                  </div>
                ))}
              </div>

              {/* Checkout Section */}
              {!showCheckout ? (
                <div className="p-4 border-t">
                  {/* Summary */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span>المجموع الفرعي:</span>
                      <span>{state.subtotal.toFixed(2)} ر.ي</span>
                    </div>
                    <div className="flex justify-between">
                      <span>رسوم التوصيل:</span>
                      <span>{deliveryFee.toFixed(2)} ر.ي</span>
                      {selectedLocation?.distance && (
                        <span className="text-xs text-muted-foreground">
                          ({selectedLocation.distance.toFixed(1)} كم)
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>المجموع الكلي:</span>
                      <span className="text-red-500">{(state.subtotal + deliveryFee).toFixed(2)} ر.ي</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowCheckout(true)}
                    className="w-full bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors"
                  >
                    إتمام الطلب
                  </button>
                </div>
              ) : (
                <div className="p-4 border-t space-y-4">
                  {/* Customer Info */}
                  <div>
                    <h3 className="font-medium mb-2">معلومات العميل</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="الاسم *"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                        className="w-full p-3 border rounded-lg"
                      />
                      <input
                        type="tel"
                        placeholder="رقم الهاتف *"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                        className="w-full p-3 border rounded-lg"
                      />
                      <textarea
                        placeholder="ملاحظات إضافية"
                        value={customerInfo.notes}
                        onChange={(e) => setCustomerInfo({...customerInfo, notes: e.target.value})}
                        className="w-full p-3 border rounded-lg resize-none"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* تحديد الموقع */}
                  <div>
                    <h3 className="font-medium mb-2">موقع التوصيل *</h3>
                    {selectedLocation ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-800">{selectedLocation.area}</p>
                            <p className="text-sm text-green-600">{selectedLocation.address}</p>
                            {selectedLocation.distance && (
                              <p className="text-xs text-green-600">
                                المسافة: {selectedLocation.distance.toFixed(1)} كم
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowLocationPicker(true)}
                          >
                            تغيير
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowLocationPicker(true)}
                        data-testid="button-select-location"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        تحديد موقع التوصيل
                      </Button>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCheckout(false)}
                      className="flex-1 border border-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50"
                    >
                      رجوع
                    </button>
                    <button
                      onClick={handleCheckout}
                      className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors"
                    >
                      تأكيد الطلب
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* نافذة تحديد الموقع */}
      <GoogleMapsLocationPicker
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={setSelectedLocation}
        restaurantLocation={getRestaurantLocation()}
      />
    </div>
  );
}
