import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Truck, Save, X, Phone, MapPin, DollarSign, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Driver } from '@shared/schema';

export default function AdminDrivers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    currentLocation: '',
    isAvailable: true,
    isActive: true,
  });

  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ['/api/drivers'],
    refetchInterval: 15000, // تحديث كل 15 ثانية
  });

  const createDriverMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/drivers', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({
        title: "تم إضافة السائق",
        description: "تم إضافة السائق الجديد بنجاح",
      });
      resetForm();
      setIsDialogOpen(false);
    },
  });

  const updateDriverMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await apiRequest('PUT', `/api/drivers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({
        title: "تم تحديث السائق",
        description: "تم تحديث بيانات السائق بنجاح",
      });
      resetForm();
      setEditingDriver(null);
      setIsDialogOpen(false);
    },
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/drivers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      toast({
        title: "تم حذف السائق",
        description: "تم حذف السائق بنجاح",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      password: '',
      currentLocation: '',
      isAvailable: true,
      isActive: true,
    });
    setEditingDriver(null);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      password: '', // Don't show password
      currentLocation: driver.currentLocation || '',
      isAvailable: driver.isAvailable,
      isActive: driver.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال الاسم ورقم الهاتف",
        variant: "destructive",
      });
      return;
    }

    if (!editingDriver && !formData.password.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال كلمة المرور للسائق الجديد",
        variant: "destructive",
      });
      return;
    }

    const submitData = editingDriver && !formData.password.trim() 
      ? { ...formData, password: undefined } 
      : formData;

    if (editingDriver) {
      updateDriverMutation.mutate({ id: editingDriver.id, data: submitData });
    } else {
      createDriverMutation.mutate(formData);
    }
  };

  const toggleDriverStatus = (driver: Driver, field: 'isAvailable' | 'isActive') => {
    updateDriverMutation.mutate({
      id: driver.id,
      data: { [field]: !driver[field] }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة السائقين</h1>
            <p className="text-muted-foreground">إدارة سائقي التوصيل</p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="gap-2"
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
              data-testid="button-add-driver"
            >
              <Plus className="h-4 w-4" />
              إضافة سائق جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingDriver ? 'تعديل بيانات السائق' : 'إضافة سائق جديد'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="أدخل اسم السائق"
                  required
                  data-testid="input-driver-name"
                />
              </div>

              <div>
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+967-771234567"
                  required
                  data-testid="input-driver-phone"
                />
              </div>

              <div>
                <Label htmlFor="password">
                  كلمة المرور {editingDriver && "(اتركها فارغة للاحتفاظ بالحالية)"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="كلمة المرور"
                  required={!editingDriver}
                  data-testid="input-driver-password"
                />
              </div>

              <div>
                <Label htmlFor="location">الموقع الحالي</Label>
                <Input
                  id="location"
                  value={formData.currentLocation}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentLocation: e.target.value }))}
                  placeholder="الموقع الحالي للسائق"
                  data-testid="input-driver-location"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="available">متاح للعمل</Label>
                  <Switch
                    id="available"
                    checked={formData.isAvailable}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAvailable: checked }))}
                    data-testid="switch-driver-available"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">نشط</Label>
                  <Switch
                    id="active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    data-testid="switch-driver-active"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1 gap-2"
                  disabled={createDriverMutation.isPending || updateDriverMutation.isPending}
                  data-testid="button-save-driver"
                >
                  <Save className="h-4 w-4" />
                  {editingDriver ? 'تحديث' : 'إضافة'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                  data-testid="button-cancel-driver"
                >
                  <X className="h-4 w-4" />
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="w-16 h-16 bg-muted rounded-full mb-4 mx-auto" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2 mx-auto" />
                <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
              </CardContent>
            </Card>
          ))
        ) : drivers?.length ? (
          drivers.map((driver) => (
            <Card key={driver.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="text-center pb-3">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-lg">{driver.name}</CardTitle>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant={driver.isActive ? "default" : "secondary"}>
                    {driver.isActive ? 'نشط' : 'غير نشط'}
                  </Badge>
                  <Badge variant={driver.isAvailable ? "default" : "outline"}>
                    {driver.isAvailable ? 'متاح' : 'غير متاح'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{driver.phone}</span>
                  </div>
                  
                  {driver.currentLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{driver.currentLocation}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">الأرباح: {driver.earnings || 0} ريال</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">متاح للعمل</p>
                    <Switch
                      checked={driver.isAvailable}
                      onCheckedChange={() => toggleDriverStatus(driver, 'isAvailable')}
                      data-testid={`switch-driver-available-${driver.id}`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">نشط</p>
                    <Switch
                      checked={driver.isActive}
                      onCheckedChange={() => toggleDriverStatus(driver, 'isActive')}
                      data-testid={`switch-driver-active-${driver.id}`}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => handleEdit(driver)}
                    data-testid={`button-edit-driver-${driver.id}`}
                  >
                    <Edit className="h-4 w-4" />
                    تعديل
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`tel:${driver.phone}`)}
                    data-testid={`button-call-driver-${driver.id}`}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-driver-${driver.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف السائق "{driver.name}"؟ 
                          لن يتمكن من الوصول للتطبيق بعد الحذف.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteDriverMutation.mutate(driver.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد سائقين</h3>
            <p className="text-muted-foreground mb-4">ابدأ بإضافة سائقين لخدمة التوصيل</p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-driver">
              إضافة السائق الأول
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}