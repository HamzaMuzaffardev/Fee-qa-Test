if (!customElements.get('product-model')) {
  customElements.define(
    'product-model',
    class ProductModel extends DeferredMedia {
      constructor() {
        super();
      }

      loadContent() {
        super.loadContent();

        Shopify.loadFeatures([
          {
            name: 'model-viewer-ui',
            version: '1.0',
            onLoad: this.setupModelViewerUI.bind(this),
          },
        ]);
      }

      setupModelViewerUI(errors) {
        if (errors) return;

        this.modelViewerUI = new Shopify.ModelViewerUI(this.querySelector('model-viewer'));
      }
    }
  );
}

window.ProductModel = {
  loadShopifyXR() {
    Shopify.loadFeatures([
      {
        name: 'shopify-xr',
        version: '1.0',
        onLoad: this.setupShopifyXR.bind(this),
      },
    ]);
  },

  setupShopifyXR(errors) {
    if (errors) return;

    if (!window.ShopifyXR) {
      document.addEventListener('shopify_xr_initialized', () => this.setupShopifyXR());
      return;
    }

    document.querySelectorAll('[id^="ProductJSON-"]').forEach((modelJSON) => {
      window.ShopifyXR.addModels(JSON.parse(modelJSON.textContent));
      modelJSON.remove();
    });
    window.ShopifyXR.setupXRElements();
  },
};

window.addEventListener('DOMContentLoaded', () => {
  if (window.ProductModel) window.ProductModel.loadShopifyXR();
});


// 
const initCustomMeasurementToggle = () => {
    const customRadio = document.getElementById('template--20069970641093__main-2-0');
    const measurementWrapper = document.querySelector('.custom-measurements-wrapper');
    // Using a more generic selector for Shopify size radios
    const allSizeRadios = document.querySelectorAll('input[name="options[Size]"], input[name="Size"]');

    if (customRadio && measurementWrapper) {
        const handleVisibility = () => {
            measurementWrapper.style.display = customRadio.checked ? 'block' : 'none';
        };

        // Attach listeners
        allSizeRadios.forEach(radio => {
            radio.addEventListener('change', handleVisibility);
        });

        // Run immediately
        handleVisibility();
    }
};

// This handles the timing issue
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomMeasurementToggle);
} else {
    // If the page is already "ready" (common in fast themes), run it now
    initCustomMeasurementToggle();
}

// Optional: Re-run if your theme uses dynamic section loading (like Dawn/Online Store 2.0)
document.addEventListener('shopify:section:load', initCustomMeasurementToggle);