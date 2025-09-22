import express from "express";
import { storage } from "../storage.js";
import * as schema from "../../shared/schema.js";

const router = express.Router();

// إنشاء طلب جديد
router.post("/", async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      customerLocationLat,
      customerLocationLng,
      notes,
      paymentMethod,
      items,
      subtotal,
      deliveryFee,
      totalAmount,
      restaurantId
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!customerName || !customerPhone || !deliveryAddress || !items || !restaurantId) {
      return res.status(400).json({ 
        message: "Missing required fields: customerName, customerPhone, deliveryAddress, items, restaurantId",
        received: { customerName, customerPhone, deliveryAddress, items: !!items, restaurantId }
      });
    }

    // التحقق من صحة معرف المطعم
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurantId)) {
      return res.status(400).json({ 
        error: "معرف المطعم غير صحيح", 
        message: "Invalid restaurant ID format. Must be a valid UUID.",
        restaurantId 
      });
    }

    // التحقق من وجود المطعم
    const restaurants = await storage.getRestaurants();
    const restaurant = restaurants.find(r => r.id === restaurantId);
    if (!restaurant) {
      return res.status(400).json({ 
        error: "المطعم المحدد غير موجود", 
        message: "Restaurant not found",
        restaurantId 
      });
    }

    // إنشاء رقم طلب فريد
    const orderNumber = `ORD-${Date.now()}`;

    // إنشاء الطلب
    const orderData = {
      orderNumber,
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      deliveryAddress,
      customerLocationLat: customerLocationLat || null,
      customerLocationLng: customerLocationLng || null,
      notes: notes || null,
      paymentMethod: paymentMethod || 'cash',
      status: 'pending',
      items: typeof items === 'string' ? items : JSON.stringify(items),
      subtotal: String(subtotal || 0),
      deliveryFee: String(deliveryFee || 0),
      total: String(totalAmount || 0),
      totalAmount: String(totalAmount || 0),
      driverEarnings: "0",
      restaurantId,
      estimatedTime: '30-45 دقيقة'
    };

    const order = await storage.createOrder(orderData);

    // إنشاء إشعار للمطعم والسائقين
    try {
      await storage.createNotification({
        type: 'new_order',
        title: 'طلب جديد',
        message: `طلب جديد رقم ${orderNumber} من ${customerName}`,
        recipientType: 'restaurant',
        recipientId: restaurantId,
        orderId: order.id
      });
      
      await storage.createNotification({
        type: 'new_order',
        title: 'طلب جديد متاح',
        message: `طلب جديد متاح للتوصيل من ${restaurant.name}`,
        recipientType: 'driver',
        recipientId: null, // للجميع
        orderId: order.id
      });
      
      await storage.createNotification({
        type: 'new_order',
        title: 'طلب جديد',
        message: `طلب جديد رقم ${orderNumber} تم استلامه`,
        recipientType: 'admin',
        recipientId: null,
        orderId: order.id
      });

      // إنشاء تتبع للطلب
      await storage.createOrderTracking({
        orderId: order.id,
        status: 'pending',
        message: 'تم استلام الطلب وجاري المراجعة',
        createdBy: null, // NULL للعمليات التي يقوم بها النظام
        createdByType: 'system'
      });
    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError);
      // لا نوقف العملية إذا فشل في إنشاء الإشعارات
    }

    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        orderNumber,
        status: 'pending',
        estimatedTime: '30-45 دقيقة',
        total: totalAmount
      }
    });

  } catch (error: any) {
    console.error("Create order error:", error);
    
    // Handle invalid UUID format
    if (error.code === '22P02') {
      return res.status(400).json({ 
        error: "معرف المطعم غير صحيح", 
        message: "Invalid restaurant ID format",
        restaurantId: req.body.restaurantId 
      });
    }
    
    // Handle foreign key constraint violations
    if (error.code === '23503') {
      if (error.constraint_name === 'orders_restaurant_id_restaurants_id_fk') {
        return res.status(400).json({ 
          error: "المطعم المحدد غير موجود", 
          message: "Restaurant not found",
          restaurantId: req.body.restaurantId 
        });
      }
    }
    
    // Handle other specific database errors
    if (error.code) {
      return res.status(400).json({ 
        error: "خطأ في البيانات المرسلة", 
        message: "Invalid data provided",
        details: error.message 
      });
    }
    
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// الحصول على طلبات العميل
router.get("/customer/:phone", async (req, res) => {
  try {
    const phone = req.params.phone.trim();
    
    if (!phone) {
      return res.status(400).json({ 
        error: "رقم الهاتف مطلوب",
        message: "Phone number is required" 
      });
    }
    
    const orders = await storage.getOrders();
    
    // فلترة الطلبات حسب رقم هاتف العميل فقط - إصلاح مشكلة أمنية مهمة
    const customerOrders = orders.filter(order => 
      order.customerPhone === phone || 
      order.customerPhone === phone.replace(/\s+/g, '') ||
      order.customerPhone.replace(/\s+/g, '') === phone.replace(/\s+/g, '')
    );
    
    res.json(customerOrders);
  } catch (error) {
    console.error("خطأ في الحصول على طلبات العميل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// الحصول على تفاصيل طلب
router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const orders = await storage.getOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json({
      ...order
    });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// تحديث حالة الطلب
router.patch("/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, message, updatedBy, updatedByType } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    // تحديث حالة الطلب
    await storage.updateOrder(orderId, { status });

    // الحصول على الطلب المحدث
    const orders = await storage.getOrders();
    const order = orders.find(o => o.id === orderId);

    // إنشاء تتبع للطلب
    let statusMessage = '';
    switch (status) {
      case 'confirmed':
        statusMessage = 'تم تأكيد الطلب وجاري التحضير';
        break;
      case 'preparing':
        statusMessage = 'جاري تحضير الطلب';
        break;
      case 'ready':
        statusMessage = 'الطلب جاهز وجاري البحث عن موصل';
        break;
      case 'picked_up':
        statusMessage = 'تم استلام الطلب من قبل الموصل';
        break;
      case 'on_way':
        statusMessage = 'الموصل في الطريق إليك';
        break;
      case 'delivered':
        statusMessage = 'تم تسليم الطلب بنجاح';
        break;
      case 'cancelled':
        statusMessage = 'تم إلغاء الطلب';
        break;
      default:
        statusMessage = `تم تحديث حالة الطلب إلى ${status}`;
    }

    try {
      await storage.createOrderTracking({
        orderId,
        status,
        message: statusMessage,
        createdBy: updatedBy || null, // NULL للعمليات التي يقوم بها النظام
        createdByType: updatedByType || 'system'
      });

      // إرسال إشعار للعميل
      if (order) {
        await storage.createNotification({
          type: 'order_status',
          title: 'تحديث حالة الطلب',
          message: `طلبك رقم ${order.orderNumber}: ${statusMessage}`,
          recipientType: 'customer',
          recipientId: order.customerId || order.customerPhone,
          orderId
        });
      }
    } catch (trackingError) {
      console.error('Error creating tracking:', trackingError);
    }

    res.json({ success: true, status });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// إلغاء الطلب
router.patch("/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, cancelledBy } = req.body;

    await storage.updateOrder(orderId, { status: 'cancelled' });

    // إنشاء تتبع للطلب
    try {
      await storage.createOrderTracking({
        orderId,
        status: 'cancelled',
        message: reason || 'تم إلغاء الطلب',
        createdBy: cancelledBy || null, // NULL للعمليات التي يقوم بها النظام
        createdByType: 'system'
      });

      // إشعار العميل
      const orders = await storage.getOrders();
      const order = orders.find(o => o.id === orderId);
      if (order) {
        await storage.createNotification({
          type: 'order_cancelled',
          title: 'تم إلغاء الطلب',
          message: `تم إلغاء طلبك رقم ${order.orderNumber}${reason ? ': ' + reason : ''}`,
          recipientType: 'customer',
          recipientId: order.customerId || order.customerPhone,
          orderId
        });
      }
    } catch (trackingError) {
      console.error('Error creating tracking:', trackingError);
    }

    res.json({ success: true, status: 'cancelled' });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;