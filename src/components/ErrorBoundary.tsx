import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isLazyImportError } from "@/lib/lazyWithRetry";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    if (this.state.error && isLazyImportError(this.state.error)) {
      window.location.reload();
      return;
    }

    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const shouldReloadPage = this.state.error && isLazyImportError(this.state.error);

      return (
        <div className="min-h-[40vh] flex items-center justify-center p-6">
          <Card className="max-w-md w-full border-destructive/30">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  حدث خطأ غير متوقع
                </h3>
                <p className="text-sm text-muted-foreground">
                  نأسف، حدث خطأ أثناء تحميل هذا القسم. يرجى المحاولة مرة أخرى.
                </p>
              </div>
              {this.state.error && (
                <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3 w-full font-mono break-all">
                  {this.state.error.message}
                </p>
              )}
              <Button onClick={this.handleReset} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {shouldReloadPage ? "إعادة تحميل الصفحة" : "إعادة المحاولة"}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
