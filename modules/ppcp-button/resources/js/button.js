import MiniCartBootstap from './modules/ContextBootstrap/MiniCartBootstap';
import SingleProductBootstap from './modules/ContextBootstrap/SingleProductBootstap';
import CartBootstrap from './modules/ContextBootstrap/CartBootstap';
import CheckoutBootstap from './modules/ContextBootstrap/CheckoutBootstap';
import PayNowBootstrap from "./modules/ContextBootstrap/PayNowBootstrap";
import Renderer from './modules/Renderer/Renderer';
import ErrorHandler from './modules/ErrorHandler';
import CreditCardRenderer from "./modules/Renderer/CreditCardRenderer";
import dataClientIdAttributeHandler from "./modules/DataClientIdAttributeHandler";
import MessageRenderer from "./modules/Renderer/MessageRenderer";
import Spinner from "./modules/Helper/Spinner";
import {
    getCurrentPaymentMethod,
    ORDER_BUTTON_SELECTOR,
    PaymentMethods
} from "./modules/Helper/CheckoutMethodState";
import {hide, setVisible} from "./modules/Helper/Hiding";

const buttonsSpinner = new Spinner('.place-order');

const bootstrap = () => {
    const errorHandler = new ErrorHandler(PayPalCommerceGateway.labels.error.generic);
    const spinner = new Spinner();
    const creditCardRenderer = new CreditCardRenderer(PayPalCommerceGateway, errorHandler, spinner);
    const onSmartButtonClick = data => {
        window.ppcpFundingSource = data.fundingSource;
    };
    const onSmartButtonsInit = () => {
        buttonsSpinner.unblock();
    };
    const renderer = new Renderer(creditCardRenderer, PayPalCommerceGateway, onSmartButtonClick, onSmartButtonsInit);
    const messageRenderer = new MessageRenderer(PayPalCommerceGateway.messages);
    const context = PayPalCommerceGateway.context;
    if (context === 'mini-cart' || context === 'product') {
        if (PayPalCommerceGateway.mini_cart_buttons_enabled === '1') {
            const miniCartBootstrap = new MiniCartBootstap(
                PayPalCommerceGateway,
                renderer
            );

            miniCartBootstrap.init();
        }
    }

    if (context === 'product' && PayPalCommerceGateway.single_product_buttons_enabled === '1') {
        const singleProductBootstrap = new SingleProductBootstap(
            PayPalCommerceGateway,
            renderer,
            messageRenderer,
        );

        singleProductBootstrap.init();
    }

    if (context === 'cart') {
        const cartBootstrap = new CartBootstrap(
            PayPalCommerceGateway,
            renderer,
        );

        cartBootstrap.init();
    }

    if (context === 'checkout') {
        const checkoutBootstap = new CheckoutBootstap(
            PayPalCommerceGateway,
            renderer,
            messageRenderer,
            spinner
        );

        checkoutBootstap.init();
    }

    if (context === 'pay-now' ) {
        const payNowBootstrap = new PayNowBootstrap(
            PayPalCommerceGateway,
            renderer,
            messageRenderer,
            spinner
        );
        payNowBootstrap.init();
    }

    if (context !== 'checkout') {
        messageRenderer.render();
    }
};
document.addEventListener(
    'DOMContentLoaded',
    () => {
        if (!typeof (PayPalCommerceGateway)) {
            console.error('PayPal button could not be configured.');
            return;
        }

        if (
            PayPalCommerceGateway.context !== 'checkout'
            && PayPalCommerceGateway.data_client_id.user === 0
            && PayPalCommerceGateway.data_client_id.has_subscriptions
        ) {
            return;
        }

        // Sometimes PayPal script takes long time to load,
        // so we additionally hide the standard order button here to avoid failed orders.
        // Normally it is hidden later after the script load.
        const hideOrderButtonIfPpcpGateway = () => {
            // only in checkout, otherwise it may break things (e.g. payment via product page),
            // and also the loading spinner may look weird on other pages
            if (PayPalCommerceGateway.context !== 'checkout') {
                return;
            }

            const currentPaymentMethod = getCurrentPaymentMethod();
            const isPaypal = currentPaymentMethod === PaymentMethods.PAYPAL;

            setVisible(ORDER_BUTTON_SELECTOR, !isPaypal, true);

            if (isPaypal) {
                // stopped after the first rendering of the buttons, in onInit
                buttonsSpinner.block();
            } else {
                buttonsSpinner.unblock();
            }
        }

        let bootstrapped = false;

        hideOrderButtonIfPpcpGateway();

        jQuery(document.body).on('updated_checkout payment_method_selected', () => {
            if (bootstrapped) {
                return;
            }

            hideOrderButtonIfPpcpGateway();
        });

        const script = document.createElement('script');
        script.addEventListener('load', (event) => {
            bootstrapped = true;

            bootstrap();
        });
        script.setAttribute('src', PayPalCommerceGateway.button.url);
        Object.entries(PayPalCommerceGateway.script_attributes).forEach(
            (keyValue) => {
                script.setAttribute(keyValue[0], keyValue[1]);
            }
        );

        if (PayPalCommerceGateway.data_client_id.set_attribute) {
            dataClientIdAttributeHandler(script, PayPalCommerceGateway.data_client_id);
            return;
        }

        document.body.append(script);
    },
);
