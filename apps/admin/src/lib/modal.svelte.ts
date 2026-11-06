// Global reactive modal confirmation and alert state for Svelte 5

export interface ModalConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning' | 'info';
}

export interface ModalAlertOptions {
  title?: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'primary' | 'warning' | 'info';
}

class ModalStore {
  isOpen = $state(false);
  title = $state('');
  message = $state('');
  confirmText = $state('Confirm');
  cancelText = $state('Cancel');
  variant = $state<'danger' | 'primary' | 'warning' | 'info'>('danger');
  isAlert = $state(false);

  private resolveFn: ((value: boolean) => void) | null = null;

  confirm(options: ModalConfirmOptions): Promise<boolean> {
    this.title = options.title;
    this.message = options.message;
    this.confirmText = options.confirmText ?? 'Confirm';
    this.cancelText = options.cancelText ?? 'Cancel';
    this.variant = options.variant ?? 'danger';
    this.isAlert = false;
    this.isOpen = true;

    return new Promise((resolve) => {
      this.resolveFn = resolve;
    });
  }

  alert(messageOrOptions: string | ModalAlertOptions): Promise<void> {
    if (typeof messageOrOptions === 'string') {
      this.title = 'Notice';
      this.message = messageOrOptions;
      this.confirmText = 'OK';
      this.variant = 'info';
    } else {
      this.title = messageOrOptions.title ?? 'Notice';
      this.message = messageOrOptions.message;
      this.confirmText = messageOrOptions.confirmText ?? 'OK';
      this.variant = messageOrOptions.variant ?? 'info';
    }
    this.cancelText = '';
    this.isAlert = true;
    this.isOpen = true;

    return new Promise((resolve) => {
      this.resolveFn = () => resolve();
    });
  }

  handleConfirm() {
    this.isOpen = false;
    this.resolveFn?.(true);
    this.resolveFn = null;
  }

  handleCancel() {
    this.isOpen = false;
    this.resolveFn?.(false);
    this.resolveFn = null;
  }
}

export const modal = new ModalStore();
