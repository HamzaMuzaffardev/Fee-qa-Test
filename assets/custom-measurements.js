/**
 * Custom Measurements - Simple Validation
 * Just checks if required fields have values
 */

class CustomMeasurementsValidator {
  constructor() {
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      setTimeout(() => this.setup(), 100);
    }
  }

  setup() {
    const measurementsForm = document.querySelector('.custom-measurements-wrapper');
    if (!measurementsForm) return;

    this.measurementsWrapper = measurementsForm;
    this.requiredInputs = measurementsForm.querySelectorAll('input[required]');
    this.allInputs = measurementsForm.querySelectorAll('input[type="text"]');
    
    // Find the product form
    this.productForm = document.querySelector('product-form form') || 
                       document.querySelector('form[data-type="add-to-cart-form"]');
    
    // Find submit button
    this.submitButton = document.querySelector('.product-form__submit') || 
                        document.querySelector('.product_submit_button') ||
                        document.querySelector('button[name="add"]');
    
    this.errorMessage = measurementsForm.querySelector('.measurements-error');

    if (!this.submitButton) return;

    // Create hidden inputs in the form
    this.createHiddenInputs();

    // Check initial state
    this.checkFields();
    
    // Listen for changes
    this.allInputs.forEach(input => {
      input.addEventListener('input', () => {
        this.syncValue(input);
        this.checkFields();
      });
      input.addEventListener('change', () => {
        this.syncValue(input);
        this.checkFields();
      });
    });

    // Block submit if not valid
    this.submitButton.addEventListener('click', (e) => this.onSubmit(e), true);
    if (this.productForm) {
      this.productForm.addEventListener('submit', (e) => this.onSubmit(e), true);
    }
  }

  createHiddenInputs() {
    if (!this.productForm) return;

    this.allInputs.forEach(input => {
      const name = input.name;
      let hidden = this.productForm.querySelector(`input[type="hidden"][name="${name}"]`);
      
      if (!hidden) {
        hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = name;
        this.productForm.appendChild(hidden);
      }
      
      input.hiddenInput = hidden;
      hidden.value = input.value || '';
    });
  }

  syncValue(input) {
    if (input.hiddenInput) {
      input.hiddenInput.value = input.value || '';
    }
  }

  syncAllValues() {
    this.allInputs.forEach(input => this.syncValue(input));
  }

  checkFields() {
    // If the measurements UI is hidden, do not block add-to-cart.
    if (
      !this.measurementsWrapper ||
      this.measurementsWrapper.style.display === 'none' ||
      this.measurementsWrapper.hasAttribute('hidden')
    ) {
      this.hideError();
      this.submitButton?.classList.remove('measurements-required');
      return { valid: true, emptyCount: 0 };
    }

    // Re-query required inputs in case required attributes were toggled.
    this.requiredInputs = this.measurementsWrapper.querySelectorAll('input[required]');

    let allFilled = true;
    let emptyCount = 0;

    this.requiredInputs.forEach(input => {
      const val = input.value;
      const row = input.closest('tr');
      
      // Just check if there's any value
      if (!val || val === '') {
        allFilled = false;
        emptyCount++;
        input.classList.add('input-error');
        row?.classList.add('row-error');
      } else {
        input.classList.remove('input-error');
        row?.classList.remove('row-error');
      }
    });

    if (allFilled) {
      this.hideError();
      this.submitButton.classList.remove('measurements-required');
    } else {
      this.submitButton.classList.add('measurements-required');
    }

    return { valid: allFilled, emptyCount };
  }

  showError(count) {
    const msg = `Please fill in all required measurements (${count} fields missing)`;
    
    if (this.errorMessage) {
      const span = this.errorMessage.querySelector('span');
      if (span) span.textContent = msg;
      this.errorMessage.classList.add('show');
    }
    
    if (typeof showToast === 'function') {
      showToast(`<div class="form__message error"><span>${msg}</span></div>`, 4000, 'modal-error');
    }

    this.measurementsWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  hideError() {
    if (this.errorMessage) {
      this.errorMessage.classList.remove('show');
    }
  }

  onSubmit(e) {
    this.syncAllValues();
    const { valid, emptyCount } = this.checkFields();

    if (!valid) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.showError(emptyCount);
      return false;
    }
  }
}

/**
 * Custom Measurements - Visibility Toggle
 * Shows measurement table only when "Custom" size is selected.
 *
 * IMPORTANT:
 * - Do NOT depend on hard-coded Shopify section element IDs (they change).
 * - Use event delegation so it keeps working after Shopify re-renders variant pickers.
 */
function initCustomMeasurementsToggle() {
  const wrapper = document.querySelector('.custom-measurements-wrapper');
  if (!wrapper) return;

  // Scope to the current product section when possible (prevents collisions on pages with multiple products).
  const scope = wrapper.closest('[id^="MainProduct-"]') || document;

  const getAllRadios = () =>
    scope.querySelectorAll('input[type="radio"][name]');

  const isCustomSelected = () => {
    // Prefer explicit "custom size" markers added in Liquid (language agnostic).
    const markedCustomRadios = scope.querySelectorAll(
      'input[type="radio"][data-custom-size="true"]'
    );
    const markedChecked = Array.from(markedCustomRadios).some((r) => r.checked);
    if (markedChecked) return true;

    // Fallback: look for a checked radio whose value contains "custom" (for stores
    // that still use English values and don't use the data attribute).
    const radios = Array.from(getAllRadios());
    const checked = radios.find((r) => r.checked);
    const value = (checked?.value || '').trim();
    return /custom/i.test(value);
  };

  const setRequiredEnabled = (enabled) => {
    const requiredInputs = wrapper.querySelectorAll('input[type="text"]');
    requiredInputs.forEach((input) => {
      const wasRequired = input.hasAttribute('required') || input.dataset.wasRequired === 'true';

      if (enabled) {
        if (input.dataset.wasRequired === 'true') input.setAttribute('required', '');
      } else {
        // Preserve which inputs were required originally so we can restore.
        if (input.hasAttribute('required')) input.dataset.wasRequired = 'true';
        else if (!input.dataset.wasRequired) input.dataset.wasRequired = wasRequired ? 'true' : 'false';
        input.removeAttribute('required');
        input.classList.remove('input-error');
      }
    });

    const error = wrapper.querySelector('.measurements-error');
    error?.classList.remove('show');
  };

  const applyVisibility = () => {
    const show = isCustomSelected();
    wrapper.style.display = show ? 'block' : 'none';
    setRequiredEnabled(show);
  };

  // Avoid attaching multiple listeners on repeated init (section load, etc.)
  if (!document.documentElement.dataset.customMeasurementsToggleBound) {
    document.addEventListener('change', (e) => {
      const target = e.target;
      if (!target || target.type !== 'radio') return;
      applyVisibility();
    });
    document.documentElement.dataset.customMeasurementsToggleBound = 'true';
  }

  applyVisibility();
}

// Start (validator + toggle)
function initCustomMeasurements() {
  new CustomMeasurementsValidator();
  initCustomMeasurementsToggle();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomMeasurements);
} else {
  setTimeout(initCustomMeasurements, 0);
}

// Re-init when Shopify dynamically reloads sections (theme editor / OS2).
document.addEventListener('shopify:section:load', () => {
  initCustomMeasurements();
});
