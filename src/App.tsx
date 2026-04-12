import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { queryClient } from "@/lib/queryClient";
import AppLayout from "./components/layout/AppLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

// Lazy-loaded pages
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"), "dashboard-page");
const Students = lazyWithRetry(() => import("./pages/Students"), "students-page");
const Teachers = lazyWithRetry(() => import("./pages/Teachers"), "teachers-page");
const Sessions = lazyWithRetry(() => import("./pages/Sessions"), "sessions-page");
const Invoices = lazyWithRetry(() => import("./pages/Invoices"), "invoices-page");
const Reports = lazyWithRetry(() => import("./pages/Reports"), "reports-page");
const Expenses = lazyWithRetry(() => import("./pages/Expenses"), "expenses-page");
const MonthlyReports = lazyWithRetry(() => import("./pages/MonthlyReports"), "monthly-reports-page");
const SettingsPage = lazyWithRetry(() => import("./pages/SettingsPage"), "settings-page");
const Bookings = lazyWithRetry(() => import("./pages/Bookings"), "bookings-page");
const TeacherProfile = lazyWithRetry(() => import("./pages/TeacherProfile"), "teacher-profile-page");
const TeacherDashboardPage = lazyWithRetry(() => import("./pages/TeacherDashboardPage"), "teacher-dashboard-page");
const TeacherStudentsPage = lazyWithRetry(() => import("./pages/TeacherStudentsPage"), "teacher-students-page");
const Login = lazyWithRetry(() => import("./pages/Login"), "login-page");
const Certificates = lazyWithRetry(() => import("./pages/Certificates"), "certificates-page");
const Regulations = lazyWithRetry(() => import("./pages/Regulations"), "regulations-page");
const NotFound = lazyWithRetry(() => import("./pages/NotFound"), "not-found-page");

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

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
                              <Route path="/certificates" element={<RoleGuard allowedRoles={["admin", "manager"]}><Certificates /></RoleGuard>} />
                              <Route path="/regulations" element={<Regulations />} />
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
