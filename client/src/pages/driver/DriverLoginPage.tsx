import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Truck, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function DriverLoginPage() {
  const [, setLocation] = useLocation();
  const { login, user, loading } = useAuth();
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // إعادة توجيه إذا كان المستخدم مسجل دخول بالفعل
  useEffect(() => {
    if (user && user.userType === 'driver') {
      setLocation('/driver');
    }
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!formData.phone.trim() || !formData.password.trim()) {
      setError('يرجى إدخال رقم الهاتف وكلمة المرور');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await apiRequest('POST', '/api/auth/driver/login', {
        phone: formData.phone,
        password: formData.password,
      });

      const result = await response.json();
      
      if (result.success) {
        // حفظ بيانات السائق في localStorage
        localStorage.setItem('driver_token', result.token);
        localStorage.setItem('driver_user', JSON.stringify(result.user));
        setLocation('/driver');
      } else {
        setError(result.message || 'فشل في تسجيل الدخول');
      }
    } catch (error) {
      console.error('Driver login error:', error);
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(''); // مسح الخطأ عند الكتابة
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Truck className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">تطبيق السائق</h1>
          <p className="text-gray-600">تسجيل دخول السائق</p>
        </div>

        {/* Login Form */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center text-gray-800">
              مرحباً بك
            </CardTitle>
            <p className="text-center text-gray-600 text-sm">
              أدخل بياناتك لبدء العمل
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 font-medium">
                  رقم الهاتف
                </Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+967771234567"
                    className="pr-10 h-12 border-gray-200 focus:border-green-500 focus:ring-green-500"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="pr-10 pl-10 h-12 border-gray-200 focus:border-green-500 focus:ring-green-500"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3 text-gray-400 hover:text-gray-600"
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800 font-medium mb-2">بيانات تجريبية:</p>
              <div className="text-xs text-green-700 space-y-1">
                <p>رقم الهاتف: +967771234567</p>
                <p>كلمة المرور: password123</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            © 2024 السريع ون - جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
}
