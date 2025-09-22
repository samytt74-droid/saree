import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  BarChart3, 
  Store, 
  ShoppingBag, 
  Truck, 
  Percent, 
  Settings, 
  Menu,
  LogOut,
  Package,
  Users,
  Bell,
  User,
  Tag
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { 
      icon: BarChart3, 
      label: 'لوحة التحكم', 
      path: '/admin',
      description: 'نظرة عامة على النظام'
    },
    { 
      icon: ShoppingBag, 
      label: 'الطلبات', 
      path: '/admin/orders',
      description: 'إدارة جميع الطلبات'
    },
    { 
      icon: Store, 
      label: 'المطاعم', 
      path: '/admin/restaurants',
      description: 'إدارة المطاعم والمتاجر'
    },
    { 
      icon: Tag, 
      label: 'التصنيفات', 
      path: '/admin/categories',
      description: 'إدارة فئات المطاعم'
    },
    { 
      icon: Package, 
      label: 'قوائم الطعام', 
      path: '/admin/menu-items',
      description: 'إدارة عناصر القوائم'
    },
    { 
      icon: Truck, 
      label: 'السائقين', 
      path: '/admin/drivers',
      description: 'إدارة السائقين'
    },
    { 
      icon: Percent, 
      label: 'العروض', 
      path: '/admin/offers',
      description: 'إدارة العروض الخاصة'
    },
    { 
      icon: Users, 
      label: 'المستخدمين', 
      path: '/admin/users',
      description: 'إدارة المستخدمين والصلاحيات'
    },
    { 
      icon: User, 
      label: 'الملف الشخصي', 
      path: '/admin/profile',
      description: 'إدارة معلومات الحساب'
    },
    { 
      icon: Settings, 
      label: 'إعدادات الواجهة', 
      path: '/admin/ui-settings',
      description: 'إدارة إعدادات التطبيق والواجهة'
    },
  ];

  const handleNavigation = (path: string) => {
    setLocation(path);
    setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    // مسح بيانات المدير من localStorage
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/';
  };

  const currentPath = window.location.pathname;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">لوحة التحكم</h2>
            <p className="text-sm text-gray-600">السريع ون</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">A</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">مدير النظام</p>
            <p className="text-xs text-gray-500">لوحة التحكم</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'}`} />
              <div className="flex-1">
                <p className={`font-medium ${isActive ? 'text-white' : 'text-gray-900'}`}>
                  {item.label}
                </p>
                <p className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                  {item.description}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 bg-white shadow-lg">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="right" className="w-80 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">لوحة التحكم</h1>
              <p className="text-xs text-gray-500">السريع ون</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5" />
            </Button>
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};