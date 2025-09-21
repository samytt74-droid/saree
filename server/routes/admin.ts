import express from "express";
import { storage } from "../storage";
import bcrypt from 'bcryptjs';
import { z } from "zod";
import { eq, and, desc, sql, or, like, asc, inArray } from "drizzle-orm";
import {
  insertRestaurantSchema,
  insertCategorySchema,
  insertSpecialOfferSchema,
  insertAdminUserSchema,
  insertDriverSchema,
  insertMenuItemSchema,
  adminUsers,
  // تم حذف adminSessions
  categories,
  restaurantSections,
  restaurants,
  menuItems,
  users,
  customers,
  userAddresses,
  orders,
  specialOffers,
  notifications,
  ratings,
  systemSettings,
  drivers,
  orderTracking,
  cart,
  favorites
} from "@shared/schema";
import { DatabaseStorage } from "../db";

const router = express.Router();
const dbStorage = new DatabaseStorage();
const db = dbStorage.db;

// Helper function to coerce request data for proper Zod validation
function coerceRequestData(data: any) {
  const coerced = { ...data };
  
  // Convert decimal fields to strings (Zod expects strings for decimal fields)
  ['minimumOrder', 'deliveryFee', 'latitude', 'longitude', 'discountAmount', 'rating'].forEach(field => {
    if (coerced[field] !== undefined && coerced[field] !== null && coerced[field] !== '') {
      coerced[field] = String(coerced[field]);
    } else {
      coerced[field] = undefined; // Use undefined instead of null for optional fields
    }
  });
  
  // Convert integer fields properly
  ['reviewCount', 'discountPercent'].forEach(field => {
    if (coerced[field] !== undefined && coerced[field] !== null && coerced[field] !== '') {
      const parsed = parseInt(coerced[field]);
      coerced[field] = isNaN(parsed) ? undefined : parsed;
    } else {
      coerced[field] = undefined;
    }
  });
  
  // Properly parse boolean fields
  ['isOpen', 'isActive', 'isFeatured', 'isNew', 'isTemporarilyClosed'].forEach(field => {
    if (coerced[field] !== undefined && coerced[field] !== null) {
      const value = coerced[field];
      if (typeof value === 'string') {
        coerced[field] = value === 'true' || value === '1';
      } else if (typeof value === 'number') {
        coerced[field] = !!value;
      } else {
        coerced[field] = Boolean(value);
      }
    }
  });
  
  // Parse date fields
  if (coerced.validUntil !== undefined && coerced.validUntil !== null && coerced.validUntil !== '') {
    const date = new Date(coerced.validUntil);
    coerced.validUntil = isNaN(date.getTime()) ? undefined : date;
  } else {
    coerced.validUntil = undefined;
  }
  
  // Convert optional text/UUID fields to undefined instead of null
  ['categoryId', 'temporaryCloseReason', 'address'].forEach(field => {
    if (coerced[field] === null || coerced[field] === '') {
      coerced[field] = undefined;
    }
  });
  
  return coerced;
}

// Schema object for direct database operations
const schema = {
  adminUsers,
  // تم حذف adminSessions من schema object
  categories,
  restaurantSections,
  restaurants,
  menuItems,
  users,
  customers,
  userAddresses,
  orders,
  specialOffers,
  notifications,
  ratings,
  systemSettings,
  drivers,
  orderTracking,
  cart,
  favorites
};

// تم حذف middleware المصادقة - يمكن الوصول المباشر للبيانات بدون مصادقة

// تم حذف جميع عمليات المصادقة - الوصول مباشر للبيانات بدون مصادقة

