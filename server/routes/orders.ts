// orders.ts - الملف المعدل بالكامل
import express from "express";
import { storage } from "../storage.js";
import * as schema from "../../shared/schema.js";
import { randomUUID } from "crypto";

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
      restaurantId,
      customerId
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!customerName || !customerPhone || !deliveryAddress || !items || !restaurantId) {
      return res.status(400).json({ 
        error: "بيانات ناقصة: الاسم، الهاتف، العنوان، العناصر، ومعرف المطعم مطلوبة",
        received: { 
          customerName: !!customerName, 
          customerPhone: !!customerPhone, 
          deliveryAddress: !!deliveryAddress, 
          items: !!items, 
          restaurantId: !!restaurantId 
        }
      });
    }

    // التحقق من صحة معرف المطعم
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurantId)) {
      return res.status(400).json({ 
        error: "معرف المطعم غير صحيح", 
        message: "يجب أن يكون معرف المطعم بصيغة UUID صحيحة",
        restaurantId 
      });
    }

    // التحقق من وجود المطعم
    const restaurants = await storage.getRestaurants();
    const restaurant = restaurants.find(r => r.id === restaurantId);
    if (!restaurant) {
      return res.status(400).json({ 
        error: "المطعم المحدد غير موجود", 
        restaurantId 
      });
    }

    // إنشاء رقم طلب فريد
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // التأكد من أن العناصر هي JSON string
    let itemsString;
    try {
      itemsString = typeof items === 'string' ? items : JSON.stringify(items);
    } catch (error) {
      return res.status(400).json({ 
        error: "تنسيق العناصر غير صحيح",
        message: "يجب أن تكون العناصر مصفوفة JSON صالحة"
      });
    }

    // إنشاء الطلب
    const orderData = {
      orderNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim().replace(/\s+/g, ''),
      customerEmail: customerEmail ? customerEmail.trim() : null,
      customerId: customerId || null,
      deliveryAddress: deliveryAddress.trim(),
      notes: notes ? notes.trim() : null,
      paymentMethod: paymentMethod || 'cash',
      status: 'pending',
      items: itemsString,
      subtotal: String(subtotal || 0),
      deliveryFee: String(deliveryFee || 0),
      total: String(totalAmount || 0),
      totalAmount: String(totalAmount || 0),
      driverEarnings: "10.00", // قيمة افتراضية
      restaurantId,
      estimatedTime: restaurant.deliveryTime || '30-45 دقيقة'
    };

    const order = await storage.createOrder(orderData);

    // إنشاء إشعارات
    try {
      // إشعار للمطعم
      await storage.createNotification({
        type: 'new_order',
        title: 'طلب جديد',
        message: `طلب جديد رقم ${orderNumber} من ${customerName}`,
        recipientType: 'restaurant',
        recipientId: restaurantId,
        orderId: order.id,
        isRead: false
      });
      
      // إشعار للسائقين
      await storage.createNotification({
        type: 'new_order',
        title: 'طلب جديد متاح',
        message: `طلب جديد متاح للتوصيل من ${restaurant.name}`,
        recipientType: 'driver',
        recipientId: null,
        orderId: order.id,
        isRead: false
      });
      
      // إشعار للإدارة
      await storage.createNotification({
        type: 'new_order',
        title: 'طلب جديد',
        message: `طلب جديد رقم ${orderNumber} تم استلامه`,
        recipientType: 'admin',
        recipientId: null,
        orderId: order.id,
        isRead: false
      });

      // تتبع الطلب
      await storage.createOrderTracking({
        orderId: order.id,
        status: 'pending',
        message: 'تم استلام الطلب وجاري المراجعة',
        createdBy: 'system',
        createdByType: 'system'
      });
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعارات:', notificationError);
    }

    res.status(201).json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        estimatedTime: order.estimatedTime,
        total: order.totalAmount
      }
    });

  } catch (error: any) {
    console.error("خطأ في إنشاء الطلب:", error);
    
    if (error.code === '22P02') {
      return res.status(400).json({ 
        error: "معرف المطعم غير صحيح"
      });
    }
    
    if (error.code === '23503') {
      return res.status(400).json({ 
        error: "المطعم المحدد غير موجود"
      });
    }
    
    res.status(500).json({ 
      error: "حدث خطأ في الخادم",
      message: error.message 
    });
  }
});

// الحصول على طلبات العميل
router.get("/customer/:phone", async (req, res) => {
  try {
    const phone = req.params.phone.trim().replace(/\s+/g, '');
    
    if (!phone) {
      return res.status(400).json({ 
        error: "رقم الهاتف مطلوب"
      });
    }
    
    const orders = await storage.getOrders();
    
    // فلترة الطلبات حسب رقم الهاتف
    const customerOrders = orders.filter(order => 
      order.customerPhone && order.customerPhone.replace(/\s+/g, '') === phone
    );
    
    res.json(customerOrders);
  } catch (error) {
    console.error("خطأ في جلب طلبات العميل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// الحصول على تفاصيل طلب
router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // التحقق من صحة معرف الطلب
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return res.status(400).json({ 
        error: "معرف الطلب غير صحيح"
      });
    }
    
    const order = await storage.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }
    
    res.json(order);
  } catch (error) {
    console.error("خطأ في جلب تفاصيل الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث حالة الطلب
router.patch("/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, message, updatedBy, updatedByType } = req.body;

    if (!status) {
      return res.status(400).json({ error: "الحالة مطلوبة" });
    }

    // التحقق من صحة معرف الطلب
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return res.status(400).json({ 
        error: "معرف الطلب غير صحيح"
      });
    }

    // تحديث حالة الطلب
    await storage.updateOrder(orderId, { status });

    // الحصول على الطلب المحدث
    const order = await storage.getOrder(orderId);

    // إنشاء رسالة الحالة
    let statusMessage = message || '';
    if (!statusMessage) {
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
    }

    // إنشاء تتبع للطلب
    try {
      await storage.createOrderTracking({
        orderId,
        status,
        message: statusMessage,
        createdBy: updatedBy || 'system',
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
          orderId,
          isRead: false
        });
      }
    } catch (trackingError) {
      console.error('خطأ في إنشاء تتبع الطلب:', trackingError);
    }

    res.json({ success: true, status });
  } catch (error) {
    console.error("خطأ في تحديث حالة الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إلغاء الطلب
router.patch("/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, cancelledBy } = req.body;

    // التحقق من صحة معرف الطلب
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return res.status(400).json({ 
        error: "معرف الطلب غير صحيح"
      });
    }

    await storage.updateOrder(orderId, { status: 'cancelled' });

    // إنشاء تتبع للطلب
    try {
      await storage.createOrderTracking({
        orderId,
        status: 'cancelled',
        message: reason || 'تم إلغاء الطلب',
        createdBy: cancelledBy || 'system',
        createdByType: 'system'
      });

      // إشعار العميل
      const order = await storage.getOrder(orderId);
      if (order) {
        await storage.createNotification({
          type: 'order_cancelled',
          title: 'تم إلغاء الطلب',
          message: `تم إلغاء طلبك رقم ${order.orderNumber}${reason ? ': ' + reason : ''}`,
          recipientType: 'customer',
          recipientId: order.customerId || order.customerPhone,
          orderId,
          isRead: false
        });
      }
    } catch (trackingError) {
      console.error('خطأ في إنشاء تتبع الطلب:', trackingError);
    }

    res.json({ success: true, status: 'cancelled' });
  } catch (error) {
    console.error("خطأ في إلغاء الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;
