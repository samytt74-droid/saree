import React, { createContext, useContext, useState, useEffect } from 'react';

interface UiSetting {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UiSettingsContextType {
  settings: Record<string, string>;
  loading: boolean;
  updateSetting: (key: string, value: string) => Promise<void>;
  getSetting: (key: string, defaultValue?: string) => string;
  isFeatureEnabled: (key: string) => boolean;
  refreshSettings: () => Promise<void>;
}

const UiSettingsContext = createContext<UiSettingsContextType | undefined>(undefined);

export function UiSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/ui-settings');
      if (response.ok) {
        const settingsData: UiSetting[] = await response.json();
        const settingsMap = settingsData.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {} as Record<string, string>);
        setSettings(settingsMap);
      }
    } catch (error) {
      console.error('خطأ في تحميل إعدادات الواجهة:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      // تحديث الإعداد محلياً فوراً
      setSettings(prev => ({ ...prev, [key]: value }));
      
      const response = await fetch(`/api/admin/ui-settings/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });

      if (response.ok) {
        // تأكيد التحديث من الخادم
        const updatedSetting = await response.json();
        console.log('تم تحديث الإعداد:', key, '=', value);
      } else {
        // إعادة القيمة السابقة في حالة الفشل
        await loadSettings();
        throw new Error('فشل في تحديث الإعداد');
      }
    } catch (error) {
      console.error('خطأ في تحديث الإعداد:', error);
      // إعادة تحميل الإعدادات في حالة الخطأ
      await loadSettings();
    }
  };

  const getSetting = (key: string, defaultValue: string = '') => {
    return settings[key] || defaultValue;
  };

  const isFeatureEnabled = (key: string) => {
    return getSetting(key) === 'true';
  };

  const refreshSettings = async () => {
    setLoading(true);
    await loadSettings();
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <UiSettingsContext.Provider value={{
      settings,
      loading,
      updateSetting,
      getSetting,
      isFeatureEnabled,
      refreshSettings
    }}>
      {children}
    </UiSettingsContext.Provider>
  );
}

export function useUiSettings() {
  const context = useContext(UiSettingsContext);
  if (context === undefined) {
    throw new Error('useUiSettings must be used within a UiSettingsProvider');
  }
  return context;
}