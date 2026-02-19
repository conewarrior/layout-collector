import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/auto-icons'],
  manifest: {
    name: 'Layout Collector',
    description: 'Capture screenshots, metadata, and categorize web page layouts. Save to Supabase and browse your design reference gallery.',
    permissions: ['activeTab', 'scripting', 'storage', 'sidePanel'],
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
});
