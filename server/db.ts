// @ts-nocheck
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  adminUsers, categories, restaurantSections, restaurants, 
  menuItems, users, customers, userAddresses, orders, specialOffers, 
  notifications, ratings, systemSettingsTable as systemSettings, drivers, orderTracking,
  cart, favorites,
  type AdminUser, type InsertAdminUser,
  type Category, type InsertCategory,
  type Restaurant, type InsertRestaurant,
  type RestaurantSection, type InsertRestaurantSection,
  type MenuItem, type InsertMenuItem,
  type User, type InsertUser,
  type UserAddress, type InsertUserAddress,
  type Order, type InsertOrder,
  type SpecialOffer, type InsertSpecialOffer,
  type Notification, type InsertNotification,
  type Rating, type InsertRating,
  type SystemSettings, type InsertSystemSettings,
  type Driver, type InsertDriver,
  type Cart, type InsertCart,
  type Favorites, type InsertFavorites
} from "@shared/schema";
import { IStorage } from "./storage";
import { eq, and, desc, sql, or, like, asc, inArray } from "drizzle-orm";

// Database connection
let db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!db) {
    // Use DATABASE_URL from environment variables
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error("DATABASE_URL must be defined in environment variables");
    }
    
    console.log("🗺️ Using PostgreSQL database connection...");  // Debug log
    console.log("🔗 DATABASE_URL exists:", !!databaseUrl);
    
    // Use DATABASE_URL for PostgreSQL connection
    const sqlClient = postgres(databaseUrl);
    
    // Pass schema to enable db.query functionality
    const schema = {
      adminUsers,
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
    
    db = drizzle(sqlClient, { schema });
  }
  return db;
}

// ... rest of the DatabaseStorage class remains the same

export class DatabaseStorage {
  get db() {
    return getDb();
  }

  // Admin Authentication
  async createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser> {
    const [newAdmin] = await this.db.insert(adminUsers).values(adminUser).returning();
    return newAdmin;
  }

  async getAdminByEmail(emailOrUsername: string): Promise<AdminUser | undefined> {
    const result = await this.db.select().from(adminUsers).where(
      or(
        eq(adminUsers.email, emailOrUsername),
        eq(adminUsers.username, emailOrUsername)
      )
    );
    return result[0];
  }

  async getAdminByPhone(phone: string): Promise<AdminUser | undefined> {
    const result = await this.db.select().from(adminUsers).where(
      eq(adminUsers.phone, phone)
    );
    return result[0];
  }

  async getAdminById(id: string): Promise<AdminUser | undefined> {
    const result = await this.db.select().from(adminUsers).where(
      eq(adminUsers.id, id)
    );
    return result[0];
  }

  // تم حذف وظائف AdminSession - لم تعد مطلوبة بعد إزالة نظام المصادقة

