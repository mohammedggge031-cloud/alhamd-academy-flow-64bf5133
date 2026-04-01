import { lazy, Suspense, forwardRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import AppLayout from "./components/layout/AppLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const Teachers = lazy(() => import("./pages/Teachers"));
const Sessions = lazy(() => import("./pages/Sessions"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Reports = lazy(() => import("./pages/Reports"));
const Expenses = lazy(() => import("./pages/Expenses"));
const MonthlyReports = lazy(() => import("./pages/MonthlyReports"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const Bookings = lazy(() => import("./pages/Bookings"));
const TeacherProfile = lazy(() => import("./pages/TeacherProfile"));
const TeacherDashboardPage = lazy(() => import("./pages/TeacherDashboardPage"));
const TeacherStudentsPage = lazy(() => import("./pages/TeacherStudentsPage"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Export queryClient so useAuth can clear it on logout
export { queryClient };

const PageLoader = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="min-h-[50vh] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
));
PageLoader.displayName = "PageLoader";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthReady } = useAuth();
  if (!isAuthReady) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RoleGuard = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const { role, isAuthReady } = useAuth();
  if (!isAuthReady) return <PageLoader />;
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/*" element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ErrorBoundary>
                          <Suspense fallback={<PageLoader />}>
                            <Routes>
                              <Route path="/" element={<Dashboard />} />
                              <Route path="/teacher-home" element={<TeacherDashboardPage />} />
                              <Route path="/bookings" element={<Bookings />} />
                              <Route path="/students" element={<Students />} />
                              <Route path="/teachers" element={<Teachers />} />
                              <Route path="/sessions" element={<Sessions />} />
                              <Route path="/invoices" element={<Invoices />} />
                              <Route path="/expenses" element={<RoleGuard allowedRoles={["admin"]}><Expenses /></RoleGuard>} />
                              <Route path="/reports" element={<RoleGuard allowedRoles={["admin"]}><Reports /></RoleGuard>} />
                              <Route path="/monthly-reports" element={<MonthlyReports />} />
                              <Route path="/my-students" element={<TeacherStudentsPage />} />
                              <Route path="/my-profile" element={<TeacherProfile />} />
                              <Route path="/settings" element={<RoleGuard allowedRoles={["admin"]}><SettingsPage /></RoleGuard>} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </ErrorBoundary>
                      </AppLayout>
                    </ProtectedRoute>
                  } />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
