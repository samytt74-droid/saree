import express from "express";
import { storage } from "../storage.js";
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
        error: "بيانات ناقصة: الاسم، الهاتف، العنوان، العناصر، ومعرف المطعم مطلوبة"
      });
    }

    // التحقق من وجود المطعم
    const restaurants = await storage.getRestaurants();
    const restaurant = restaurants.find(r => r.id === restaurantId);
    if (!restaurant) {
      return res.status(400).json({ 
        error: "المطعم المحدد غير موجود"
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
        error: "تنسيق العناصر غير صحيح"
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
      driverEarnings: String(Math.round(parseFloat(totalAmount || '0') * 0.15)), // 15% عمولة
      restaurantId,
      estimatedTime: restaurant.deliveryTime || '30-45 دقيقة'
    };

    const order = await storage.createOrder(orderData);

    // إنشاء إشعارات للجميع
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
      
      // إشعار لجميع السائقين المتاحين
      const availableDrivers = await storage.getAvailableDrivers();
      for (const driver of availableDrivers) {
        await storage.createNotification({
          type: 'new_order_available',
          title: 'طلب جديد متاح للتوصيل',
          message: `طلب جديد من ${restaurant.name} - ${formatCurrency(totalAmount)} - عمولة ${formatCurrency(Math.round(parseFloat(totalAmount || '0') * 0.15))}`,
          recipientType: 'driver',
          recipientId: driver.id,
          orderId: order.id,
          isRead: false
        });
      }
      
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
    res.status(500).json({ 
      error: "حدث خطأ في الخادم",
      message: error.message 
    });
  }
});

