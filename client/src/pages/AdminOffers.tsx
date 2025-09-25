import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Percent, Save, X, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { SpecialOffer } from '@shared/schema';

export default function AdminOffers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    discountPercent: '',
    discountAmount: '',
    minimumOrder: '0',
    validUntil: '',
    isActive: true,
  });

  const { data: offers, isLoading } = useQuery<SpecialOffer[]>({
    queryKey: ['/api/admin/special-offers'],
    refetchInterval: 15000, // تحديث كل 15 ثانية
  });

  const createOfferMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const submitData = {
        ...data,
        discountPercent: data.discountPercent ? parseInt(data.discountPercent) : null,
        discountAmount: data.discountAmount ? parseFloat(data.discountAmount) : null,
        minimumOrder: parseFloat(data.minimumOrder),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      };
      const response = await apiRequest('POST', '/api/admin/special-offers', submitData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/special-offers'] });
      toast({
        title: "تم إنشاء العرض",
        description: "تم إضافة العرض الجديد بنجاح",
      });
      resetForm();
      setIsDialogOpen(false);
    },
  });

  const updateOfferMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const submitData = {
        ...data,
        discountPercent: data.discountPercent ? parseInt(data.discountPercent) : null,
        discountAmount: data.discountAmount ? parseFloat(data.discountAmount) : null,
        minimumOrder: parseFloat(data.minimumOrder),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      };
      const response = await apiRequest('PUT', `/api/admin/special-offers/${id}`, submitData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/special-offers'] });
      toast({
        title: "تم تحديث العرض",
        description: "تم تحديث العرض بنجاح",
      });
      resetForm();
      setEditingOffer(null);
      setIsDialogOpen(false);
    },
  });

  const deleteOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/special-offers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/special-offers'] });
      toast({
        title: "تم حذف العرض",
        description: "تم حذف العرض بنجاح",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image: '',
      discountPercent: '',
      discountAmount: '',
      minimumOrder: '0',
      validUntil: '',
      isActive: true,
    });
    setEditingOffer(null);
  };

  const handleEdit = (offer: SpecialOffer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description,
      image: offer.image,
      discountPercent: offer.discountPercent?.toString() || '',
      discountAmount: offer.discountAmount || '',
      minimumOrder: offer.minimumOrder || '0',
      validUntil: offer.validUntil ? new Date(offer.validUntil).toISOString().slice(0, 16) : '',
      isActive: offer.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال عنوان ووصف العرض",
        variant: "destructive",
      });
      return;
    }

    if (!formData.discountPercent && !formData.discountAmount) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال نسبة الخصم أو مبلغ الخصم",
        variant: "destructive",
      });
      return;
    }

    if (editingOffer) {
      updateOfferMutation.mutate({ id: editingOffer.id, data: formData });
    } else {
      createOfferMutation.mutate(formData);
    }
  };

  const toggleOfferStatus = (offer: SpecialOffer) => {
    updateOfferMutation.mutate({
      id: offer.id,
      data: { ...formData, isActive: !offer.isActive }
    });
  };

  const parseDecimal = (value: string | null): number => {
    if (!value) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Percent className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة العروض الخاصة</h1>
            <p className="text-muted-foreground">إنشاء وإدارة العروض والخصومات</p>
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
              data-testid="button-add-offer"
            >
              <Plus className="h-4 w-4" />
              إضافة عرض جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOffer ? 'تعديل العرض' : 'إضافة عرض جديد'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">عنوان العرض</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="مثال: خصم 30% على جميع الوجبات"
                  required
                  data-testid="input-offer-title"
                />
              </div>

              <div>
                <Label htmlFor="description">وصف العرض</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="تفاصيل العرض وشروطه"
                  rows={3}
                  required
                  data-testid="input-offer-description"
                />
              </div>

              <div>
                <Label htmlFor="image">رابط صورة العرض</Label>
                <div className="flex gap-2">
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="https://example.com/offer-image.jpg"
                    required
                    data-testid="input-offer-image"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('offer-file-upload')?.click()}
                    data-testid="button-select-offer-image"
                  >
                    اختيار صورة
                  </Button>
                  <input
                    id="offer-file-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          setFormData(prev => ({ ...prev, image: result }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discountPercent">نسبة الخصم (%)</Label>
                  <Input
                    id="discountPercent"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      discountPercent: e.target.value,
                      discountAmount: '' // Clear the other field
                    }))}
                    placeholder="مثال: 20"
                    data-testid="input-offer-discount-percent"
                  />
                </div>

                <div>
                  <Label htmlFor="discountAmount">مبلغ الخصم (ريال)</Label>
                  <Input
                    id="discountAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discountAmount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      discountAmount: e.target.value,
                      discountPercent: '' // Clear the other field
                    }))}
                    placeholder="مثال: 15"
                    data-testid="input-offer-discount-amount"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minimumOrder">الحد الأدنى للطلب (ريال)</Label>
                  <Input
                    id="minimumOrder"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimumOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimumOrder: e.target.value }))}
                    data-testid="input-offer-minimum-order"
                  />
                </div>

                <div>
                  <Label htmlFor="validUntil">صالح حتى</Label>
                  <Input
                    id="validUntil"
                    type="datetime-local"
                    value={formData.validUntil}
                    onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                    data-testid="input-offer-valid-until"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">العرض نشط</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  data-testid="switch-offer-active"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1 gap-2"
                  disabled={createOfferMutation.isPending || updateOfferMutation.isPending}
                  data-testid="button-save-offer"
                >
                  <Save className="h-4 w-4" />
                  {editingOffer ? 'تحديث' : 'إضافة'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                  data-testid="button-cancel-offer"
                >
                  <X className="h-4 w-4" />
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="w-full h-48 bg-muted" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : offers?.length ? (
          offers.map((offer) => (
            <Card key={offer.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                {offer.image ? (
                  <img 
                    src={offer.image} 
                    alt={offer.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Percent className="h-16 w-16 text-primary/50" />
                )}
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{offer.title}</CardTitle>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {offer.description}
                    </p>
                  </div>
                  <Badge variant={offer.isActive ? "default" : "outline"}>
                    {offer.isActive ? 'نشط' : 'غير نشط'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {offer.discountPercent && (
                    <div className="flex items-center gap-1">
                      <Percent className="h-4 w-4 text-green-500" />
                      <span>{offer.discountPercent}% خصم</span>
                    </div>
                  )}
                  {offer.discountAmount && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span>{parseDecimal(offer.discountAmount)} ريال خصم</span>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    أقل طلب: {parseDecimal(offer.minimumOrder)} ريال
                  </div>
                  {offer.validUntil && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">
                        {new Date(offer.validUntil).toLocaleDateString('ar-YE')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">نشط</p>
                  <Switch
                    checked={offer.isActive}
                    onCheckedChange={() => toggleOfferStatus(offer)}
                    data-testid={`switch-offer-active-${offer.id}`}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => handleEdit(offer)}
                    data-testid={`button-edit-offer-${offer.id}`}
                  >
                    <Edit className="h-4 w-4" />
                    تعديل
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-offer-${offer.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف العرض "{offer.title}"؟ 
                          لن يتمكن العملاء من رؤية هذا العرض بعد الحذف.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteOfferMutation.mutate(offer.id)}
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
            <Percent className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد عروض</h3>
            <p className="text-muted-foreground mb-4">ابدأ بإضافة عروض خاصة لجذب العملاء</p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-offer">
              إضافة العرض الأول
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}