import { Link } from "react-router-dom";
import { courses } from "@/data/courses";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, GraduationCap, Star } from "lucide-react";
import logo from "@/assets/logo.jpeg";

const Courses = () => {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="أكاديمية الحمد" className="h-10 w-10 rounded-lg object-contain" />
            <div>
              <h1 className="text-lg font-bold text-foreground">أكاديمية الحمد</h1>
              <p className="text-[10px] text-muted-foreground">لتعليم القرآن والعلوم الشرعية</p>
            </div>
          </div>
          <Link to="/login">
            <Button variant="outline" size="sm">تسجيل الدخول</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary px-4 py-20 text-primary-foreground">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary-foreground blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-primary-foreground blur-3xl" />
        </div>
        <div className="container relative mx-auto text-center">
          <Badge className="mb-4 bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30">
            <Star className="mr-1 h-3 w-3" /> تعليم احترافي عن بُعد
          </Badge>
          <h1 className="mb-4 text-4xl font-bold leading-tight md:text-5xl">
            مساراتنا التعليمية
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-primary-foreground/80">
            رحلة تعليمية متكاملة مع معلمين ومعلمات متخصصين — اختر المسار الذي يناسبك وابدأ رحلتك
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/70">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <span>4 مسارات تعليمية</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              <span>معلمون معتمدون</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              <span>حصص فردية</span>
            </div>
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-2">
          {courses.map((course, i) => (
            <Link key={course.id} to={`/courses/${course.id}`}>
              <Card className="group h-full overflow-hidden border-none shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={course.image}
                    alt={course.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
                  <div className="absolute bottom-4 right-4 text-primary-foreground">
                    <p className="text-sm font-medium opacity-90">{course.subtitle}</p>
                    <h3 className="text-2xl font-bold">{course.title}</h3>
                  </div>
                  <span className="absolute left-4 top-4 text-3xl">{course.icon}</span>
                </div>
                <CardContent className="p-5">
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    {course.description}
                  </p>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {course.levels.map((level) => (
                      <Badge key={level.name} variant="secondary" className="text-xs">
                        {level.name}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{course.targetAudience}</span>
                    <Button variant="ghost" size="sm" className="gap-1 text-primary">
                      التفاصيل
                      <ArrowLeft className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted px-4 py-16">
        <div className="container mx-auto text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">ابدأ رحلتك الآن</h2>
          <p className="mx-auto mb-6 max-w-lg text-muted-foreground">
            احجز حصة تجريبية مجانية وتعرّف على أسلوبنا التعليمي
          </p>
          <Link to="/login">
            <Button size="lg" className="gap-2">
              <GraduationCap className="h-5 w-5" />
              سجّل الآن
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} أكاديمية الحمد لتعليم القرآن والعلوم الشرعية. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
};

export default Courses;
