/**
 * Custom Measurements Validation
 * Prevents add to cart if custom measurements are required but not filled
 */

class CustomMeasurementsValidator {
  constructor() {
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    const measurementsForm = document.querySelector('.custom-measurements-wrapper');
    if (!measurementsForm) return;

    this.measurementsWrapper = measurementsForm;
    this.requiredInputs = measurementsForm.querySelectorAll('input[required]');
    this.allInputs = measurementsForm.querySelectorAll('input[type="number"]');
    this.productForm = document.querySelector('product-form form[data-type="add-to-cart-form"], form.feature-product-form');
    this.submitButton = document.querySelector('.product-form__submit, .product_submit_button');
    this.errorMessage = measurementsForm.querySelector('.measurements-error');
    
    if (!this.submitButton) return;

    // Move inputs inside the form so they get submitted
    this.moveInputsToForm();

    // Initially check the button state
    this.updateButtonState();
    
    // Listen for input changes
    this.requiredInputs.forEach(input => {
      input.addEventListener('input', () => this.updateButtonState());
      input.addEventListener('change', () => this.updateButtonState());
      input.addEventListener('blur', () => this.validateSingleInput(input));
    });

    // Intercept form submission
    if (this.productForm) {
      this.productForm.addEventListener('submit', (e) => this.handleSubmit(e), true);
    }
    
    // Also intercept the submit button click
    this.submitButton.addEventListener('click', (e) => this.handleButtonClick(e), true);
  }

  moveInputsToForm() {
    // If we found the product form, we need to ensure inputs are inside it
    // We'll create hidden inputs inside the form that mirror the visible ones
    if (!this.productForm) return;

    this.allInputs.forEach(input => {
      const inputName = input.name;
      
      // Check if a hidden input already exists in the form
      let hiddenInput = this.productForm.querySelector(`input[name="${inputName}"][type="hidden"]`);
      
      if (!hiddenInput) {
        // Create a hidden input inside the form
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = inputName;
        hiddenInput.className = 'measurement-hidden-input';
        this.productForm.appendChild(hiddenInput);
      }
      
      // Sync the visible input with the hidden input
      const syncValue = () => {
        hiddenInput.value = input.value;
      };
      
      input.addEventListener('input', syncValue);
      input.addEventListener('change', syncValue);
      
      // Initial sync
      syncValue();
    });
  }

  validateSingleInput(input) {
    const value = parseFloat(input.value);
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const row = input.closest('tr');
    
    if (input.required && (!input.value || input.value.trim() === '' || isNaN(value))) {
      input.classList.add('input-error');
      row?.classList.add('row-error');
      return false;
    }
    
    if (input.value && input.value.trim() !== '' && (value < min || value > max)) {
      input.classList.add('input-error');
      row?.classList.add('row-error');
      return false;
    }
    
    input.classList.remove('input-error');
    row?.classList.remove('row-error');
    return true;
  }

  validateAll() {
    let isValid = true;
    const missingFields = [];
    
    this.requiredInputs.forEach(input => {
      const value = parseFloat(input.value);
      const min = parseFloat(input.min);
      const max = parseFloat(input.max);
      const row = input.closest('tr');
      const label = row?.querySelector('td:first-child')?.textContent?.replace('*', '').trim() || 'Field';
      
      if (!input.value || input.value.trim() === '' || isNaN(value)) {
        isValid = false;
        input.classList.add('input-error');
        row?.classList.add('row-error');
        missingFields.push(label);
      } else if (value < min || value > max) {
        isValid = false;
        input.classList.add('input-error');
        row?.classList.add('row-error');
        missingFields.push(`${label} (must be ${min}-${max})`);
      } else {
        input.classList.remove('input-error');
        row?.classList.remove('row-error');
      }
    });

    return { isValid, missingFields };
  }

  updateButtonState() {
    const { isValid } = this.validateAll();
    
    if (isValid) {
      this.submitButton.classList.remove('measurements-required');
      this.hideError();
    } else {
      this.submitButton.classList.add('measurements-required');
    }
  }

  showError(message) {
    if (this.errorMessage) {
      this.errorMessage.querySelector('span').textContent = message;
      this.errorMessage.classList.add('show');
    }
    
    // Also show a toast notification if available
    if (typeof showToast === 'function') {
      const errorHtml = `
        <div class="form__message error inline-flex align-center">
          <svg width="18" height="18" fill="none" class="flex-auto">
            <g stroke="#D0473E" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.3">
              <path d="M7.977 1.198c.573-.482 1.498-.482 2.054 0l1.293 1.105a1.89 1.89 0 0 0 1.039.376h1.39c.868 0 1.58.712 1.58 1.58v1.39c0 .328.171.786.376 1.031l1.105 1.293c.482.573.482 1.497 0 2.054l-1.105 1.292c-.204.246-.376.704-.376 1.031v1.391c0 .867-.712 1.58-1.58 1.58h-1.39c-.328 0-.786.171-1.031.376L10.039 16.8c-.573.483-1.497.483-2.054 0l-1.292-1.104c-.246-.205-.712-.377-1.031-.377H4.23c-.867 0-1.58-.712-1.58-1.579v-1.399c0-.319-.163-.785-.367-1.023l-1.105-1.3c-.474-.565-.474-1.481 0-2.046l1.105-1.3c.204-.246.368-.705.368-1.024V4.267c0-.868.712-1.58 1.579-1.58h1.415c.328 0 .786-.171 1.031-.376l1.301-1.113ZM7 11l4-4M11 11 7 7"/>
            </g>
          </svg>
          <span class="ml-5">${message}</span>
        </div>
      `;
      showToast(errorHtml, 5000, 'modal-error');
    }
    
    // Scroll to measurements section
    this.measurementsWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  hideError() {
    if (this.errorMessage) {
      this.errorMessage.classList.remove('show');
    }
  }

  handleButtonClick(e) {
    const { isValid, missingFields } = this.validateAll();
    
    if (!isValid) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      const message = missingFields.length > 3 
        ? `Please fill in all required measurements (${missingFields.length} fields missing)`
        : `Please fill in: ${missingFields.join(', ')}`;
      
      this.showError(message);
      return false;
    }
    
    // Sync all values one more time before submission
    this.syncAllValues();
  }

  handleSubmit(e) {
    const { isValid, missingFields } = this.validateAll();
    
    if (!isValid) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      const message = missingFields.length > 3 
        ? `Please fill in all required measurements (${missingFields.length} fields missing)`
        : `Please fill in: ${missingFields.join(', ')}`;
      
      this.showError(message);
      return false;
    }
    
    // Sync all values one more time before submission
    this.syncAllValues();
  }

  syncAllValues() {
    // Sync all visible input values to their hidden counterparts
    if (!this.productForm) return;
    
    this.allInputs.forEach(input => {
      const inputName = input.name;
      const hiddenInput = this.productForm.querySelector(`input[name="${inputName}"][type="hidden"]`);
      if (hiddenInput) {
        hiddenInput.value = input.value;
      }
    });
  }
}

// Initialize when the script loads
new CustomMeasurementsValidator();

// Re-initialize on dynamic content changes (for AJAX-loaded content)
document.addEventListener('shopify:section:load', () => {
  new CustomMeasurementsValidator();
});
