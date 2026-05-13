import { json } from "@remix-run/node";
import shopify from "../shopify.server";

export async function loader() {
  return json({
    success: true,
    message: "API is working",
  });
}

export async function action({ request }) {
  try {
    const { admin } = await shopify.authenticate.public.appProxy(request);
    const { articleId } = await request.json();

    if (!articleId) {
      return json({
        success: false,
        error: "Article ID is required",
      });
    }

    // Get current like count
    const query = `
      query GetArticle($id: ID!) {
        article(id: $id) {
          metafield(namespace: "custom", key: "like_count") {
            value
          }
        }
      }
    `;

    const queryResponse = await admin.graphql(query, {
      variables: { id: articleId },
    });

    const queryData = await queryResponse.json();

    const currentValue =
      queryData?.data?.article?.metafield?.value || "0";

    const currentLikes = parseInt(currentValue, 10) || 0;
    const newLikes = currentLikes + 1;

    // Save updated like count
    const mutation = `
      mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
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