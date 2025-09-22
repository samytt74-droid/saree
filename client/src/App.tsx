import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "./contexts/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LocationProvider, useLocation } from "./context/LocationContext";
import { UiSettingsProvider, useUiSettings } from "./context/UiSettingsContext";
import { NotificationProvider } from "./context/NotificationContext";
import { LocationPermissionModal } from "./components/LocationPermissionModal";
import Layout from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import DriverLoginPage from "./pages/driver/DriverLoginPage";
import AdminApp from "./pages/AdminApp";
import { DriverDashboard } from "./pages/DriverDashboard";
import { useState } from "react";
import Home from "./pages/Home";
import Restaurant from "./pages/Restaurant";
import Cart from "./pages/Cart";
import Profile from "./pages/Profile";
import Location from "./pages/Location";
import OrderTracking from "./pages/OrderTracking";
import OrdersPage from "./pages/OrdersPage";
import TrackOrdersPage from "./pages/TrackOrdersPage";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import SearchPage from "./pages/SearchPage";
// Admin pages removed - now handled separately
import NotFound from "@/pages/not-found";

function MainApp() {
  // const { userType, loading } = useAuth(); // تم إزالة نظام المصادقة
  const { location } = useLocation();
  const [showLocationModal, setShowLocationModal] = useState(true);

  // تم إزالة loading state ومراجع المصادقة

  // Handle login pages first (without layout)
  if (window.location.pathname === '/admin-login') {
    return <AdminLoginPage />;
  }
  
  if (window.location.pathname === '/driver-login') {
    return <DriverLoginPage />;
  }

  // Handle admin routes (direct access without authentication)
  if (window.location.pathname.startsWith('/admin')) {
    return <AdminApp onLogout={() => window.location.href = '/'} />;
  }

  // Handle driver routes (direct access without authentication)  
  if (window.location.pathname.startsWith('/driver')) {
    return <DriverDashboard onLogout={() => window.location.href = '/'} />;
  }

  // Remove admin/driver routes from customer app routing

  // Default customer app
  return (
    <>
      <Layout>
        <Router />
      </Layout>
      
      {showLocationModal && !location.hasPermission && (
        <LocationPermissionModal
          onPermissionGranted={(position) => {
            console.log('تم منح الإذن للموقع:', position);
            setShowLocationModal(false);
          }}
          onPermissionDenied={() => {
            console.log('تم رفض الإذن للموقع');
            setShowLocationModal(false);
          }}
        />
      )}
    </>
  );
}

function Router() {
  // Check UiSettings for page visibility
  const { isFeatureEnabled } = useUiSettings();
  const showOrdersPage = isFeatureEnabled('show_orders_page');
  const showTrackOrdersPage = isFeatureEnabled('show_track_orders_page');

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={SearchPage} />
      <Route path="/restaurant/:id" component={Restaurant} />
      <Route path="/cart" component={Cart} />
      <Route path="/profile" component={Profile} />
      <Route path="/addresses" component={Location} />
      {showOrdersPage && <Route path="/orders" component={OrdersPage} />}
      <Route path="/orders/:orderId" component={OrderTracking} />
      {showTrackOrdersPage && <Route path="/track-orders" component={TrackOrdersPage} />}
      <Route path="/settings" component={Settings} />
      <Route path="/privacy" component={Privacy} />
      
      {/* Authentication Routes */}
      <Route path="/admin-login" component={AdminLoginPage} />
      <Route path="/driver-login" component={DriverLoginPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <UiSettingsProvider>
              <LocationProvider>
                <CartProvider>
                  <NotificationProvider>
                    <Toaster />
                    <MainApp />
                  </NotificationProvider>
                </CartProvider>
              </LocationProvider>
            </UiSettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