// جلب الطلبات مع فلترة محسنة
router.get("/", async (req, res) => {
  try {
    const { status, driverId, available, restaurantId } = req.query;
    
    let orders = await storage.getOrders();
    
    // فلترة حسب الحالة
    if (status && status !== 'all') {
      orders = orders.filter(order => order.status === status);
    }
    
    // فلترة حسب السائق
    if (driverId) {
      orders = orders.filter(order => order.driverId === driverId);
    }
    
    // فلترة الطلبات المتاحة (بدون سائق مُعيَّن)
    if (available === 'true') {
      orders = orders.filter(order => 
        order.status === 'confirmed' && !order.driverId
      );
    }
    
    // فلترة حسب المطعم
    if (restaurantId) {
      orders = orders.filter(order => order.restaurantId === restaurantId);
    }
    
    // ترتيب حسب تاريخ الإنشاء (الأحدث أولاً)
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(orders);
  } catch (error) {
    console.error('خطأ في جلب الطلبات:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تعيين طلب لسائق
router.put("/:id/assign-driver", async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;
    
    if (!driverId) {
      return res.status(400).json({ error: "معرف السائق مطلوب" });
    }

    // التحقق من وجود الطلب
    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // التحقق من أن الطلب متاح للتعيين
    if (order.driverId) {
      return res.status(400).json({ error: "الطلب مُعيَّن لسائق آخر بالفعل" });
    }

    // التحقق من وجود السائق
    const driver = await storage.getDriver(driverId);
    if (!driver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }

    if (!driver.isAvailable || !driver.isActive) {
      return res.status(400).json({ error: "السائق غير متاح حالياً" });
    }

    // تحديث الطلب
    const updatedOrder = await storage.updateOrder(id, {
      driverId,
      status: 'preparing',
      updatedAt: new Date()
    });

    // تحديث حالة السائق إلى مشغول
    await storage.updateDriver(driverId, { isAvailable: false });

    // إنشاء إشعارات
    try {
      // إشعار للعميل
      await storage.createNotification({
        type: 'order_assigned',
        title: 'تم تعيين سائق لطلبك',
        message: `السائق ${driver.name} سيقوم بتوصيل طلبك`,
        recipientType: 'customer',
        recipientId: order.customerId || order.customerPhone,
        orderId: id,
        isRead: false
      });

      // إشعار للسائقين الآخرين بأن الطلب لم يعد متاحاً
      const otherDrivers = await storage.getAvailableDrivers();
      for (const otherDriver of otherDrivers) {
        if (otherDriver.id !== driverId) {
          await storage.createNotification({
            type: 'order_taken',
            title: 'تم استلام الطلب',
            message: `السائق ${driver.name} قام باستلام الطلب`,
            recipientType: 'driver',
            recipientId: otherDriver.id,
            orderId: id,
            isRead: false
          });
        }
      }

      // إشعار للإدارة
      await storage.createNotification({
        type: 'order_assigned',
        title: 'تم تعيين سائق',
        message: `تم تعيين السائق ${driver.name} للطلب ${order.orderNumber}`,
        recipientType: 'admin',
        recipientId: null,
        orderId: id,
        isRead: false
      });

      // تتبع الطلب
      await storage.createOrderTracking({
        orderId: id,
        status: 'preparing',
        message: `تم تعيين السائق ${driver.name} وبدء تحضير الطلب`,
        createdBy: driverId,
        createdByType: 'driver'
      });
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعارات:', notificationError);
    }

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('خطأ في تعيين السائق:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث حالة الطلب
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, updatedBy, updatedByType } = req.body;

    if (!status) {
      return res.status(400).json({ error: "الحالة مطلوبة" });
    }

    // التحقق من وجود الطلب
    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    // تحديث الطلب
    const updatedOrder = await storage.updateOrder(id, {
      status,
      updatedAt: new Date()
    });

    // إنشاء رسالة الحالة
    let statusMessage = '';
    switch (status) {
      case 'confirmed':
        statusMessage = 'تم تأكيد الطلب من المطعم';
        break;
      case 'preparing':
        statusMessage = 'جاري تحضير الطلب';
        break;
      case 'ready':
        statusMessage = 'الطلب جاهز للاستلام';
        break;
      case 'picked_up':
        statusMessage = 'تم استلام الطلب من المطعم';
        break;
      case 'on_way':
        statusMessage = 'السائق في الطريق إليك';
        break;
      case 'delivered':
        statusMessage = 'تم تسليم الطلب بنجاح';
        // تحرير السائق
        if (order.driverId) {
          await storage.updateDriver(order.driverId, { isAvailable: true });
        }
        break;
      case 'cancelled':
        statusMessage = 'تم إلغاء الطلب';
        // تحرير السائق إذا كان مُعيَّناً
        if (order.driverId) {
          await storage.updateDriver(order.driverId, { isAvailable: true });
        }
        break;
      default:
        statusMessage = `تم تحديث حالة الطلب إلى ${status}`;
    }

    // إنشاء إشعارات وتتبع
    try {
      // إشعار للعميل
      await storage.createNotification({
        type: 'order_status_update',
        title: 'تحديث حالة الطلب',
        message: `طلبك رقم ${order.orderNumber}: ${statusMessage}`,
        recipientType: 'customer',
        recipientId: order.customerId || order.customerPhone,
        orderId: id,
        isRead: false
      });

      // إشعار للإدارة
      await storage.createNotification({
        type: 'order_status_update',
        title: 'تحديث حالة الطلب',
        message: `الطلب ${order.orderNumber}: ${statusMessage}`,
        recipientType: 'admin',
        recipientId: null,
        orderId: id,
        isRead: false
      });

      // تتبع الطلب
      await storage.createOrderTracking({
        orderId: id,
        status,
        message: statusMessage,
        createdBy: updatedBy || 'system',
        createdByType: updatedByType || 'system'
      });
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعارات:', notificationError);
    }

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("خطأ في تحديث حالة الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب الطلبات حسب العميل
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
    
    // ترتيب حسب التاريخ (الأحدث أولاً)
    customerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(customerOrders);
  } catch (error) {
    console.error("خطأ في جلب طلبات العميل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// جلب تفاصيل طلب محدد
router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
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

// إلغاء الطلب
router.patch("/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, cancelledBy } = req.body;

    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    await storage.updateOrder(orderId, { status: 'cancelled' });

    // تحرير السائق إذا كان مُعيَّناً
    if (order.driverId) {
      await storage.updateDriver(order.driverId, { isAvailable: true });
    }

    // إنشاء إشعارات
    try {
      await storage.createNotification({
        type: 'order_cancelled',
        title: 'تم إلغاء الطلب',
        message: `تم إلغاء طلبك رقم ${order.orderNumber}${reason ? ': ' + reason : ''}`,
        recipientType: 'customer',
        recipientId: order.customerId || order.customerPhone,
        orderId,
        isRead: false
      });

      await storage.createOrderTracking({
        orderId,
        status: 'cancelled',
        message: reason || 'تم إلغاء الطلب',
        createdBy: cancelledBy || 'system',
        createdByType: 'system'
      });
    } catch (notificationError) {
      console.error('خطأ في إنشاء الإشعارات:', notificationError);
    }

    res.json({ success: true, status: 'cancelled' });
  } catch (error) {
    console.error("خطأ في إلغاء الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Helper function
function formatCurrency(amount: string | number) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${num.toFixed(2)} ريال`;
}

export default router;