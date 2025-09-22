import { 
  type Category, type InsertCategory,
  type Restaurant, type InsertRestaurant,
  type MenuItem, type InsertMenuItem,
  type Order, type InsertOrder,
  type Driver, type InsertDriver,
  type SpecialOffer, type InsertSpecialOffer,
  type User, type InsertUser,
  type UserAddress, type InsertUserAddress,
  type UiSettings, type InsertUiSettings,
  type Rating, type InsertRating,
  type Cart, type InsertCart,
  type Favorites, type InsertFavorites,
  type AdminUser, type InsertAdminUser,
  type Notification, type InsertNotification
} from "../shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Restaurants
  getRestaurants(filters?: any): Promise<Restaurant[]>;
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  getRestaurantsByCategory(categoryId: string): Promise<Restaurant[]>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, restaurant: Partial<InsertRestaurant>): Promise<Restaurant | undefined>;
  deleteRestaurant(id: string): Promise<boolean>;

  // Menu Items
  getMenuItems(restaurantId: string): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, menuItem: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<boolean>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByRestaurant(restaurantId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined>;

  // Drivers
  getDrivers(): Promise<Driver[]>;
  getAllDrivers(): Promise<Driver[]>;
  getDriver(id: string): Promise<Driver | undefined>;
  getDriverById(id: string): Promise<Driver | undefined>;
  getAvailableDrivers(): Promise<Driver[]>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: string, driver: Partial<InsertDriver>): Promise<Driver | undefined>;
  deleteDriver(id: string): Promise<boolean>;

  // Special Offers
  getSpecialOffers(): Promise<SpecialOffer[]>;
  getActiveSpecialOffers(): Promise<SpecialOffer[]>;
  createSpecialOffer(offer: InsertSpecialOffer): Promise<SpecialOffer>;
  updateSpecialOffer(id: string, offer: Partial<InsertSpecialOffer>): Promise<SpecialOffer | undefined>;
  deleteSpecialOffer(id: string): Promise<boolean>;

  // UI Settings
  getUiSettings(): Promise<UiSettings[]>;
  getUiSetting(key: string): Promise<UiSettings | undefined>;
  updateUiSetting(key: string, value: string): Promise<UiSettings | undefined>;
  createUiSetting(setting: InsertUiSettings): Promise<UiSettings>;
  deleteUiSetting(key: string): Promise<boolean>;

  // User Addresses
  getUserAddresses(userId: string): Promise<UserAddress[]>;
  createUserAddress(userId: string, address: InsertUserAddress): Promise<UserAddress>;
  updateUserAddress(addressId: string, userId: string, address: Partial<InsertUserAddress>): Promise<UserAddress | undefined>;
  deleteUserAddress(addressId: string, userId: string): Promise<boolean>;

  // Ratings
  getRatings(orderId?: string, restaurantId?: string): Promise<Rating[]>;
  createRating(rating: InsertRating): Promise<Rating>;
  updateRating(id: string, rating: Partial<InsertRating>): Promise<Rating | undefined>;

  // Cart methods
  getCartItems(userId: string): Promise<Cart[]>;
  addToCart(cart: InsertCart): Promise<Cart>;
  updateCartItem(cartId: string, quantity: number): Promise<Cart | undefined>;
  removeFromCart(id: string): Promise<boolean>;
  clearCart(userId: string): Promise<boolean>;

  // Favorites methods
  getFavoriteRestaurants(userId: string): Promise<Restaurant[]>;
  addToFavorites(favorite: InsertFavorites): Promise<Favorites>;
  removeFromFavorites(userId: string, restaurantId: string): Promise<boolean>;
  isRestaurantFavorite(userId: string, restaurantId: string): Promise<boolean>;

  // Admin methods - بدون مصادقة
  createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser>;
  getAllAdminUsers(): Promise<AdminUser[]>;
  getAdminByEmail(emailOrUsername: string): Promise<AdminUser | undefined>;
  getAdminByPhone(phone: string): Promise<AdminUser | undefined>;
  getAdminById(id: string): Promise<AdminUser | undefined>;

  // Notification methods
  getNotifications(recipientId?: string, type?: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;

  // Order tracking methods
  createOrderTracking(tracking: {orderId: string; status: string; message: string; createdBy: string; createdByType: string}): Promise<{id: string; orderId: string; status: string; message: string; createdBy: string; createdByType: string; createdAt: Date}>;
  getOrderTracking(orderId: string): Promise<{id: string; orderId: string; status: string; message: string; createdBy: string; createdByType: string; createdAt: Date}[]>;

  // Search methods
  searchRestaurants(query: string, category?: string): Promise<Restaurant[]>;
  searchCategories(query: string): Promise<Category[]>;
  searchMenuItems(query: string): Promise<MenuItem[]>;
  searchMenuItemsAdvanced(query: string, filters?: any): Promise<MenuItem[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private categories: Map<string, Category>;
  private restaurants: Map<string, Restaurant>;
  private menuItems: Map<string, MenuItem>;
  private orders: Map<string, Order>;
  private drivers: Map<string, Driver>;
  private specialOffers: Map<string, SpecialOffer>;
  private uiSettings: Map<string, UiSettings>;
  private userAddresses: Map<string, UserAddress>;
  private ratings: Map<string, Rating>;
  private cartItems: Map<string, Cart>;
  private favorites: Map<string, Favorites>;
  private adminUsers: Map<string, AdminUser>;
  // تم حذف adminSessions - لا حاجة لها بعد إزالة نظام المصادقة
  private notifications: Map<string, Notification>;
  private orderTracking: Map<string, {id: string; orderId: string; status: string; message: string; createdBy: string; createdByType: string; createdAt: Date}>;

  // Add db property for compatibility with routes that access it directly
  get db() {
    throw new Error('Direct database access not available in MemStorage. Use storage interface methods instead.');
  }

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.restaurants = new Map();
    this.menuItems = new Map();
    this.orders = new Map();
    this.drivers = new Map();
    this.specialOffers = new Map();
    this.uiSettings = new Map();
    this.userAddresses = new Map();
    this.ratings = new Map();
    this.cartItems = new Map();
    this.favorites = new Map();
    this.adminUsers = new Map();
    // تم حذف adminSessions من المنشئ
    this.notifications = new Map();
    this.orderTracking = new Map();
    
    this.initializeData();
  }

  private initializeData() {
    // Initialize categories
    const categories = [
      { id: "1", name: "مطاعم", icon: "fas fa-utensils", isActive: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
      { id: "2", name: "مقاهي", icon: "fas fa-coffee", isActive: true, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: "3", name: "حلويات", icon: "fas fa-candy-cane", isActive: true, sortOrder: 2, createdAt: new Date(), updatedAt: new Date() },
      { id: "4", name: "سوبرماركت", icon: "fas fa-shopping-cart", isActive: true, sortOrder: 3, createdAt: new Date(), updatedAt: new Date() },
      { id: "5", name: "صيدليات", icon: "fas fa-pills", isActive: true, sortOrder: 4, createdAt: new Date(), updatedAt: new Date() },
    ];

    categories.forEach(cat => this.categories.set(cat.id, cat));

    // Initialize restaurants
 const restaurants = [
      {
        id: "1",
        name: "مطعم الوزيكو للعربكة",
        description: "مطعم يمني تقليدي متخصص في الأطباق الشعبية",
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        rating: "4.8",
        reviewCount: 4891,
        deliveryTime: "40-60 دقيقة",
        isOpen: true,
        minimumOrder: "25",
        deliveryFee: "5",
        categoryId: "1",
        openingTime: "08:00",
        closingTime: "23:00",
        workingDays: "0,1,2,3,4,5,6",
        isTemporarilyClosed: false,
        temporaryCloseReason: null,
        latitude: null,
        longitude: null,
        address: "صنعاء، اليمن",
        isFeatured: true,
        isNew: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        name: "حلويات الشام",
        description: "أفضل الحلويات الشامية والعربية",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        rating: "4.6",
        reviewCount: 2341,
        deliveryTime: "30-45 دقيقة",
        isOpen: true,
        minimumOrder: "15",
        deliveryFee: "3",
        categoryId: "3",
        openingTime: "08:00",
        closingTime: "23:00",
        workingDays: "0,1,2,3,4,5,6",
        isTemporarilyClosed: false,
        temporaryCloseReason: null,
        latitude: null,
        longitude: null,
        address: "صنعاء، اليمن",
        isFeatured: false,
        isNew: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "3",
        name: "مقهى العروبة",
        description: "مقهى شعبي بالطابع العربي الأصيل",
        image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        rating: "4.5",
        reviewCount: 1876,
        deliveryTime: "يفتح في 8:00 ص",
        isOpen: true,
        minimumOrder: "20",
        deliveryFee: "4",
        categoryId: "2",
        openingTime: "08:00",
        closingTime: "23:00",
        workingDays: "0,1,2,3,4,5,6",
        isTemporarilyClosed: false,
        temporaryCloseReason: null,
        latitude: null,
        longitude: null,
        address: "صنعاء، اليمن",
        isFeatured: false,
        isNew: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    restaurants.forEach(restaurant => this.restaurants.set(restaurant.id, restaurant));

    // Initialize menu items
   const menuItems = [
      {
        id: "1",
        name: "عربكة بالقشطة والعسل",
        description: "حلوى يمنية تقليدية بالقشطة الطازجة والعسل الطبيعي",
        price: "55", // تغيير إلى string
        image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "وجبات رمضان",
        isAvailable: true,
        isSpecialOffer: false,
        originalPrice: null,
        restaurantId: "1",
      },
      {
        id: "2",
        name: "معصوب بالقشطة والعسل",
        description: "طبق يمني شعبي بالموز والقشطة والعسل",
        price: "55", // تغيير إلى string
        image: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "وجبات رمضان",
        isAvailable: true,
        isSpecialOffer: false,
        originalPrice: null,
        restaurantId: "1",
      },
      {
        id: "3",
        name: "مياه معدنية 750 مل",
        description: "مياه طبيعية معدنية عالية الجودة",
        price: "3", // تغيير إلى string
        image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "المشروبات",
        isAvailable: true,
        isSpecialOffer: false,
        originalPrice: null,
        restaurantId: "1",
      },
      {
        id: "4",
        name: "كومبو عربكة خاص",
        description: "عربكة + مطبق عادي + مشروب غازي",
        price: "55", // تغيير إلى string
        originalPrice: "60", // تغيير إلى string
        image: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        category: "العروض",
        isAvailable: true,
        isSpecialOffer: true,
        restaurantId: "1",
      }
    ];

    menuItems.forEach(item => this.menuItems.set(item.id, item));

    // Initialize drivers
    const drivers = [
      {
        id: "1",
        name: "أحمد محمد",
        username: "ahmed_driver",
        email: "ahmed@drivers.com",
        phone: "+967771234567",
        password: "123456", // كلمة مرور افتراضية للاختبار
        userType: "driver",
        isAvailable: true,
        isActive: true,
        currentLocation: "صنعاء",
        earnings: "2500",
        createdAt: new Date(),
      },
      {
        id: "2", 
        name: "علي حسن",
        username: "ali_driver",
        email: "ali@drivers.com",
        phone: "+967779876543",
        password: "123456", // كلمة مرور افتراضية للاختبار
        userType: "driver",
        isAvailable: true,
        isActive: true,
        currentLocation: "تعز",
        earnings: "3200",
        createdAt: new Date(),
      }
    ];
    drivers.forEach(driver => this.drivers.set(driver.id, driver));

    // Initialize UI Settings
    const uiSettingsData = [
      { key: "show_categories", value: "true", description: "عرض تصنيفات المطاعم" },
      { key: "show_search_bar", value: "true", description: "عرض شريط البحث" },
      { key: "show_special_offers", value: "true", description: "عرض العروض الخاصة" },
      { key: "show_navigation_home", value: "true", description: "عرض قائمة الرئيسية" },
      { key: "show_navigation_search", value: "true", description: "عرض قائمة البحث" },
      { key: "show_navigation_orders", value: "true", description: "عرض قائمة الطلبات" },
      { key: "show_navigation_profile", value: "true", description: "عرض قائمة الملف الشخصي" },
      { key: "enable_dark_mode", value: "false", description: "تفعيل الوضع المظلم" },
      { key: "enable_notifications", value: "true", description: "تفعيل الإشعارات" },
      { key: "enable_location_services", value: "true", description: "تفعيل خدمات الموقع" },
      { key: "enable_voice_search", value: "false", description: "تفعيل البحث الصوتي" },
      { key: "enable_quick_order", value: "true", description: "تفعيل الطلب السريع" },
      { key: "opening_time", value: "08:00", description: "وقت فتح المتجر" },
      { key: "closing_time", value: "23:00", description: "وقت إغلاق المتجر" },
      { key: "store_status", value: "مفتوح", description: "حالة المتجر الحالية" }
    ];

    uiSettingsData.forEach(setting => {
      const uiSetting: UiSettings = {
        id: randomUUID(),
        key: setting.key,
        value: setting.value,
        category: "ui",
        description: setting.description,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.uiSettings.set(setting.key, uiSetting);
    });

    // Initialize admin users
    const adminUsers = [
      {
        id: randomUUID(),
        name: "مدير النظام",
        username: "admin",
        email: "admin@example.com",
        phone: "+967771234567",
        password: "$2b$10$oBgkj60B2v86gRLbhsEtw.CwHkfpW2cKRFx8BADK6z6n42r5fBJNG", // 'secret'
        userType: "admin",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "أحمد السائق",
        username: "driver01",
        email: "driver@example.com",
        phone: "+967771234568",
        password: "$2b$10$oBgkj60B2v86gRLbhsEtw.CwHkfpW2cKRFx8BADK6z6n42r5fBJNG", // 'secret'
        userType: "driver",
        isActive: true,
        createdAt: new Date(),
      }
    ];

    adminUsers.forEach(admin => this.adminUsers.set(admin.id, admin));
  }

  // Users
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      name: insertUser.username,
      phone: null,
      email: null,
      address: null,
      isActive: true,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...userData };
    this.users.set(id, updated);
    return updated;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const newCategory: Category = { 
      ...category, 
      id,
      sortOrder: category.sortOrder ?? null,
      isActive: category.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const existing = this.categories.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...category };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Restaurants
  async getRestaurants(filters?: any): Promise<Restaurant[]> {
    let restaurants = Array.from(this.restaurants.values());
    
    if (filters) {
      if (filters.categoryId) {
        restaurants = restaurants.filter(r => r.categoryId === filters.categoryId);
      }
      if (filters.isOpen !== undefined) {
        restaurants = restaurants.filter(r => r.isOpen === filters.isOpen);
      }
      if (filters.isFeatured) {
        restaurants = restaurants.filter(r => r.isFeatured);
      }
      if (filters.isNew) {
        restaurants = restaurants.filter(r => r.isNew);
      }
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        restaurants = restaurants.filter(r => 
          r.name.toLowerCase().includes(searchTerm) || 
          r.description?.toLowerCase().includes(searchTerm)
        );
      }
    }
    
    return restaurants;
  }

  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    return this.restaurants.get(id);
  }

  async getRestaurantsByCategory(categoryId: string): Promise<Restaurant[]> {
    return Array.from(this.restaurants.values()).filter(r => r.categoryId === categoryId);
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
  const id = randomUUID();
  const newRestaurant: Restaurant = { 
    ...restaurant, 
    id, 
    createdAt: new Date(),
    updatedAt: new Date(),
    description: restaurant.description ?? null,
    rating: restaurant.rating ?? "0.0",
    reviewCount: restaurant.reviewCount ?? 0,
    isOpen: restaurant.isOpen ?? true,
    minimumOrder: restaurant.minimumOrder?.toString() ?? "0",
    deliveryFee: restaurant.deliveryFee?.toString() ?? "0",
    categoryId: restaurant.categoryId ?? null,
    // معالجة الخصائص الجديدة لضمان عدم وجود undefined
    openingTime: restaurant.openingTime ?? "08:00",
    closingTime: restaurant.closingTime ?? "23:00",
    workingDays: restaurant.workingDays ?? "0,1,2,3,4,5,6",
    isTemporarilyClosed: restaurant.isTemporarilyClosed ?? false,
    temporaryCloseReason: restaurant.temporaryCloseReason ?? null,
    latitude: restaurant.latitude ?? null,
    longitude: restaurant.longitude ?? null,
    address: restaurant.address ?? null,
    isFeatured: restaurant.isFeatured ?? false,
    isNew: restaurant.isNew ?? false,
    isActive: restaurant.isActive ?? true
  };
  this.restaurants.set(id, newRestaurant);
  return newRestaurant;
}
async updateRestaurant(id: string, restaurant: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
  const existing = this.restaurants.get(id);
  if (!existing) return undefined;
  
  // معالجة الخصائص لتجنب undefined
  const updates: Partial<Restaurant> = {};
  
  if (restaurant.openingTime !== undefined) updates.openingTime = restaurant.openingTime ?? null;
  if (restaurant.closingTime !== undefined) updates.closingTime = restaurant.closingTime ?? null;
  if (restaurant.workingDays !== undefined) updates.workingDays = restaurant.workingDays ?? null;
  if (restaurant.isTemporarilyClosed !== undefined) updates.isTemporarilyClosed = restaurant.isTemporarilyClosed;
  if (restaurant.temporaryCloseReason !== undefined) updates.temporaryCloseReason = restaurant.temporaryCloseReason ?? null;
  
  // الخصائص الأخرى
  if (restaurant.name !== undefined) updates.name = restaurant.name;
  if (restaurant.description !== undefined) updates.description = restaurant.description ?? null;
  if (restaurant.image !== undefined) updates.image = restaurant.image;
  if (restaurant.rating !== undefined) updates.rating = restaurant.rating ?? "0.0";
  if (restaurant.reviewCount !== undefined) updates.reviewCount = restaurant.reviewCount ?? 0;
  if (restaurant.deliveryTime !== undefined) updates.deliveryTime = restaurant.deliveryTime;
  if (restaurant.isOpen !== undefined) updates.isOpen = restaurant.isOpen ?? true;
  if (restaurant.minimumOrder !== undefined) updates.minimumOrder = restaurant.minimumOrder?.toString() ?? "0";
  if (restaurant.deliveryFee !== undefined) updates.deliveryFee = restaurant.deliveryFee?.toString() ?? "0";
  if (restaurant.categoryId !== undefined) updates.categoryId = restaurant.categoryId ?? null;
  
  const updated = { ...existing, ...updates };
  this.restaurants.set(id, updated);
  return updated;
}

  async deleteRestaurant(id: string): Promise<boolean> {
    return this.restaurants.delete(id);
  }

  // Menu Items
  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values()).filter(item => item.restaurantId === restaurantId);
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const id = randomUUID();
    const newMenuItem: MenuItem = { 
      ...menuItem, 
      id,
      description: menuItem.description ?? null,
      isAvailable: menuItem.isAvailable ?? true,
      isSpecialOffer: menuItem.isSpecialOffer ?? false,
      originalPrice: menuItem.originalPrice ?? null,
      restaurantId: menuItem.restaurantId ?? null
    };
    this.menuItems.set(id, newMenuItem);
    return newMenuItem;
  }

  async updateMenuItem(id: string, menuItem: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const existing = this.menuItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...menuItem };
    this.menuItems.set(id, updated);
    return updated;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    return this.menuItems.delete(id);
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByRestaurant(restaurantId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.restaurantId === restaurantId);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const newOrder: Order = { 
      ...order, 
      id, 
      createdAt: new Date(),
      updatedAt: new Date(),
      customerEmail: order.customerEmail ?? null,
      customerId: order.customerId ?? null,
      notes: order.notes ?? null,
      status: order.status ?? "pending",
      estimatedTime: order.estimatedTime ?? "30-45 دقيقة",
      driverEarnings: order.driverEarnings?.toString() ?? "0",
      restaurantId: order.restaurantId ?? null,
      driverId: order.driverId ?? null
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const existing = this.orders.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...order };
    this.orders.set(id, updated);
    return updated;
  }

  // Drivers
  async getDrivers(): Promise<Driver[]> {
    return Array.from(this.drivers.values());
  }

  async getAllDrivers(): Promise<Driver[]> {
    return Array.from(this.drivers.values());
  }

  async getDriver(id: string): Promise<Driver | undefined> {
    return this.drivers.get(id);
  }

  async getDriverById(id: string): Promise<Driver | undefined> {
    return this.drivers.get(id);
  }

  async getAvailableDrivers(): Promise<Driver[]> {
    return Array.from(this.drivers.values()).filter(driver => driver.isAvailable && driver.isActive);
  }

 async createDriver(driver: InsertDriver): Promise<Driver> {
    const id = randomUUID();
    const newDriver: Driver = { 
      ...driver, 
      id, 
      createdAt: new Date(),
      isActive: driver.isActive ?? true,
      isAvailable: driver.isAvailable ?? true,
      currentLocation: driver.currentLocation ?? null,
      earnings: driver.earnings?.toString() ?? "0",
      username: driver.username ?? null,
      email: driver.email ?? null,
      userType: driver.userType ?? "driver",
      password: driver.password // إضافة حقل كلمة المرور
    };
    this.drivers.set(id, newDriver);
    return newDriver;
  }

  async updateDriver(id: string, driver: Partial<InsertDriver>): Promise<Driver | undefined> {
    const existing = this.drivers.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...driver };
    this.drivers.set(id, updated);
    return updated;
  }

  async deleteDriver(id: string): Promise<boolean> {
    return this.drivers.delete(id);
  }

  // Special Offers
  async getSpecialOffers(): Promise<SpecialOffer[]> {
    return Array.from(this.specialOffers.values());
  }

  async getActiveSpecialOffers(): Promise<SpecialOffer[]> {
    return Array.from(this.specialOffers.values()).filter(offer => offer.isActive);
  }


  async createSpecialOffer(offer: InsertSpecialOffer): Promise<SpecialOffer> {
    const id = randomUUID();
    const newOffer: SpecialOffer = { 
      ...offer, 
      id, 
      createdAt: new Date(),
      isActive: offer.isActive ?? true,
      minimumOrder: offer.minimumOrder?.toString() ?? "0", // تحويل إلى string
      discountPercent: offer.discountPercent ?? null,
      discountAmount: offer.discountAmount?.toString() ?? null, // تحويل إلى string
      validUntil: offer.validUntil ?? null
    };
    this.specialOffers.set(id, newOffer);
    return newOffer;
  }

  async updateSpecialOffer(id: string, offer: Partial<InsertSpecialOffer>): Promise<SpecialOffer | undefined> {
    const existing = this.specialOffers.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...offer };
    this.specialOffers.set(id, updated);
    return updated;
  }

  async deleteSpecialOffer(id: string): Promise<boolean> {
    return this.specialOffers.delete(id);
  }

  // UI Settings
  async getUiSettings(): Promise<UiSettings[]> {
    return Array.from(this.uiSettings.values());
  }

  async getUiSetting(key: string): Promise<UiSettings | undefined> {
    return this.uiSettings.get(key);
  }

  async updateUiSetting(key: string, value: string): Promise<UiSettings | undefined> {
    const existing = this.uiSettings.get(key);
    if (existing) {
      const updated = { ...existing, value, updatedAt: new Date() };
      this.uiSettings.set(key, updated);
      return updated;
    }
    // Create new setting if it doesn't exist
    const newSetting: UiSettings = {
      id: randomUUID(),
      key,
      value,
      category: "general",
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.uiSettings.set(key, newSetting);
    return newSetting;
  }

  async createUiSetting(setting: InsertUiSettings): Promise<UiSettings> {
    const id = randomUUID();
    const newSetting: UiSettings = {
      ...setting,
      id,
      category: setting.category ?? "general",
      description: setting.description ?? null,
      isActive: setting.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.uiSettings.set(setting.key, newSetting);
    return newSetting;
  }

  async deleteUiSetting(key: string): Promise<boolean> {
    return this.uiSettings.delete(key);
  }

  // User Addresses
  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    return Array.from(this.userAddresses.values()).filter(address => address.userId === userId);
  }

  async createUserAddress(userId: string, address: InsertUserAddress): Promise<UserAddress> {
    const id = randomUUID();
    
    // If this is being set as default, unset other defaults for this user
    if (address.isDefault) {
      const userAddresses = await this.getUserAddresses(userId);
      userAddresses.forEach(addr => {
        if (addr.isDefault) {
          const updated = { ...addr, isDefault: false };
          this.userAddresses.set(addr.id, updated);
        }
      });
    }

    const newAddress: UserAddress = {
      ...address,
      id,
      userId,
      latitude: address.latitude ?? null,
      longitude: address.longitude ?? null,
      details: address.details ?? null,
      isDefault: address.isDefault ?? false,
      createdAt: new Date()
    };
    this.userAddresses.set(id, newAddress);
    return newAddress;
  }

  async updateUserAddress(addressId: string, userId: string, address: Partial<InsertUserAddress>): Promise<UserAddress | undefined> {
    const existing = this.userAddresses.get(addressId);
    if (!existing || existing.userId !== userId) return undefined;
    
    // If this is being set as default, unset other defaults for this user
    if (address.isDefault) {
      const userAddresses = await this.getUserAddresses(userId);
      userAddresses.forEach(addr => {
        if (addr.isDefault && addr.id !== addressId) {
          const updated = { ...addr, isDefault: false };
          this.userAddresses.set(addr.id, updated);
        }
      });
    }

    const updated = { ...existing, ...address };
    this.userAddresses.set(addressId, updated);
    return updated;
  }

  async deleteUserAddress(addressId: string, userId: string): Promise<boolean> {
    const existing = this.userAddresses.get(addressId);
    if (!existing || existing.userId !== userId) return false;
    return this.userAddresses.delete(addressId);
  }

  // Ratings
  async getRatings(orderId?: string, restaurantId?: string): Promise<Rating[]> {
    let ratings = Array.from(this.ratings.values());
    
    if (orderId) {
      ratings = ratings.filter(rating => rating.orderId === orderId);
    }
    if (restaurantId) {
      ratings = ratings.filter(rating => rating.restaurantId === restaurantId);
    }
    
    return ratings;
  }

  async createRating(rating: InsertRating): Promise<Rating> {
    const id = randomUUID();
    const newRating: Rating = {
      ...rating,
      id,
      orderId: rating.orderId ?? null,
      restaurantId: rating.restaurantId ?? null,
      customerPhone: rating.customerPhone ?? null,
      comment: rating.comment ?? null,
      isApproved: rating.isApproved ?? false,
      createdAt: new Date()
    };
    this.ratings.set(id, newRating);
    return newRating;
  }

  async updateRating(id: string, rating: Partial<InsertRating>): Promise<Rating | undefined> {
    const existing = this.ratings.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...rating };
    this.ratings.set(id, updated);
    return updated;
  }

  // Cart methods
  async getCartItems(userId: string): Promise<Cart[]> {
    return Array.from(this.cartItems.values()).filter(item => item.userId === userId);
  }

  async addToCart(cart: InsertCart): Promise<Cart> {
    const id = randomUUID();
    const newCartItem: Cart = {
      ...cart,
      id,
      quantity: cart.quantity ?? 1,
      specialInstructions: cart.specialInstructions ?? null,
      addedAt: new Date()
    };
    this.cartItems.set(id, newCartItem);
    return newCartItem;
  }

  async updateCartItem(cartId: string, quantity: number): Promise<Cart | undefined> {
    const existing = this.cartItems.get(cartId);
    if (!existing) return undefined;
    const updated = { ...existing, quantity };
    this.cartItems.set(cartId, updated);
    return updated;
  }

  async removeFromCart(id: string): Promise<boolean> {
    return this.cartItems.delete(id);
  }

  async clearCart(userId: string): Promise<boolean> {
    const userCartItems = Array.from(this.cartItems.entries())
      .filter(([_, item]) => item.userId === userId);
    
    userCartItems.forEach(([id, _]) => {
      this.cartItems.delete(id);
    });
    
    return true;
  }

  // Favorites methods
  async getFavoriteRestaurants(userId: string): Promise<Restaurant[]> {
    const userFavorites = Array.from(this.favorites.values()).filter(fav => fav.userId === userId);
    const favoriteRestaurants = userFavorites
      .map(fav => this.restaurants.get(fav.restaurantId))
      .filter((restaurant): restaurant is Restaurant => restaurant !== undefined);
    return favoriteRestaurants;
  }

  async addToFavorites(favorite: InsertFavorites): Promise<Favorites> {
    const id = randomUUID();
    const newFavorite: Favorites = {
      ...favorite,
      id,
      addedAt: new Date()
    };
    this.favorites.set(id, newFavorite);
    return newFavorite;
  }

  async removeFromFavorites(userId: string, restaurantId: string): Promise<boolean> {
    const favorite = Array.from(this.favorites.entries())
      .find(([_, fav]) => fav.userId === userId && fav.restaurantId === restaurantId);
    
    if (favorite) {
      return this.favorites.delete(favorite[0]);
    }
    return false;
  }

  async isRestaurantFavorite(userId: string, restaurantId: string): Promise<boolean> {
    return Array.from(this.favorites.values())
      .some(fav => fav.userId === userId && fav.restaurantId === restaurantId);
  }

  // Admin methods
  async createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser> {
    const id = randomUUID();
    const newAdmin: AdminUser = {
      ...adminUser,
      id,
      createdAt: new Date(),
      username: adminUser.username ?? null,
      phone: adminUser.phone ?? null,
      isActive: adminUser.isActive ?? true,
      userType: adminUser.userType ?? "admin"
    };
    this.adminUsers.set(id, newAdmin);
    return newAdmin;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return Array.from(this.adminUsers.values());
  }

  async getAdminByEmail(emailOrUsername: string): Promise<AdminUser | undefined> {
    return Array.from(this.adminUsers.values())
      .find(admin => admin.email === emailOrUsername || admin.username === emailOrUsername);
  }

  async getAdminByPhone(phone: string): Promise<AdminUser | undefined> {
    return Array.from(this.adminUsers.values())
      .find(admin => admin.phone === phone);
  }

  async getAdminById(id: string): Promise<AdminUser | undefined> {
    return this.adminUsers.get(id);
  }

  // تم حذف جميع طرق إدارة الجلسات - لا حاجة لها بعد إزالة نظام المصادقة

  // Notification methods
  async getNotifications(recipientId?: string, type?: string): Promise<Notification[]> {
    let notifications = Array.from(this.notifications.values());
    
    if (recipientId) {
      notifications = notifications.filter(n => n.recipientId === recipientId);
    }
    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }
    
    return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const newNotification: Notification = {
      ...notification,
      id,
      recipientId: notification.recipientId ?? null,
      orderId: notification.orderId ?? null,
      isRead: notification.isRead ?? false,
      createdAt: new Date()
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  // Search methods
  async searchRestaurants(query: string, category?: string): Promise<Restaurant[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.restaurants.values())
      .filter(restaurant => {
        const matchesName = restaurant.name.toLowerCase().includes(searchTerm);
        const matchesDescription = restaurant.description?.toLowerCase().includes(searchTerm);
        // إزالة cuisine و area مؤقتاً حتى يتم إضافتهما للـ schema
        
        const matchesQuery = matchesName || matchesDescription;
        const matchesCategory = !category || restaurant.categoryId === category;
        
        return matchesQuery && matchesCategory;
      });
  }

  async searchCategories(query: string): Promise<Category[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.categories.values())
      .filter(cat => cat.name.toLowerCase().includes(searchTerm));
  }

  async searchMenuItems(query: string): Promise<MenuItem[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.menuItems.values())
      .filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.description?.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm)
      );
  }

  async searchMenuItemsAdvanced(query: string, filters?: any): Promise<MenuItem[]> {
    const searchTerm = query.toLowerCase();
    let items = Array.from(this.menuItems.values())
      .filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.description?.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm)
      );
    
    if (filters) {
      if (filters.restaurantId) {
        items = items.filter(item => item.restaurantId === filters.restaurantId);
      }
      if (filters.category) {
        items = items.filter(item => item.category === filters.category);
      }
      if (filters.isAvailable !== undefined) {
        items = items.filter(item => item.isAvailable === filters.isAvailable);
      }
    }
    
    return items;
  }

  // Order tracking methods
  async createOrderTracking(tracking: {orderId: string; status: string; message: string; createdBy: string; createdByType: string}) {
    const id = randomUUID();
    const orderTracking = {
      ...tracking,
      id,
      createdAt: new Date()
    };
    this.orderTracking.set(id, orderTracking);
    return orderTracking;
  }

  async getOrderTracking(orderId: string) {
    return Array.from(this.orderTracking.values())
      .filter(tracking => tracking.orderId === orderId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

import { dbStorage } from './db';

// Switch between MemStorage and DatabaseStorage
const USE_MEMORY_STORAGE = false; // Set to false to use database - switched for data persistence

export const storage = USE_MEMORY_STORAGE ? new MemStorage() : dbStorage;