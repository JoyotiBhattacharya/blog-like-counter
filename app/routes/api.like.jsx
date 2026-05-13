import { json } from "react-router";
import shopify from "../shopify.server";

export async function action({ request }) {
  try {
    // App Proxy requests are authenticated with authenticate.public.appProxy
    const { admin } = await shopify.authenticate.public.appProxy(request);

    const { articleId } = await request.json();

    if (!articleId) {
      return json({
        success: false,
        error: "Article ID is required",
      });
    }

    // Read current metafield
    const query = `
      query GetArticle($id: ID!) {
        article(id: $id) {
          metafield(namespace: "custom", key: "like_count") {
            id
            value
          }
        }
      }
    `;

    const queryResponse = await admin.graphql(query, {
      variables: { id: articleId },
    });

    const queryData = await queryResponse.json();

    const metafield = queryData?.data?.article?.metafield;
    const currentLikes = parseInt(metafield?.value || "0", 10);
    const newLikes = currentLikes + 1;

    // Create or update metafield
    const mutation = `
      mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const mutationResponse = await admin.graphql(mutation, {
      variables: {
        metafields: [
          {
            ownerId: articleId,
            namespace: "custom",
            key: "like_count",
            type: "number_integer",
            value: String(newLikes),
          },
        ],
      },
    });

    const mutationData = await mutationResponse.json();
    const userErrors =
      mutationData?.data?.metafieldsSet?.userErrors || [];

    if (userErrors.length > 0) {
      return json({
        success: false,
        error: userErrors[0].message,
      });
    }

    return json({
      success: true,
      likes: newLikes,
    });
  } catch (error) {
    console.error("Like API Error:", error);

    return json({
      success: false,
      error: error.message,
    });
  }
}