# BAMMY STORE NG — Storefront starter

A responsive storefront built with HTML, CSS and browser JavaScript, plus a small Node/Express example backend for Paystack payment initialization and verification.

## Included
- Responsive home page and mobile navigation
- Six product categories and sample products
- Product search and category filtering
- Shopping cart saved in browser local storage
- Checkout form and card/bank-transfer payment selection
- Server-side price calculation and Paystack initialization/verification example
- Paystack webhook signature verification example

## Run the storefront locally
1. Install a local static server, for example VS Code Live Server.
2. Open the `public` folder with Live Server (commonly `http://localhost:5500`).
3. Keep the API server running separately (steps below).

## Run the API server
1. Install Node.js 18 or newer.
2. Open a terminal in the `server` folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Add your Paystack test secret key to `PAYSTACK_SECRET_KEY`.
6. Add the correct `FRONTEND_ORIGIN` and your confirmed bank details.
7. Run `npm start`.

The example backend listens on `http://localhost:4242`. The front end calls this URL by default. Update `CONFIG.apiBaseUrl` in `public/app.js` when deploying.

## Before accepting real orders or payments
This is a starter project, not a production-ready commerce platform. Do not launch real payments until you complete the following:

- Replace all sample product data, prices and stock with an admin-managed database.
- Replace placeholder WhatsApp number, email address, bank details and business policies.
- Use a real production domain with HTTPS.
- Store orders and payment records in a persistent database; the included `Map` is temporary and clears when the server restarts.
- Add an admin dashboard for products, stock, orders, refunds and fulfilment.
- Add proper server-side validation, rate limiting, authentication for admin routes, CSRF protections where applicable, secure logging and backups.
- Use Paystack test mode first, then switch to live keys only after account activation and end-to-end testing.
- Confirm transfer payments against verified provider/bank transaction records. Never mark a transfer as paid based only on a customer's screenshot or form submission.
- For automated bank transfer, configure a Paystack-supported dedicated virtual account/bank-transfer flow for your merchant account. This starter currently displays the merchant bank details configured in `.env`; it does not automatically reconcile transfers.
- Set the Paystack webhook URL to `https://YOUR-DOMAIN/api/paystack/webhook` and test its signature verification.
- Update the payment callback URL in `server.js` to your deployed payment result page and API URL in `payment-result.html`.
- Add delivery pricing, service areas, returns/refund terms, privacy policy and terms of service.

## Important payment notes
- The browser never receives the Paystack secret key.
- Prices are recalculated on the server from product IDs. Never trust prices sent by the browser.
- The payment result page calls the server verification endpoint. A redirect or screenshot is not proof of payment.
- This sample uses in-memory orders for demonstration only. Replace it with a database before production.

## Customizing products
Edit the `products` array in `public/app.js` and the matching `catalogue` object in `server/server.js`. Keep product IDs and prices consistent. For a real store, fetch catalogue and price data from your backend rather than maintaining two separate lists.
