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

// Start
new CustomMeasurementsValidator();

document.addEventListener('shopify:section:load', () => {
  new CustomMeasurementsValidator();
});
