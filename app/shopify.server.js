import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  apiVersion: ApiVersion.July26,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL,
  authPathPrefix: "/api/auth",
  sessionStorage: {
    async storeSession() {
      return true;
    },
    async loadSession() {
      return null;
    },
    async deleteSession() {
      return true;
    },
    async deleteSessions() {
      return true;
    },
    async findSessionsByShop() {
      return [];
    },
  },
  distribution: AppDistribution.AppStore,
});

export default shopify;
export const apiVersion = ApiVersion.July26;