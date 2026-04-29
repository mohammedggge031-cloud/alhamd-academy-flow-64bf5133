import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const legacySupabaseUrl = "https://xoymllyfwvbnbxsbbinu.supabase.co";
  const externalSupabaseUrl = env.VITE_EXTERNAL_SUPABASE_URL || "https://euwotooilvdahnuovvzr.supabase.co";
  const externalProjectId = env.VITE_EXTERNAL_SUPABASE_PROJECT_ID || "euwotooilvdahnuovvzr";
  const externalPublishableKey = env.VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY || "";
  const envSupabaseUrl = env.VITE_SUPABASE_URL || "";
  const envPublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  const hasExternalPublishableKey = externalPublishableKey.length > 0;
  const shouldUseExternalSupabase =
    envSupabaseUrl === externalSupabaseUrl || ((!envSupabaseUrl || envSupabaseUrl === legacySupabaseUrl) && hasExternalPublishableKey);
  const supabaseUrl = shouldUseExternalSupabase ? externalSupabaseUrl : envSupabaseUrl;
  const publishableKey = shouldUseExternalSupabase ? externalPublishableKey : envPublishableKey;
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
