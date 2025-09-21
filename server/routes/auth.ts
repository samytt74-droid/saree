import express from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { dbStorage } from '../db';
import { adminUsers, drivers } from '@shared/schema';
import { eq, or } from 'drizzle-orm';

const router = express.Router();

// تسجيل الدخول للمديرين
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
      });
    }

    console.log('🔐 محاولة تسجيل دخول مدير:', email);

    // البحث عن المدير في قاعدة البيانات
    const adminResult = await dbStorage.db
      .select()
      .from(adminUsers)
      .where(
        or(
          eq(adminUsers.email, email),
          eq(adminUsers.username, email)
        )
      )
      .limit(1);

    if (adminResult.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    const admin = adminResult[0];

    // التحقق من حالة الحساب
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'الحساب غير مفعل'
      });
    }

    // التحقق من كلمة المرور (مقارنة مباشرة بدون تشفير)
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    // إنشاء رمز مميز بسيط
    const token = randomUUID();

    console.log('🎉 تم تسجيل الدخول بنجاح للمدير:', admin.name);
    
    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        userType: 'admin'
      },
      message: 'تم تسجيل الدخول بنجاح'
    });

  } catch (error) {
    console.error('خطأ في تسجيل دخول المدير:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
});

// تسجيل الدخول للسائقين
router.post('/driver/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف وكلمة المرور مطلوبان'
      });
    }

    console.log('🔐 محاولة تسجيل دخول سائق:', phone);

    // البحث عن السائق في قاعدة البيانات
    const driverResult = await dbStorage.db
      .select()
      .from(drivers)
      .where(eq(drivers.phone, phone))
      .limit(1);

    if (driverResult.length === 0) {
      console.log('❌ السائق غير موجود:', phone);
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    const driver = driverResult[0];
    console.log('✅ تم العثور على السائق:', driver.name);

    // التحقق من حالة الحساب
    if (!driver.isActive) {
      console.log('❌ حساب السائق غير مفعل:', driver.name);
      return res.status(401).json({
        success: false,
        message: 'الحساب غير مفعل'
      });
    }

    // التحقق من كلمة المرور (مقارنة مباشرة بدون تشفير)
    const isPasswordValid = await bcrypt.compare(password, driver.password);

    if (!isPasswordValid) {
      console.log('❌ كلمة المرور غير صحيحة للسائق:', driver.name);
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    // إنشاء رمز مميز بسيط
    const token = randomUUID();

    console.log('🎉 تم تسجيل الدخول بنجاح للسائق:', driver.name);
    
    res.json({
      success: true,
      token,
      user: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        isAvailable: driver.isAvailable,
        isActive: driver.isActive,
        currentLocation: driver.currentLocation,
        earnings: driver.earnings,
        userType: 'driver'
      },
      message: 'تم تسجيل الدخول بنجاح'
    });

  } catch (error) {
    console.error('خطأ في تسجيل دخول السائق:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
});

// تسجيل الخروج
router.post('/logout', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    });
  } catch (error) {
    console.error('خطأ في تسجيل الخروج:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
});

export default router;