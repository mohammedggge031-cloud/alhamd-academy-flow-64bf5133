import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const legacySupabaseUrl = "https://xoymllyfwvbnbxsbbinu.supabase.co";
  const externalSupabaseUrl = "https://euwotooilvdahnuovvzr.supabase.co";
  const externalProjectId = "euwotooilvdahnuovvzr";
  const externalPublishableKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1d290b29pbHZkYWhudW92dnpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg4Mjk3OCwiZXhwIjoyMDg5NDU4OTc4fQ.VnBTv230SDxKxvUXw3MtZU_Kmi6Qw7k85vda0X89bjw";
  const envSupabaseUrl = env.VITE_SUPABASE_URL || "";
  const shouldUseExternalSupabase = !envSupabaseUrl || envSupabaseUrl === legacySupabaseUrl;
  const supabaseUrl = shouldUseExternalSupabase ? externalSupabaseUrl : envSupabaseUrl;
  const publishableKey = shouldUseExternalSupabase
    ? externalPublishableKey
    : env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || externalPublishableKey;
  const projectId = shouldUseExternalSupabase
    ? externalProjectId
    : env.VITE_SUPABASE_PROJECT_ID || externalProjectId;

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publishableKey),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(projectId),
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-popover',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
            ],
            'vendor-charts': ['recharts'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-date': ['date-fns'],
            'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'vendor-xlsx': ['xlsx'],
            'vendor-html2img': ['html-to-image'],
          },
        },
      },
      chunkSizeWarningLimit: 400,
      minify: 'esbuild',
    },
  };
});
