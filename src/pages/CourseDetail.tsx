import { useParams, Link, Navigate } from "react-router-dom";
import { courses } from "@/data/courses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
  Target,
  Users,
} from "lucide-react";
import logo from "@/assets/logo.jpeg";

const CourseDetail = () => {
  const { courseId } = useParams();
  const course = courses.find((c) => c.id === courseId);

  if (!course) return <Navigate to="/courses" replace />;

  const otherCourses = courses.filter((c) => c.id !== courseId);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="أكاديمية الحمد" className="h-10 w-10 rounded-lg object-contain" />
            <h1 className="text-lg font-bold text-foreground">أكاديمية الحمد</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/courses">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowRight className="h-4 w-4" />
                كل الدورات
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="sm">تسجيل الدخول</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative h-72 md:h-96">
          <img src={course.image} alt={course.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/50 to-transparent" />
          <div className="absolute bottom-0 right-0 left-0 p-6 md:p-12 text-primary-foreground">
            <div className="container mx-auto">
              <span className="mb-2 inline-block text-4xl">{course.icon}</span>
              <h1 className="mb-2 text-3xl font-bold md:text-5xl">{course.title}</h1>
              <p className="text-lg text-primary-foreground/80">{course.subtitle}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-8 lg:col-span-2">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BookOpen className="h-5 w-5 text-primary" />
                  عن الدورة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-relaxed text-muted-foreground">{course.description}</p>
              </CardContent>
            </Card>

            {/* Levels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Layers className="h-5 w-5 text-primary" />
                  المستويات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {course.levels.map((level, i) => (
                  <div
                    key={level.name}
                    className="flex gap-4 rounded-lg border bg-muted/50 p-4 transition-colors hover:bg-muted"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{level.name}</h4>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Objectives */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Target className="h-5 w-5 text-primary" />
                  أهداف الدورة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {course.objectives.map((obj) => (
                    <li key={obj} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                      <span className="text-muted-foreground">{obj}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card className="border-primary/20 shadow-lg">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-3 text-sm">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">الفئة المستهدفة</p>
                    <p className="text-muted-foreground">{course.targetAudience}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">المدة</p>
                    <p className="text-muted-foreground">{course.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">المستويات</p>
                    <p className="text-muted-foreground">{course.levels.length} مستويات</p>
                  </div>
                </div>
                <Link to="/login" className="block">
                  <Button className="w-full" size="lg">
                    سجّل الآن
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">مميزات الدورة</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {course.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      <span className="text-muted-foreground">{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Other Courses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">دورات أخرى</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {otherCourses.map((c) => (
                  <Link
                    key={c.id}
                    to={`/courses/${c.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                  >
                    <span className="text-xl">{c.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.levels.length} مستويات</p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} أكاديمية الحمد لتعليم القرآن والعلوم الشرعية. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
};

export default CourseDetail;
