/**
 * Form & Modal Input Navigation Utilities
 * 
 * Ensures that pressing Enter inside input fields moves focus to the next
 * input field instead of prematurely submitting or saving the form/modal.
 */

export function handleEnterNavigation(e: KeyboardEvent): void {
  if (e.key !== 'Enter') return;

  const target = e.target as HTMLElement | null;
  if (!target || target.tagName !== 'INPUT') return;

  const input = target as HTMLInputElement;

  // Do not intercept button/checkbox/radio/file controls where Enter has native meaning
  if (
    input.type === 'checkbox' ||
    input.type === 'radio' ||
    input.type === 'button' ||
    input.type === 'submit' ||
    input.type === 'reset' ||
    input.type === 'file'
  ) {
    return;
  }

  // Prevent form submission / save
  e.preventDefault();
  e.stopPropagation();

  // Find container form, schema dialog, or modal dialog
  const container =
    input.closest('form') ||
    input.closest('.schema-modal-dialog') ||
    input.closest('.modal-dialog') ||
    input.closest('.shopify-card') ||
    document.body;

  if (!container) return;

  // Find all focusable input, select, and textarea elements that are enabled and visible
  const focusables = Array.from(
    container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
    )
  ).filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);

  const currentIndex = focusables.indexOf(input);
  if (currentIndex >= 0 && currentIndex < focusables.length - 1) {
    const nextInput = focusables[currentIndex + 1];
    nextInput.focus();
    if (nextInput instanceof HTMLInputElement && typeof nextInput.select === 'function') {
      nextInput.select();
    }
  } else if (currentIndex === focusables.length - 1 && focusables.length > 1) {
    // Loop back to the first input field in this container
    const firstInput = focusables[0];
    firstInput.focus();
    if (firstInput instanceof HTMLInputElement && typeof firstInput.select === 'function') {
      firstInput.select();
    }
  }
}