// لوحة المعلومات
router.get("/dashboard", async (req, res) => {
  try {
    // جلب البيانات من قاعدة البيانات
    const [restaurants, orders, drivers, users] = await Promise.all([
      storage.getRestaurants(),
      storage.getOrders(),
      storage.getDrivers(),
      storage.getUsers ? storage.getUsers() : []
    ]);

    const today = new Date().toDateString();
    
    // حساب الإحصائيات باستخدام عمليات المصفوفات
    const totalRestaurants = restaurants.length;
    const totalOrders = orders.length;
    const totalDrivers = drivers.length;
    const totalCustomers = users.length; // أو 0 إذا لم تكن متوفرة
    
    const todayOrders = orders.filter(order => 
      order.createdAt.toDateString() === today
    ).length;
    
    const pendingOrders = orders.filter(order => 
      order.status === "pending"
    ).length;
    
    const activeDrivers = drivers.filter(driver => 
      driver.isActive === true
    ).length;

    // حساب الإيرادات
    const deliveredOrders = orders.filter(order => order.status === "delivered");
    const totalRevenue = deliveredOrders.reduce((sum, order) => 
      sum + parseFloat(order.total || "0"), 0
    );
    
    const todayDeliveredOrders = deliveredOrders.filter(order => 
      order.createdAt.toDateString() === today
    );
    const todayRevenue = todayDeliveredOrders.reduce((sum, order) => 
      sum + parseFloat(order.total || "0"), 0
    );

    // الطلبات الأخيرة (أحدث 10 طلبات)
    const recentOrders = orders
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    res.json({
      stats: {
        totalRestaurants,
        totalOrders,
        totalDrivers,
        totalCustomers,
        todayOrders,
        pendingOrders,
        activeDrivers,
        totalRevenue,
        todayRevenue
      },
      recentOrders
    });
  } catch (error) {
    console.error("خطأ في لوحة المعلومات:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إدارة التصنيفات
router.get("/categories", async (req, res) => {
  try {
    const categories = await storage.getCategories();
    // ترتيب التصنيفات حسب sortOrder ثم الاسم
    const sortedCategories = categories.sort((a, b) => {
      const aOrder = a.sortOrder ?? 0;
      const bOrder = b.sortOrder ?? 0;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return a.name.localeCompare(b.name);
    });
    res.json(sortedCategories);
  } catch (error) {
    console.error("خطأ في جلب التصنيفات:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    // التحقق من صحة البيانات مع الحقول المطلوبة
    const validatedData = insertCategorySchema.parse({
      ...req.body,
      // التأكد من وجود الحقول المطلوبة
      sortOrder: req.body.sortOrder || 0,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });
    
    const newCategory = await storage.createCategory(validatedData);
    res.status(201).json(newCategory);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "بيانات التصنيف غير صحيحة", 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }
    console.error("خطأ في إضافة التصنيف:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.put("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // التحقق من صحة البيانات المحدثة (جزئي)
    const validatedData = insertCategorySchema.partial().parse(req.body);
    
    const updatedCategory = await storage.updateCategory(id, {
      ...validatedData, 
      updatedAt: new Date()
    });
    
    if (!updatedCategory) {
      return res.status(404).json({ error: "التصنيف غير موجود" });
    }
    
    res.json(updatedCategory);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "بيانات تحديث التصنيف غير صحيحة", 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }
    console.error("خطأ في تحديث التصنيف:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await storage.deleteCategory(id);
    
    if (!success) {
      return res.status(404).json({ error: "التصنيف غير موجود" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("خطأ في حذف التصنيف:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إدارة المطاعم
router.get("/restaurants", async (req, res) => {
  try {
    const { page = 1, limit = 10, search, categoryId } = req.query;
    
    // جلب المطاعم باستخدام المرشحات
    const filters: any = {};
    if (categoryId) {
      filters.categoryId = categoryId as string;
    }
    if (search) {
      filters.search = search as string;
    }
    
    const allRestaurants = await storage.getRestaurants(filters);
    
    // ترتيب المطاعم حسب تاريخ الإنشاء (الأحدث أولاً)
    const sortedRestaurants = allRestaurants.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    // تطبيق التصفح (pagination)
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedRestaurants = sortedRestaurants.slice(startIndex, endIndex);

    res.json({
      restaurants: paginatedRestaurants,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: sortedRestaurants.length,
        pages: Math.ceil(sortedRestaurants.length / Number(limit))
      }
    });
  } catch (error) {
    console.error("خطأ في جلب المطاعم:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/restaurants", async (req, res) => {
  try {
    console.log("Restaurant creation request data:", req.body);
    
    // تنظيف وتحويل البيانات باستخدام helper function
    const coercedData = coerceRequestData(req.body);
    
    // تقديم قيم افتراضية للحقول المطلوبة
    const restaurantData = {
      // الحقول المطلوبة
      name: coercedData.name || "مطعم جديد",
      description: coercedData.description || "وصف المطعم",
      image: coercedData.image || "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg",
      deliveryTime: coercedData.deliveryTime || "30-45 دقيقة",
      
      // الحقول الاختيارية مع قيم افتراضية
      rating: coercedData.rating || "0.0",
      reviewCount: coercedData.reviewCount || 0,
      minimumOrder: coercedData.minimumOrder || "0",
      deliveryFee: coercedData.deliveryFee || "0",
      categoryId: coercedData.categoryId,
      
      // أوقات العمل
      openingTime: coercedData.openingTime || "08:00",
      closingTime: coercedData.closingTime || "23:00",
      workingDays: coercedData.workingDays || "0,1,2,3,4,5,6",
      
      // حالات المطعم (الآن مع تحويل صحيح للبوليان)
      isOpen: coercedData.isOpen !== undefined ? coercedData.isOpen : true,
      isActive: coercedData.isActive !== undefined ? coercedData.isActive : true,
      isFeatured: coercedData.isFeatured !== undefined ? coercedData.isFeatured : false,
      isNew: coercedData.isNew !== undefined ? coercedData.isNew : false,
      isTemporarilyClosed: coercedData.isTemporarilyClosed !== undefined ? coercedData.isTemporarilyClosed : false,
      temporaryCloseReason: coercedData.temporaryCloseReason,
      
      // الموقع (الآن مع تحويل صحيح للأرقام العشرية)
      latitude: coercedData.latitude,
      longitude: coercedData.longitude,
      address: coercedData.address,
      
      // حقول التوقيت (سيتم إضافتها تلقائياً بواسطة قاعدة البيانات)
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log("Processed restaurant data:", restaurantData);
    
    const validatedData = insertRestaurantSchema.parse(restaurantData);
    
    const newRestaurant = await storage.createRestaurant(validatedData);
    res.status(201).json(newRestaurant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Restaurant validation errors:", error.errors);
      return res.status(400).json({ 
        error: "بيانات المطعم غير صحيحة", 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }
    console.error("خطأ في إضافة المطعم:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.put("/restaurants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // تطبيق coercion على البيانات المحدثة أيضاً
    const coercedData = coerceRequestData(req.body);
    
    // التحقق من صحة البيانات المحدثة (جزئي)
    const validatedData = insertRestaurantSchema.partial().parse(coercedData);
    
    const updatedRestaurant = await storage.updateRestaurant(id, {
      ...validatedData, 
      updatedAt: new Date()
    });
    
    if (!updatedRestaurant) {
      return res.status(404).json({ error: "المطعم غير موجود" });
    }
    
    res.json(updatedRestaurant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "بيانات تحديث المطعم غير صحيحة", 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }
    console.error("خطأ في تحديث المطعم:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.delete("/restaurants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // حذف عناصر القائمة المرتبطة بالمطعم أولاً
    const menuItems = await storage.getMenuItems(id);
    for (const item of menuItems) {
      await storage.deleteMenuItem(item.id);
    }
    
    // حذف الطلبات المرتبطة بالمطعم (تحويل حالتها إلى cancelled)
    const restaurantOrders = await storage.getOrdersByRestaurant(id);
    for (const order of restaurantOrders) {
      if (order.status !== 'delivered' && order.status !== 'cancelled') {
        await storage.updateOrder(order.id, { status: 'cancelled' });
      }
    }
    
    const success = await storage.deleteRestaurant(id);
    
    if (!success) {
      return res.status(404).json({ error: "المطعم غير موجود" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("خطأ في حذف المطعم:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إدارة عناصر القائمة
router.get("/restaurants/:restaurantId/menu", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const menuItems = await storage.getMenuItems(restaurantId);
    
    // ترتيب العناصر حسب الاسم
    const sortedItems = menuItems.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json(sortedItems);
  } catch (error) {
    console.error("خطأ في جلب عناصر القائمة:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/menu-items", async (req, res) => {
  try {
    // التحقق من صحة البيانات
    const validatedData = insertMenuItemSchema.parse({
      ...req.body,
      // إضافة صورة افتراضية إذا لم تكن موجودة
      image: req.body.image || "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg"
    });
    
    const newMenuItem = await storage.createMenuItem(validatedData);
    res.status(201).json(newMenuItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "بيانات عنصر القائمة غير صحيحة", 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }
    console.error("خطأ في إضافة عنصر القائمة:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.put("/menu-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // التحقق من صحة البيانات المحدثة (جزئي)
    const validatedData = insertMenuItemSchema.partial().parse(req.body);
    
    const updatedMenuItem = await storage.updateMenuItem(id, validatedData);
    
    if (!updatedMenuItem) {
      return res.status(404).json({ error: "عنصر القائمة غير موجود" });
    }
    
    res.json(updatedMenuItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "بيانات تحديث عنصر القائمة غير صحيحة", 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }
    console.error("خطأ في تحديث عنصر القائمة:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.delete("/menu-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await storage.deleteMenuItem(id);
    
    if (!success) {
      return res.status(404).json({ error: "عنصر القائمة غير موجود" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("خطأ في حذف عنصر القائمة:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إدارة الطلبات
router.get("/orders", async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    let allOrders = await storage.getOrders();
    
    // تطبيق مرشحات البحث
    if (status && status !== 'all') {
      allOrders = allOrders.filter(order => order.status === status);
    }
    
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      allOrders = allOrders.filter(order => 
        order.orderNumber?.toLowerCase().includes(searchTerm) ||
        order.customerName?.toLowerCase().includes(searchTerm) ||
        order.customerPhone?.toLowerCase().includes(searchTerm)
      );
    }

    // ترتيب حسب تاريخ الإنشاء (الأحدث أولاً)
    const sortedOrders = allOrders.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    // تطبيق التصفح (pagination)
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedOrders = sortedOrders.slice(startIndex, endIndex);

    res.json({
      orders: paginatedOrders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: sortedOrders.length,
        pages: Math.ceil(sortedOrders.length / Number(limit))
      }
    });
  } catch (error) {
    console.error("خطأ في جلب الطلبات:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.put("/orders/:id/status", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { status, driverId } = req.body;
    
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (driverId) {
      updateData.driverId = driverId;
    }
    
    const updatedOrder = await storage.updateOrder(id, updateData);
    
    if (!updatedOrder) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }
    
    // Note: تتبع الطلبات (order tracking) ليس منفذاً في MemStorage بعد
    // يمكن إضافته لاحقاً إذا لزم الأمر
    
    res.json(updatedOrder);
  } catch (error) {
    console.error("خطأ في تحديث حالة الطلب:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إدارة السائقين
router.get("/drivers", async (req, res) => {
  try {
    const drivers = await dbStorage.getDrivers();
    
    // ترتيب السائقين حسب تاريخ الإنشاء (الأحدث أولاً)
    const sortedDrivers = drivers.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    res.json(sortedDrivers);
  } catch (error) {
    console.error("خطأ في جلب السائقين:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/drivers", async (req, res) => {
  try {
    console.log("Driver creation request data:", req.body);
    
    // التحقق من البيانات المطلوبة
    if (!req.body.name || !req.body.phone || !req.body.password) {
      return res.status(400).json({ 
        error: "البيانات المطلوبة ناقصة", 
        details: "الاسم ورقم الهاتف وكلمة المرور مطلوبة"
      });
    }
    
    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    
    // التحقق من صحة البيانات مع الحقول المطلوبة
    const driverData = {
      ...req.body,
      password: hashedPassword,
      // التأكد من وجود الحقول الافتراضية
      isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : true,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      earnings: req.body.earnings || "0",
      userType: "driver",
      currentLocation: req.body.currentLocation || null
    };
    
    console.log("Processed driver data:", driverData);
    
    const validatedData = insertDriverSchema.parse(driverData);
    
    const newDriver = await dbStorage.createDriver(validatedData);
    res.status(201).json(newDriver);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Driver validation errors:", error.errors);
      return res.status(400).json({ 
        error: "بيانات السائق غير صحيحة", 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }
    console.error("خطأ في إضافة السائق:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.put("/drivers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // تشفير كلمة المرور الجديدة إذا تم توفيرها
    const updateData = { ...req.body };
    if (updateData.password && updateData.password.trim()) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
      // إزالة كلمة المرور من البيانات إذا كانت فارغة
      delete updateData.password;
    }
    
    // التحقق من صحة البيانات المحدثة (جزئي)
    const validatedData = insertDriverSchema.partial().parse(updateData);
    
    const updatedDriver = await dbStorage.updateDriver(id, validatedData);
    
    if (!updatedDriver) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }
    
    res.json(updatedDriver);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "بيانات تحديث السائق غير صحيحة", 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }
    console.error("خطأ في تحديث السائق:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.delete("/drivers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await dbStorage.deleteDriver(id);
    
    if (!success) {
      return res.status(404).json({ error: "السائق غير موجود" });
    }
    
    res.json({ success: true, message: "تم حذف السائق بنجاح" });
  } catch (error) {
    console.error("خطأ في حذف السائق:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إحصائيات السائق
router.get("/drivers/:id/stats", async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    // جلب جميع الطلبات الخاصة بالسائق
    const allOrders = await storage.getOrders();
    let driverOrders = allOrders.filter(order => order.driverId === id);
    
    // تطبيق مرشح التاريخ إذا تم تحديده
    if (startDate) {
      const start = new Date(startDate as string);
      driverOrders = driverOrders.filter(order => order.createdAt >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      driverOrders = driverOrders.filter(order => order.createdAt <= end);
    }
    
    // حساب الإحصائيات
    const totalOrders = driverOrders.length;
    const completedOrders = driverOrders.filter(order => order.status === 'delivered').length;
    const cancelledOrders = driverOrders.filter(order => order.status === 'cancelled').length;
    
    // حساب إجمالي الأرباح (من حقل driverEarnings إذا وجد)
    const totalEarnings = driverOrders.reduce((sum, order) => {
      // افتراض أن driverEarnings موجود في Order أو حسابه من إجمالي الطلب
      const earnings = parseFloat((order as any).driverEarnings || "0");
      return sum + earnings;
    }, 0);
    
    const stats = {
      totalOrders,
      totalEarnings,
      completedOrders,
      cancelledOrders
    };
    
    res.json(stats);
  } catch (error) {
    console.error("خطأ في إحصائيات السائق:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إدارة العروض الخاصة
router.get("/special-offers", async (req, res) => {
  try {
    const offers = await storage.getSpecialOffers();
    
    // ترتيب العروض حسب تاريخ الإنشاء (الأحدث أولاً)
    const sortedOffers = offers.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    res.json(sortedOffers);
  } catch (error) {
    console.error("خطأ في جلب العروض الخاصة:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.post("/special-offers", async (req, res) => {
  try {
    console.log("Special offer creation request data:", req.body);
    
    // تنظيف وتحويل البيانات باستخدام helper function
    const coercedData = coerceRequestData(req.body);
    
    // تقديم قيم افتراضية للحقول المطلوبة
    const offerData = {
      // الحقول المطلوبة
      title: coercedData.title || "عرض خاص جديد",
      description: coercedData.description || "وصف العرض الخاص",
      image: coercedData.image || "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
      
      // تفاصيل الخصم (الآن مع تحويل صحيح للأنواع)
      discountPercent: coercedData.discountPercent,
      discountAmount: coercedData.discountAmount,
      minimumOrder: coercedData.minimumOrder || "0",
      
      // صلاحية العرض (الآن مع معالجة صحيحة للتاريخ)
      validUntil: coercedData.validUntil,
      
      // حالة العرض (الآن مع تحويل صحيح للبوليان)
      isActive: coercedData.isActive !== undefined ? coercedData.isActive : true,
      
      // حقول التوقيت
      createdAt: new Date()
    };
    
    console.log("Processed special offer data:", offerData);
    
    const validatedData = insertSpecialOfferSchema.parse(offerData);
    
    const newOffer = await storage.createSpecialOffer(validatedData);
    res.status(201).json(newOffer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Special offer validation errors:", error.errors);
      return res.status(400).json({ 
        error: "بيانات العرض الخاص غير صحيحة", 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }
    console.error("خطأ في إضافة العرض الخاص:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.put("/special-offers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // تطبيق coercion على البيانات المحدثة أيضاً
    const coercedData = coerceRequestData(req.body);
    
    // التحقق من صحة البيانات المحدثة (جزئي)
    const validatedData = insertSpecialOfferSchema.partial().parse(coercedData);
    
    const updatedOffer = await storage.updateSpecialOffer(id, validatedData);
    
    if (!updatedOffer) {
      return res.status(404).json({ error: "العرض الخاص غير موجود" });
    }
    
    res.json(updatedOffer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "بيانات تحديث العرض الخاص غير صحيحة", 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }
    console.error("خطأ في تحديث العرض الخاص:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.delete("/special-offers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await storage.deleteSpecialOffer(id);
    
    if (!success) {
      return res.status(404).json({ error: "العرض الخاص غير موجود" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("خطأ في حذف العرض الخاص:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إدارة الإشعارات
router.post("/notifications", async (req: any, res) => {
  try {
    const notificationData = {
      ...req.body,
      createdBy: req.admin.id
    };
    
    const [newNotification] = await db.insert(schema.notifications)
      .values(notificationData)
      .returning();
    
    res.json(newNotification);
  } catch (error) {
    console.error("خطأ في إنشاء الإشعار:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إعدادات النظام
router.get("/settings", async (req, res) => {
  try {
    const settings = await db.select()
      .from(schema.systemSettings)
      .orderBy(schema.systemSettings.category, schema.systemSettings.key);
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.put("/settings/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    const [updatedSetting] = await db.update(schema.systemSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(schema.systemSettings.key, key))
      .returning();
    
    res.json(updatedSetting);
  } catch (error) {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إعدادات واجهة المستخدم (متاحة للعامة)
router.get("/ui-settings", async (req, res) => {
  try {
    // TEMPORARY FIX: Return sample UI settings
    console.log('TEMPORARY FIX: Returning sample UI settings from admin.ts');
    const settings = [
      { id: '1', key: 'app_name', value: 'تطبيق السريع ون', category: 'general', isActive: true },
      { id: '2', key: 'delivery_fee', value: '5.00', category: 'pricing', isActive: true },
      { id: '3', key: 'minimum_order', value: '20.00', category: 'pricing', isActive: true }
    ];
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث أوقات العمل
router.put("/business-hours", async (req, res) => {
  try {
    const { opening_time, closing_time, store_status } = req.body;
    
    const updates = [];
    
    if (opening_time) {
      updates.push(
        db.update(schema.systemSettings)
          .set({ value: opening_time, updatedAt: new Date() })
          .where(eq(schema.systemSettings.key, 'opening_time'))
      );
    }
    
    if (closing_time) {
      updates.push(
        db.update(schema.systemSettings)
          .set({ value: closing_time, updatedAt: new Date() })
          .where(eq(schema.systemSettings.key, 'closing_time'))
      );
    }
    
    if (store_status) {
      updates.push(
        db.update(schema.systemSettings)
          .set({ value: store_status, updatedAt: new Date() })
          .where(eq(schema.systemSettings.key, 'store_status'))
      );
    }
    
    await Promise.all(updates);
    
    res.json({ success: true, message: "تم تحديث أوقات العمل بنجاح" });
  } catch (error) {
    console.error("خطأ في تحديث أوقات العمل:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إدارة المستخدمين الموحدة (عملاء، سائقين، مديرين)
router.get("/users", async (req, res) => {
  try {
    // جلب العملاء
    const customers = await db.select({
      id: schema.customers.id,
      name: schema.customers.name,
      email: schema.customers.email,
      phone: schema.customers.phone,
      role: sql<string>`'customer'`,
      isActive: schema.customers.isActive,
      createdAt: schema.customers.createdAt,
      address: sql<string>`NULL`
    }).from(schema.customers);

    // جلب السائقين والمديرين من adminUsers
    const adminUsers = await db.select({
      id: schema.adminUsers.id,
      name: schema.adminUsers.name,
      email: schema.adminUsers.email,
      phone: schema.adminUsers.phone,
      role: schema.adminUsers.userType,
      isActive: schema.adminUsers.isActive,
      createdAt: schema.adminUsers.createdAt,
      address: sql<string>`NULL`
    }).from(schema.adminUsers);

    // دمج جميع المستخدمين وترتيبهم حسب تاريخ الإنشاء
    const allUsers = [...customers, ...adminUsers]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(allUsers);
  } catch (error) {
    console.error("خطأ في جلب المستخدمين:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, isActive } = req.body;
    
    // تحديد الجدول بناءً على الدور الجديد أو الحالي
    let targetTable = 'customers';
    let currentUser = null;
    
    // البحث عن المستخدم في جدول العملاء أولاً
    const customerResult = await db.select()
      .from(schema.customers)
      .where(eq(schema.customers.id, id))
      .limit(1);
    
    if (customerResult.length > 0) {
      currentUser = customerResult[0];
      targetTable = 'customers';
    } else {
      // البحث في جدول المديرين والسائقين
      const adminResult = await db.select()
        .from(schema.adminUsers)
        .where(eq(schema.adminUsers.id, id))
        .limit(1);
      
      if (adminResult.length > 0) {
        currentUser = adminResult[0];
        targetTable = 'adminUsers';
      }
    }

    if (!currentUser) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }

    // إعداد البيانات للتحديث
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // تم حذف منطق كلمة المرور

    let updatedUser;
    
    // التعامل مع تغيير الدور (من عميل إلى سائق/مدير أو العكس)
    if (role && role !== (currentUser as any).userType && role !== 'customer') {
      // إذا كان المستخدم عميل ونريد جعله سائق/مدير
      if (targetTable === 'customers' && (role === 'driver' || role === 'admin')) {
        // إنشاء مستخدم جديد في جدول adminUsers
        const [newAdminUser] = await db.insert(schema.adminUsers).values({
          name: name || currentUser.name,
          email: email || currentUser.email,
          phone: phone || currentUser.phone,
          userType: role,
          isActive: isActive !== undefined ? isActive : currentUser.isActive
        }).returning();
        
        // حذف المستخدم من جدول العملاء
        await db.delete(schema.customers).where(eq(schema.customers.id, id));
        
        updatedUser = { ...newAdminUser, role: newAdminUser.userType };
      }
      // إذا كان سائق/مدير ونريد جعله عميل
      else if (targetTable === 'adminUsers' && role === 'customer') {
        // إنشاء عميل جديد
        const [newCustomer] = await db.insert(schema.customers).values({
          name: name || currentUser.name,
          username: (email || currentUser.email).split('@')[0], // استخدام الجزء الأول من البريد كـ username
          email: email || currentUser.email,
          phone: phone || currentUser.phone,
          isActive: isActive !== undefined ? isActive : currentUser.isActive
        }).returning();
        
        // حذف من جدول adminUsers
        await db.delete(schema.adminUsers).where(eq(schema.adminUsers.id, id));
        
        updatedUser = { ...newCustomer, role: 'customer' };
      }
      // تغيير من سائق إلى مدير أو العكس
      else if (targetTable === 'adminUsers') {
        updateData.userType = role;
        
        const [result] = await db.update(schema.adminUsers)
          .set(updateData)
          .where(eq(schema.adminUsers.id, id))
          .returning();
          
        updatedUser = { ...result, role: result.userType };
      }
    } else {
      // تحديث عادي بدون تغيير الدور
      if (targetTable === 'customers') {
        // إزالة userType من updateData للعملاء
        delete updateData.userType;
        
        const [result] = await db.update(schema.customers)
          .set(updateData)
          .where(eq(schema.customers.id, id))
          .returning();
          
        updatedUser = { ...result, role: 'customer' };
      } else {
        // تحديث السائق/المدير
        if (role && (role === 'driver' || role === 'admin')) {
          updateData.userType = role;
        }
        
        const [result] = await db.update(schema.adminUsers)
          .set(updateData)
          .where(eq(schema.adminUsers.id, id))
          .returning();
          
        updatedUser = { ...result, role: result.userType };
      }
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("خطأ في تحديث المستخدم:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // البحث عن المستخدم في جدول العملاء
    const customerResult = await db.select()
      .from(schema.customers)
      .where(eq(schema.customers.id, id))
      .limit(1);
    
    if (customerResult.length > 0) {
      // حذف العميل
      await db.delete(schema.customers).where(eq(schema.customers.id, id));
      res.json({ success: true, message: "تم حذف العميل بنجاح" });
      return;
    }
    
    // البحث في جدول المديرين والسائقين
    const adminResult = await db.select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.id, id))
      .limit(1);
    
    if (adminResult.length > 0) {
      const user = adminResult[0];
      
      // منع حذف المدير الرئيسي
      if (user.userType === 'admin' && user.email === 'admin@alsarie-one.com') {
        return res.status(403).json({ error: "لا يمكن حذف المدير الرئيسي" });
      }
      
      // حذف السائق أو المدير
      await db.delete(schema.adminUsers).where(eq(schema.adminUsers.id, id));
      res.json({ success: true, message: `تم حذف ${user.userType === 'driver' ? 'السائق' : 'المدير'} بنجاح` });
      return;
    }
    
    // المستخدم غير موجود
    res.status(404).json({ error: "المستخدم غير موجود" });
  } catch (error) {
    console.error("خطأ في حذف المستخدم:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// إدارة الملف الشخصي للمدير
router.get("/profile", async (req: any, res) => {
  try {
    const admin = req.admin;
    // إرجاع بيانات المدير (بدون كلمة المرور)
    const adminProfile = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      username: admin.username,
      phone: admin.phone,
      userType: admin.userType,
      isActive: admin.isActive,
      createdAt: admin.createdAt
    };
    
    res.json(adminProfile);
  } catch (error) {
    console.error("خطأ في جلب الملف الشخصي:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تحديث الملف الشخصي للمدير
router.put("/profile", async (req: any, res) => {
  try {
    const { name, email, username, phone } = req.body;
    const adminId = req.admin.id;

    if (!name || !email) {
      return res.status(400).json({ error: "الاسم والبريد الإلكتروني مطلوبان" });
    }

    // التحقق من عدم تكرار البريد الإلكتروني
    const existingAdmin = await db.select().from(schema.adminUsers).where(
      and(
        eq(schema.adminUsers.email, email),
        sql`${schema.adminUsers.id} != ${adminId}`
      )
    );

    if (existingAdmin.length > 0) {
      return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
    }

    // تحديث البيانات
    const [updatedAdmin] = await db.update(schema.adminUsers)
      .set({
        name,
        email,
        username: username || null,
        phone: phone || null
      })
      .where(eq(schema.adminUsers.id, adminId))
      .returning();

    if (!updatedAdmin) {
      return res.status(404).json({ error: "المدير غير موجود" });
    }

    // إرجاع البيانات المحدثة (بدون كلمة المرور)
    const adminProfile = {
      id: updatedAdmin.id,
      name: updatedAdmin.name,
      email: updatedAdmin.email,
      username: updatedAdmin.username,
      phone: updatedAdmin.phone,
      userType: updatedAdmin.userType,
      isActive: updatedAdmin.isActive,
      createdAt: updatedAdmin.createdAt
    };

    res.json(adminProfile);
  } catch (error) {
    console.error("خطأ في تحديث الملف الشخصي:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// تم حذف مسار تغيير كلمة المرور - لا حاجة له بعد إزالة نظام المصادقة

// UI Settings Routes
router.get("/ui-settings", async (req, res) => {
  try {
    const settings = await dbStorage.getUiSettings();
    res.json(settings);
  } catch (error) {
    console.error('خطأ في جلب إعدادات الواجهة:', error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

router.put("/ui-settings/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ 
        error: "Missing required fields",
        details: "Key and value are required" 
      });
    }

    // Validate value is string
    if (typeof value !== 'string') {
      return res.status(400).json({ 
        error: "Invalid value type",
        details: "Value must be a string" 
      });
    }

    const setting = await dbStorage.updateUiSetting(key, value);
    
    if (!setting) {
      return res.status(404).json({ error: "فشل في تحديث الإعداد" });
    }

    res.json(setting);
  } catch (error) {
    console.error("خطأ في تحديث إعداد الواجهة:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export { router as adminRoutes };