  // Users
  async getUsers(): Promise<User[]> {
    const result = await this.db.select().from(users);
    return Array.isArray(result) ? result : [];
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await this.db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await this.db.update(users).set(userData).where(eq(users.id, id)).returning();
    return updated;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    try {
      const result = await this.db.select().from(categories);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await this.db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await this.db.update(categories).set(category).where(eq(categories.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await this.db.delete(categories).where(eq(categories.id, id));
    return result.rowCount > 0;
  }

  // Restaurants
  // getRestaurants method is now the enhanced version below with filtering capabilities

  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    const [restaurant] = await this.db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant;
  }

  async getRestaurantsByCategory(categoryId: string): Promise<Restaurant[]> {
    return await this.db.select().from(restaurants).where(eq(restaurants.categoryId, categoryId));
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const [newRestaurant] = await this.db.insert(restaurants).values(restaurant).returning();
    return newRestaurant;
  }

  async updateRestaurant(id: string, restaurant: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    const [updated] = await this.db.update(restaurants).set(restaurant).where(eq(restaurants.id, id)).returning();
    return updated;
  }

  async deleteRestaurant(id: string): Promise<boolean> {
    // حذف عناصر القائمة المرتبطة أولاً
    await this.db.delete(menuItems).where(eq(menuItems.restaurantId, id));
    
    // تحديث الطلبات المرتبطة (تحويلها إلى cancelled بدلاً من حذفها)
    await this.db.update(orders)
      .set({ status: 'cancelled', restaurantId: null })
      .where(eq(orders.restaurantId, id));
    
    const result = await this.db.delete(restaurants).where(eq(restaurants.id, id));
    return result.rowCount > 0;
  }

  // Menu Items
  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return await this.db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId));
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const [item] = await this.db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const [newItem] = await this.db.insert(menuItems).values(menuItem).returning();
    return newItem;
  }

  async updateMenuItem(id: string, menuItem: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [updated] = await this.db.update(menuItems).set(menuItem).where(eq(menuItems.id, id)).returning();
    return updated;
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    const result = await this.db.delete(menuItems).where(eq(menuItems.id, id));
    return result.rowCount > 0;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    const result = await this.db.select().from(orders);
    return Array.isArray(result) ? result : [];
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByRestaurant(restaurantId: string): Promise<Order[]> {
    const result = await this.db.select().from(orders).where(eq(orders.restaurantId, restaurantId));
    return Array.isArray(result) ? result : [];
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await this.db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updated] = await this.db.update(orders).set(order).where(eq(orders.id, id)).returning();
    return updated;
  }

  // Drivers
  async getDrivers(): Promise<Driver[]> {
    const result = await this.db.select().from(drivers);
    return Array.isArray(result) ? result : [];
  }

  async getDriver(id: string): Promise<Driver | undefined> {
    const [driver] = await this.db.select().from(drivers).where(eq(drivers.id, id));
    return driver;
  }

  async getAvailableDrivers(): Promise<Driver[]> {
    return await this.db.select().from(drivers).where(
      and(
        eq(drivers.isAvailable, true),
        eq(drivers.isActive, true)
      )
    );
  }

  async createDriver(driver: InsertDriver): Promise<Driver> {
    const [newDriver] = await this.db.insert(drivers).values(driver).returning();
    return newDriver;
  }

  async updateDriver(id: string, driver: Partial<InsertDriver>): Promise<Driver | undefined> {
    const [updated] = await this.db.update(drivers).set(driver).where(eq(drivers.id, id)).returning();
    return updated;
  }

  async deleteDriver(id: string): Promise<boolean> {
    const result = await this.db.delete(drivers).where(eq(drivers.id, id));
    return result.rowCount > 0;
  }

  // Special Offers
  async getSpecialOffers(): Promise<SpecialOffer[]> {
    const result = await this.db.select().from(specialOffers);
    return Array.isArray(result) ? result : [];
  }

  async getActiveSpecialOffers(): Promise<SpecialOffer[]> {
    const result = await this.db.select().from(specialOffers).where(eq(specialOffers.isActive, true));
    return Array.isArray(result) ? result : [];
  }

  async createSpecialOffer(offer: InsertSpecialOffer): Promise<SpecialOffer> {
    const [newOffer] = await this.db.insert(specialOffers).values(offer).returning();
    return newOffer;
  }

  async updateSpecialOffer(id: string, offer: Partial<InsertSpecialOffer>): Promise<SpecialOffer | undefined> {
    const [updated] = await this.db.update(specialOffers).set(offer).where(eq(specialOffers.id, id)).returning();
    return updated;
  }

  async deleteSpecialOffer(id: string): Promise<boolean> {
    const result = await this.db.delete(specialOffers).where(eq(specialOffers.id, id));
    return result.rowCount > 0;
  }

  // Search methods - removed duplicate methods, keeping enhanced versions below

  // UI Settings (using systemSettings)
  async getUiSettings(): Promise<SystemSettings[]> {
    try {
      const result = await this.db.select().from(systemSettings);
      // Ensure we always return an array, even if result is null or undefined
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching UI settings:', error);
      return [];
    }
  }

  async getUiSetting(key: string): Promise<SystemSettings | undefined> {
    const [setting] = await this.db.select().from(systemSettings).where(
      eq(systemSettings.key, key)
    );
    return setting;
  }

  async updateUiSetting(key: string, value: string): Promise<SystemSettings | undefined> {
    try {
      // Try to update existing setting
      const [updated] = await this.db.update(systemSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(systemSettings.key, key))
        .returning();
      
      if (updated) {
        return updated;
      }
      
      // If no rows were updated, create new setting
      const [newSetting] = await this.db.insert(systemSettings)
        .values({
          key,
          value,
          category: 'ui',
          description: `UI setting: ${key}`,
          isActive: true
        })
        .returning();
      
      return newSetting;
    } catch (error) {
      console.error('Error updating UI setting:', error);
      return undefined;
    }
  }

  async createUiSetting(setting: InsertSystemSettings): Promise<SystemSettings> {
    const [newSetting] = await this.db.insert(systemSettings).values(setting).returning();
    return newSetting;
  }

  async deleteUiSetting(key: string): Promise<boolean> {
    const result = await this.db.delete(systemSettings).where(eq(systemSettings.key, key));
    return result.rowCount > 0;
  }

  // Notifications
  async getNotifications(recipientType?: string, recipientId?: string, unread?: boolean): Promise<Notification[]> {
    const conditions = [];
    if (recipientType) {
      conditions.push(eq(notifications.recipientType, recipientType));
    }
    if (recipientId) {
      conditions.push(eq(notifications.recipientId, recipientId));
    }
    if (unread !== undefined) {
      conditions.push(eq(notifications.isRead, !unread));
    }
    
    if (conditions.length > 0) {
      return await this.db.select().from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt));
    }
    
    return await this.db.select().from(notifications)
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await this.db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const [updated] = await this.db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  // Enhanced Search Functions
  async searchRestaurants(searchTerm: string, categoryId?: string, userLocation?: {lat: number, lon: number}): Promise<Restaurant[]> {
    const conditions = [
      eq(restaurants.isActive, true),
      or(
        like(restaurants.name, `%${searchTerm}%`),
        like(restaurants.description, `%${searchTerm}%`),
        like(restaurants.address, `%${searchTerm}%`)
      )
    ];
    
    if (categoryId) {
      conditions.push(eq(restaurants.categoryId, categoryId));
    }
    
    const result = await this.db.select().from(restaurants)
      .where(and(...conditions))
      .orderBy(restaurants.name);
    
    const restaurants_list = Array.isArray(result) ? result : [];
    
    // Add distance if user location is provided
    if (userLocation) {
      return restaurants_list.map(restaurant => ({
        ...restaurant,
        distance: restaurant.latitude && restaurant.longitude ? 
          this.calculateDistance(
            userLocation.lat,
            userLocation.lon,
            parseFloat(restaurant.latitude),
            parseFloat(restaurant.longitude)
          ) : null
      }));
    }
    
    return restaurants_list;
  }

  async searchCategories(searchTerm: string): Promise<Category[]> {
    const result = await this.db.select().from(categories)
      .where(
        and(
          eq(categories.isActive, true),
          like(categories.name, `%${searchTerm}%`)
        )
      )
      .orderBy(categories.name);
    return Array.isArray(result) ? result : [];
  }

  async searchMenuItems(searchTerm: string): Promise<MenuItem[]> {
    const result = await this.db.select().from(menuItems)
      .where(
        and(
          eq(menuItems.isAvailable, true),
          or(
            like(menuItems.name, `%${searchTerm}%`),
            like(menuItems.description, `%${searchTerm}%`),
            like(menuItems.category, `%${searchTerm}%`)
          )
        )
      )
      .orderBy(menuItems.name);
    return Array.isArray(result) ? result : [];
  }

  // Enhanced Restaurant Functions with Search and Filtering
  async getRestaurants(filters?: { 
    categoryId?: string; 
    area?: string; 
    isOpen?: boolean;
    isFeatured?: boolean;
    isNew?: boolean;
    search?: string;
    sortBy?: 'name' | 'rating' | 'deliveryTime' | 'distance' | 'newest';
    userLatitude?: number;
    userLongitude?: number;
    radius?: number; // in kilometers
  }): Promise<Restaurant[]> {
    const conditions = [eq(restaurants.isActive, true)];
    
    if (filters?.categoryId) {
      conditions.push(eq(restaurants.categoryId, filters.categoryId));
    }
    
    if (filters?.isOpen !== undefined) {
      conditions.push(eq(restaurants.isOpen, filters.isOpen));
    }
    
    if (filters?.isFeatured) {
      conditions.push(eq(restaurants.isFeatured, true));
    }
    
    if (filters?.isNew) {
      conditions.push(eq(restaurants.isNew, true));
    }
    
    if (filters?.search) {
      conditions.push(
        sql`(
          ${restaurants.name} ILIKE ${'%' + filters.search + '%'} OR
          COALESCE(${restaurants.description}, '') ILIKE ${'%' + filters.search + '%'} OR
          COALESCE(${restaurants.address}, '') ILIKE ${'%' + filters.search + '%'}
        )`
      );
    }
    
    // Build and execute query with temporary type assertion for compilation
    let baseQuery: any = this.db.select().from(restaurants);
    
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }
    
    // Apply sorting
    switch (filters?.sortBy) {
      case 'rating':
        // Convert varchar rating to numeric for proper sorting
        baseQuery = baseQuery.orderBy(sql`(${restaurants.rating})::numeric DESC`);
        break;
      case 'deliveryTime':
        baseQuery = baseQuery.orderBy(asc(restaurants.deliveryTime));
        break;
      case 'newest':
        baseQuery = baseQuery.orderBy(desc(restaurants.createdAt));
        break;
      case 'distance':
        // Will handle distance sorting in the application layer
        baseQuery = baseQuery.orderBy(restaurants.name);
        break;
      default:
        baseQuery = baseQuery.orderBy(restaurants.name);
    }
    
    const result = await baseQuery;
    const restaurants_list = Array.isArray(result) ? result : [];
    
    // If user location is provided and we're sorting by distance
    if (filters?.userLatitude && filters?.userLongitude && filters?.sortBy === 'distance') {
      return this.sortRestaurantsByDistance(
        restaurants_list, 
        filters.userLatitude, 
        filters.userLongitude,
        filters.radius
      );
    }
    
    // Filter by radius if provided
    if (filters?.userLatitude && filters?.userLongitude && filters?.radius) {
      return restaurants_list.filter(restaurant => {
        if (!restaurant.latitude || !restaurant.longitude) return false;
        const distance = this.calculateDistance(
          filters.userLatitude!,
          filters.userLongitude!,
          parseFloat(restaurant.latitude),
          parseFloat(restaurant.longitude)
        );
        return distance <= filters.radius!;
      });
    }
    
    return restaurants_list;
  }

  // Distance calculation using Haversine formula
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Sort restaurants by distance
  private sortRestaurantsByDistance(
    restaurants_list: Restaurant[], 
    userLat: number, 
    userLon: number,
    maxDistance?: number
  ): Restaurant[] {
    return restaurants_list
      .filter(restaurant => {
        if (!restaurant.latitude || !restaurant.longitude) return false;
        if (!maxDistance) return true;
        
        const distance = this.calculateDistance(
          userLat,
          userLon,
          parseFloat(restaurant.latitude),
          parseFloat(restaurant.longitude)
        );
        return distance <= maxDistance;
      })
      .map(restaurant => ({
        ...restaurant,
        distance: restaurant.latitude && restaurant.longitude ? 
          this.calculateDistance(
            userLat,
            userLon,
            parseFloat(restaurant.latitude),
            parseFloat(restaurant.longitude)
          ) : null
      }))
      .sort((a, b) => (a.distance || 999) - (b.distance || 999));
  }

  // Enhanced search for menu items
  async searchMenuItemsAdvanced(searchTerm: string, restaurantId?: string): Promise<any[]> {
    const conditions = [
      eq(menuItems.isAvailable, true),
      eq(restaurants.isActive, true),
      eq(restaurants.isOpen, true),
      or(
        like(menuItems.name, `%${searchTerm}%`),
        like(menuItems.description, `%${searchTerm}%`),
        like(menuItems.category, `%${searchTerm}%`)
      )
    ];
    
    if (restaurantId) {
      conditions.push(eq(menuItems.restaurantId, restaurantId));
    }
    
    const query = this.db.select({
      id: menuItems.id,
      name: menuItems.name,
      description: menuItems.description,
      price: menuItems.price,
      originalPrice: menuItems.originalPrice,
      image: menuItems.image,
      category: menuItems.category,
      isAvailable: menuItems.isAvailable,
      isSpecialOffer: menuItems.isSpecialOffer,
      restaurant: {
        id: restaurants.id,
        name: restaurants.name,
        image: restaurants.image,
        deliveryTime: restaurants.deliveryTime,
        deliveryFee: restaurants.deliveryFee
      }
    })
    .from(menuItems)
    .leftJoin(restaurants, eq(menuItems.restaurantId, restaurants.id))
    .where(and(...conditions))
    .orderBy(menuItems.name);
    
    const result = await query;
    return Array.isArray(result) ? result : [];
  }

  // Order Functions
  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getCustomerOrders(customerPhone: string): Promise<Order[]> {
    return await this.db.select().from(orders)
      .where(eq(orders.customerPhone, customerPhone))
      .orderBy(desc(orders.createdAt));
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order | undefined> {
    const [updated] = await this.db.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return updated;
  }

  // Order Tracking Functions
  async createOrderTracking(tracking: any): Promise<any> {
    const [newTracking] = await this.db.insert(orderTracking).values(tracking).returning();
    return newTracking;
  }

  async getOrderTracking(orderId: string): Promise<any[]> {
    return await this.db.select().from(orderTracking)
      .where(eq(orderTracking.orderId, orderId))
      .orderBy(desc(orderTracking.createdAt));
  }

  // Cart Functions - وظائف السلة
  async getCartItems(userId: string): Promise<any[]> {
    try {
      const result = await this.db.select({
        id: cart.id,
        quantity: cart.quantity,
        specialInstructions: cart.specialInstructions,
        addedAt: cart.addedAt,
        menuItem: {
          id: menuItems.id,
          name: menuItems.name,
          description: menuItems.description,
          price: menuItems.price,
          image: menuItems.image,
          category: menuItems.category
        },
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          image: restaurants.image,
          deliveryFee: restaurants.deliveryFee
        }
      })
      .from(cart)
      .leftJoin(menuItems, eq(cart.menuItemId, menuItems.id))
      .leftJoin(restaurants, eq(cart.restaurantId, restaurants.id))
      .where(eq(cart.userId, userId))
      .orderBy(desc(cart.addedAt));
      
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching cart items:', error);
      return [];
    }
  }

  async addToCart(cartItem: InsertCart): Promise<Cart> {
    try {
      // Check if item already exists in cart
      const existingItemResult = await this.db.select().from(cart)
        .where(
          and(
            eq(cart.userId, cartItem.userId),
            eq(cart.menuItemId, cartItem.menuItemId)
          )
        );
      
      const existingItem = Array.isArray(existingItemResult) ? existingItemResult : [];
      
      if (existingItem.length > 0) {
        // Update quantity
        const [updated] = await this.db.update(cart)
          .set({ 
            quantity: sql`${cart.quantity} + ${cartItem.quantity || 1}`,
            addedAt: new Date()
          })
          .where(eq(cart.id, existingItem[0].id))
          .returning();
        return updated;
      } else {
        // Add new item
        const [newItem] = await this.db.insert(cart).values(cartItem).returning();
        return newItem;
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  async updateCartItem(cartId: string, quantity: number): Promise<Cart | undefined> {
    if (quantity <= 0) {
      await this.db.delete(cart).where(eq(cart.id, cartId));
      return undefined;
    }
    
    const [updated] = await this.db.update(cart)
      .set({ quantity, addedAt: new Date() })
      .where(eq(cart.id, cartId))
      .returning();
    return updated;
  }

  async removeFromCart(cartId: string): Promise<boolean> {
    const result = await this.db.delete(cart).where(eq(cart.id, cartId));
    return result.rowCount > 0;
  }

  async clearCart(userId: string): Promise<boolean> {
    const result = await this.db.delete(cart).where(eq(cart.userId, userId));
    return result.rowCount > 0;
  }

  // Favorites Functions - وظائف المفضلة
  async getFavoriteRestaurants(userId: string): Promise<Restaurant[]> {
    try {
      const result = await this.db.select()
      .from(restaurants)
      .innerJoin(favorites, eq(favorites.restaurantId, restaurants.id))
      .where(
        and(
          eq(favorites.userId, userId),
          eq(restaurants.isActive, true)
        )
      )
      .orderBy(desc(favorites.addedAt));
      
      return Array.isArray(result) ? result.map(row => row.restaurants) : [];
    } catch (error) {
      console.error('Error fetching favorite restaurants:', error);
      return [];
    }
  }

  async addToFavorites(favorite: InsertFavorites): Promise<Favorites> {
    const [newFavorite] = await this.db.insert(favorites)
      .values(favorite)
      .returning();
    return newFavorite;
  }

  async removeFromFavorites(userId: string, restaurantId: string): Promise<boolean> {
    const result = await this.db.delete(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.restaurantId, restaurantId)
        )
      );
    return result.rowCount > 0;
  }

  async isRestaurantFavorite(userId: string, restaurantId: string): Promise<boolean> {
    const result = await this.db.select().from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.restaurantId, restaurantId)
        )
      );
    return result.length > 0;
  }

  // User Addresses
  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    try {
      const result = await this.db.select().from(userAddresses)
        .where(eq(userAddresses.userId, userId))
        .orderBy(desc(userAddresses.isDefault), desc(userAddresses.createdAt));
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching user addresses:', error);
      return [];
    }
  }

  async createUserAddress(userId: string, address: InsertUserAddress): Promise<UserAddress> {
    // If this is being set as default, unset other defaults for this user
    if (address.isDefault) {
      await this.db.update(userAddresses)
        .set({ isDefault: false })
        .where(
          and(
            eq(userAddresses.userId, userId),
            eq(userAddresses.isDefault, true)
          )
        );
    }

    const [newAddress] = await this.db.insert(userAddresses)
      .values({
        ...address,
        userId,
        isDefault: address.isDefault ?? false
      })
      .returning();
    return newAddress;
  }

  async updateUserAddress(addressId: string, userId: string, address: Partial<InsertUserAddress>): Promise<UserAddress | undefined> {
    // Verify ownership
    const existingAddress = await this.db.select().from(userAddresses)
      .where(
        and(
          eq(userAddresses.id, addressId),
          eq(userAddresses.userId, userId)
        )
      );
    
    if (existingAddress.length === 0) {
      return undefined;
    }

    // If this is being set as default, unset other defaults for this user
    if (address.isDefault) {
      await this.db.update(userAddresses)
        .set({ isDefault: false })
        .where(
          and(
            eq(userAddresses.userId, userId),
            eq(userAddresses.isDefault, true)
          )
        );
    }

    const [updated] = await this.db.update(userAddresses)
      .set(address)
      .where(eq(userAddresses.id, addressId))
      .returning();
    return updated;
  }

  async deleteUserAddress(addressId: string, userId: string): Promise<boolean> {
    const result = await this.db.delete(userAddresses)
      .where(
        and(
          eq(userAddresses.id, addressId),
          eq(userAddresses.userId, userId)
        )
      );
    return result.rowCount > 0;
  }

  // Ratings
  async getRatings(orderId?: string, restaurantId?: string): Promise<Rating[]> {
    try {
      let query = this.db.select().from(ratings);
      
      if (orderId && restaurantId) {
        query = query.where(
          and(
            eq(ratings.orderId, orderId),
            eq(ratings.restaurantId, restaurantId)
          )
        );
      } else if (orderId) {
        query = query.where(eq(ratings.orderId, orderId));
      } else if (restaurantId) {
        query = query.where(eq(ratings.restaurantId, restaurantId));
      }
      
      const result = await query.orderBy(desc(ratings.createdAt));
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching ratings:', error);
      return [];
    }
  }

  async createRating(rating: InsertRating): Promise<Rating> {
    const [newRating] = await this.db.insert(ratings)
      .values({
        ...rating,
        isApproved: rating.isApproved ?? false
      })
      .returning();
    return newRating;
  }

  async updateRating(id: string, rating: Partial<InsertRating>): Promise<Rating | undefined> {
    const [updated] = await this.db.update(ratings)
      .set(rating)
      .where(eq(ratings.id, id))
      .returning();
    return updated;
  }
}

export const dbStorage = new DatabaseStorage();