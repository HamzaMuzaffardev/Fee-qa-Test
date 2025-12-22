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
      // Small delay to ensure all elements are rendered
      setTimeout(() => this.setup(), 100);
    }
  }

  setup() {
    const measurementsForm = document.querySelector('.custom-measurements-wrapper');
    if (!measurementsForm) {
      console.log('Custom measurements: No measurement form found');
      return;
    }

    this.measurementsWrapper = measurementsForm;
    this.requiredInputs = measurementsForm.querySelectorAll('input[required]');
    this.allInputs = measurementsForm.querySelectorAll('input[type="number"]');
    
    // Try multiple selectors to find the product form
    this.productForm = document.querySelector('product-form form') || 
                       document.querySelector('form[data-type="add-to-cart-form"]') ||
                       document.querySelector('form.feature-product-form') ||
                       document.querySelector('.product__submit-form form');
    
    this.submitButton = document.querySelector('.product-form__submit') || 
                        document.querySelector('.product_submit_button') ||
                        document.querySelector('button[name="add"]');
    
    this.errorMessage = measurementsForm.querySelector('.measurements-error');
    
    console.log('Custom measurements initialized:', {
      wrapper: !!this.measurementsWrapper,
      requiredInputs: this.requiredInputs.length,
      allInputs: this.allInputs.length,
      productForm: !!this.productForm,
      submitButton: !!this.submitButton
    });

    if (!this.submitButton) {
      console.log('Custom measurements: No submit button found');
      return;
    }

    // Move inputs inside the form so they get submitted
    this.moveInputsToForm();

    // Initially check the button state
    this.updateButtonState();
    
    // Listen for input changes on ALL inputs (not just required)
    this.allInputs.forEach(input => {
      input.addEventListener('input', () => {
        this.updateButtonState();
        this.syncSingleValue(input);
      });
      input.addEventListener('change', () => {
        this.updateButtonState();
        this.syncSingleValue(input);
      });
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
    if (!this.productForm) {
      console.log('Custom measurements: Cannot move inputs - no form found');
      return;
    }

    console.log('Custom measurements: Moving inputs to form');

    this.allInputs.forEach(input => {
      const inputName = input.name;
      
      // Check if a hidden input already exists in the form
      let hiddenInput = this.productForm.querySelector(`input.measurement-hidden-input[data-measurement-name="${inputName}"]`);
      
      if (!hiddenInput) {
        // Create a hidden input inside the form
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = inputName;
        hiddenInput.className = 'measurement-hidden-input';
        hiddenInput.setAttribute('data-measurement-name', inputName);
        this.productForm.appendChild(hiddenInput);
        console.log('Custom measurements: Created hidden input for', inputName);
      }
      
      // Store reference to hidden input on the visible input
      input._hiddenInput = hiddenInput;
      
      // Initial sync
      hiddenInput.value = input.value;
    });
  }

  syncSingleValue(input) {
    if (input._hiddenInput) {
      input._hiddenInput.value = input.value;
    }
  }

  validateSingleInput(input) {
    const value = parseFloat(input.value);
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const row = input.closest('tr');
    
    // Check if empty and required
    if (input.required && (!input.value || input.value.trim() === '')) {
      input.classList.add('input-error');
      row?.classList.add('row-error');
      return false;
    }
    
    // Check if value is a valid number
    if (input.value && input.value.trim() !== '' && isNaN(value)) {
      input.classList.add('input-error');
      row?.classList.add('row-error');
      return false;
    }
    
    // Check if value is within range
    if (input.value && input.value.trim() !== '' && !isNaN(value) && (value < min || value > max)) {
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
      const rawValue = input.value;
      const value = parseFloat(rawValue);
      const min = parseFloat(input.min);
      const max = parseFloat(input.max);
      const row = input.closest('tr');
      const label = row?.querySelector('td:first-child')?.textContent?.replace('*', '').trim() || 'Field';
      
      // Check if empty
      if (!rawValue || rawValue.trim() === '') {
        isValid = false;
        input.classList.add('input-error');
        row?.classList.add('row-error');
        missingFields.push(label);
        return;
      }
      
      // Check if not a valid number
      if (isNaN(value)) {
        isValid = false;
        input.classList.add('input-error');
        row?.classList.add('row-error');
        missingFields.push(`${label} (enter a number)`);
        return;
      }
      
      // Check range
      if (value < min || value > max) {
        isValid = false;
        input.classList.add('input-error');
        row?.classList.add('row-error');
        missingFields.push(`${label} (${min}-${max})`);
        return;
      }
      
      input.classList.remove('input-error');
      row?.classList.remove('row-error');
    });

    console.log('Custom measurements validation:', { isValid, missingFields });
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
      const span = this.errorMessage.querySelector('span');
      if (span) span.textContent = message;
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
    // Sync all values first
    this.syncAllValues();
    
    const { isValid, missingFields } = this.validateAll();
    
    console.log('Custom measurements: Button clicked, valid:', isValid);
    
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
  }

  handleSubmit(e) {
    // Sync all values first
    this.syncAllValues();
    
    const { isValid, missingFields } = this.validateAll();
    
    console.log('Custom measurements: Form submitted, valid:', isValid);
    
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
  }

  syncAllValues() {
    // Sync all visible input values to their hidden counterparts
    this.allInputs.forEach(input => {
      if (input._hiddenInput) {
        input._hiddenInput.value = input.value;
        console.log('Custom measurements: Synced', input.name, '=', input.value);
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
