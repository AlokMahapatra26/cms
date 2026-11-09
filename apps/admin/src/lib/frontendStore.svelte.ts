const FRONTEND_ENABLED_KEY = 'edgecms_frontend_website_enabled';

class FrontendStore {
  enabled = $state(false);

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(FRONTEND_ENABLED_KEY);
      this.enabled = saved === 'true';
    }
  }

  toggle(enable?: boolean) {
    this.enabled = enable !== undefined ? enable : !this.enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem(FRONTEND_ENABLED_KEY, String(this.enabled));
    }
  }
}

export const frontendStore = new FrontendStore();

