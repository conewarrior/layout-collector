import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/auto-icons'],
  manifest: {
    name: 'Layout Collector',
    description: 'Collect and analyze web layouts',
    permissions: ['activeTab', 'scripting', 'storage'],
    side_panel: {
      default_path: 'src/sidepanel/index.html',
    },
  },
});
