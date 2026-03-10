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

  /**
   * Disable hidden line-item property inputs for any measurement
   * field that has no value. This prevents empty properties like
   * "Shoulder (in)" with no value from showing in the order view.
   */
  disableEmptyHiddenInputs() {
    if (!this.productForm) return;

    this.allInputs.forEach((input) => {
      const hidden = input.hiddenInput;
      if (!hidden) return;

      const val = (input.value || '').trim();

      if (!val) {
        // Do not send this property with the form submission.
        hidden.disabled = true;
      } else {
        hidden.disabled = false;
      }
    });
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

    // Only send non-empty measurement properties to Shopify
    // so they appear on the order page only when filled.
    this.disableEmptyHiddenInputs();
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
    Array.from(scope.querySelectorAll('input[type="radio"][name]'));

  // Try to detect which option group is the "size" group:
  // - Prefer the group that contains the radio marked data-custom-size="true".
  // - Fallback: use all radios if we can't determine the group.
  const getSizeRadios = () => {
    const allRadios = getAllRadios();
    if (!allRadios.length) return [];

    const markedCustom = allRadios.find(
      (r) => r.dataset && r.dataset.customSize === 'true'
    );

    if (!markedCustom) {
      return allRadios;
    }

    const sizeName = markedCustom.name;
    return allRadios.filter((r) => r.name === sizeName);
  };

  const isCustomRadio = (radio) => {
    if (!radio) return false;

    // 1) Explicit data attribute from Liquid (language agnostic).
    if (radio.dataset.customSize === 'true') return true;

    // 2) Fallback: value contains "custom" (for English stores).
    const value = (radio.value || '').toLowerCase().trim();
    if (value.includes('custom')) return true;

    // 3) Fallback: label text contains a known keyword (English + Arabic).
    const label = scope.querySelector(`label[for="${radio.id}"]`);
    const labelText = (label?.textContent || '').toLowerCase();
    const customKeywords = ['custom', 'مخصص', 'تفصيل'];

    return customKeywords.some((keyword) => labelText.includes(keyword));
  };

  const isCustomSelected = () => {
    const radios = getSizeRadios();
    if (!radios.length) return false;

    const checked = radios.find((r) => r.checked);
    if (!checked) return false;

    return isCustomRadio(checked);
  };

  /**
   * Create 2 tabs on the Size option group:
   * - Standard Sizing: show all sizes except Custom
   * - Custom Sizing: show only Custom size
   */
  const initSizingTabs = () => {
    const sizeRadios = getSizeRadios();
    if (!sizeRadios.length) return;

    // Find a stable container to insert tabs into (fieldset that wraps the size radios).
    const firstRadio = sizeRadios[0];
    const fieldset = firstRadio.closest('fieldset');
    if (!fieldset) return;

    // Avoid double-init if Shopify re-renders.
    if (fieldset.dataset.sizingTabsBound === 'true') return;

    const customRadios = sizeRadios.filter(isCustomRadio);
    const standardRadios = sizeRadios.filter((r) => !isCustomRadio(r));
    if (!customRadios.length || !standardRadios.length) return; // nothing to split

    const labelRow = fieldset.querySelector('.form__label');

    // Units to move (supports both: plain input+label, or <swatch-dropdown-item> wrappers)
    const getUnitForRadio = (radio) => {
      const dropdownItem = radio.closest('swatch-dropdown-item');
      if (dropdownItem) return dropdownItem;

      const unit = document.createElement('div');
      unit.className = 'sizing-option-unit';

      const label = fieldset.querySelector(`label[for="${radio.id}"]`);
      unit.appendChild(radio);
      if (label) unit.appendChild(label);
      return unit;
    };

    // Build containers
    const tabs = document.createElement('div');
    tabs.className = 'sizing-track-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Sizing track');

    const btnStandard = document.createElement('button');
    btnStandard.type = 'button';
    btnStandard.className = 'sizing-track-tab is-active';
    btnStandard.setAttribute('role', 'tab');
    btnStandard.setAttribute('aria-selected', 'true');
    btnStandard.dataset.track = 'standard';
    btnStandard.textContent = 'Standard Sizing';

    const btnCustom = document.createElement('button');
    btnCustom.type = 'button';
    btnCustom.className = 'sizing-track-tab';
    btnCustom.setAttribute('role', 'tab');
    btnCustom.setAttribute('aria-selected', 'false');
    btnCustom.dataset.track = 'custom';
    btnCustom.textContent = 'Custom Sizing';

    tabs.appendChild(btnStandard);
    tabs.appendChild(btnCustom);

    const standardWrap = document.createElement('div');
    standardWrap.className = 'sizing-track-panel sizing-track-panel--standard';
    standardWrap.dataset.sizingTrackPanel = 'standard';

    const customWrap = document.createElement('div');
    customWrap.className = 'sizing-track-panel sizing-track-panel--custom';
    customWrap.dataset.sizingTrackPanel = 'custom';
    customWrap.style.display = 'none';

    // Move options into the correct panel
    standardRadios.forEach((r) => standardWrap.appendChild(getUnitForRadio(r)));
    customRadios.forEach((r) => customWrap.appendChild(getUnitForRadio(r)));

    // Insert into DOM (after option label row when possible)
    if (labelRow && labelRow.parentNode === fieldset) {
      labelRow.insertAdjacentElement('afterend', tabs);
      tabs.insertAdjacentElement('afterend', standardWrap);
      standardWrap.insertAdjacentElement('afterend', customWrap);
    } else {
      fieldset.prepend(customWrap);
      fieldset.prepend(standardWrap);
      fieldset.prepend(tabs);
    }

    const setActiveTrack = (track) => {
      const isCustomTrack = track === 'custom';
      btnStandard.classList.toggle('is-active', !isCustomTrack);
      btnCustom.classList.toggle('is-active', isCustomTrack);
      btnStandard.setAttribute('aria-selected', (!isCustomTrack).toString());
      btnCustom.setAttribute('aria-selected', isCustomTrack.toString());
      standardWrap.style.display = isCustomTrack ? 'none' : '';
      customWrap.style.display = isCustomTrack ? '' : 'none';

      // Ensure a visible radio is selected (variant system needs a checked value)
      const visibleRadios = isCustomTrack ? customRadios : standardRadios;
      const currentlyChecked = sizeRadios.find((r) => r.checked);
      const checkedIsVisible = currentlyChecked && visibleRadios.includes(currentlyChecked);
      if (!checkedIsVisible && visibleRadios.length) {
        visibleRadios[0].checked = true;
        visibleRadios[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    // Default track based on current selection
    setActiveTrack(isCustomSelected() ? 'custom' : 'standard');

    tabs.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const track = target.dataset.track;
      if (!track) return;
      setActiveTrack(track);
    });

    fieldset.dataset.sizingTabsBound = 'true';
  };

  /**
   * Update measurement table visibility + required fields based on sizing track.
   *
   * - Standard sizing: show Length only, require Length only
   * - Custom sizing: show all rows, require all 5 fields
   */
  const applyVisibility = () => {
    const isCustom = isCustomSelected();

    // Measurement block should always be visible (Length required for both tracks)
    wrapper.style.display = 'block';

    // Show/hide measurement rows based on their role
    const rows = wrapper.querySelectorAll('tr[data-measurement-role]');
    rows.forEach((row) => {
      const role = row.dataset.measurementRole;
      const isLengthRow = role === 'length';
      row.style.display = isCustom || isLengthRow ? '' : 'none';
    });

    // Required fields in inches:
    // - Length always required
    // - Other fields required only in custom sizing
    const inputs = wrapper.querySelectorAll('input[type="text"][data-measurement-role]');
    inputs.forEach((input) => {
      const role = input.dataset.measurementRole;
      const isLength = role === 'length';

      if (isLength) {
        input.setAttribute('required', '');
      } else if (isCustom) {
        input.setAttribute('required', '');
      } else {
        input.removeAttribute('required');
        input.classList.remove('input-error');
      }
    });

    const error = wrapper.querySelector('.measurements-error');
    error?.classList.remove('show');
  };

  // Avoid attaching multiple listeners on repeated init (section load, etc.)
  if (!document.documentElement.dataset.customMeasurementsToggleBound) {
    document.addEventListener('change', (e) => {
      const target = e.target;
      if (!target || target.type !== 'radio') return;

      // Only react if this radio belongs to the same option group as the custom size.
      const sizeRadios = getSizeRadios();
      if (!sizeRadios.length) return;
      if (!sizeRadios.includes(target)) return;

      applyVisibility();
    });
    document.documentElement.dataset.customMeasurementsToggleBound = 'true';
  }

  initSizingTabs();
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
