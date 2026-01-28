/**
 * Send Gift toggle
 * - Shows gift fields when "Send as a gift" checkbox is checked
 * - Hides and clears fields when unchecked
 */
(() => {
  function setRequired(inputs, required) {
    inputs.forEach((el) => {
      if (!el) return;
      if (required) el.setAttribute('required', 'required');
      else el.removeAttribute('required');
    });
  }

  function clearValues(inputs) {
    inputs.forEach((el) => {
      if (!el) return;
      el.value = '';
    });
  }

  function applyState(wrapper) {
    const toggle = wrapper.querySelector('[data-send-gift-toggle]');
    const fields = wrapper.querySelector('[data-gift-fields-container]');
    if (!toggle || !fields) return;

    const requiredInputs = fields.querySelectorAll('[data-gift-required]');
    const allInputs = fields.querySelectorAll('input, textarea, select');

    const shouldShow = toggle.checked;
    fields.classList.toggle('hidden', !shouldShow);
    fields.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');

    setRequired(Array.from(requiredInputs), shouldShow);
    if (!shouldShow) {
      clearValues(Array.from(allInputs));
    }
  }

  function bind(wrapper) {
    const toggle = wrapper.querySelector('[data-send-gift-toggle]');
    if (!toggle) return;

    toggle.addEventListener('change', () => applyState(wrapper));
    applyState(wrapper);
  }

  function init() {
    document
      .querySelectorAll('[data-send-gift-wrapper]')
      .forEach((wrapper) => bind(wrapper));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', init);
})();

