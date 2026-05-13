import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);
    const { articleId } = await request.json();

    // Validate article ID
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
            value
          }
        }
      }
    `;

    const queryResponse = await admin.graphql(query, {
      variables: { id: articleId },
    });

    const queryData = await queryResponse.json();

    const currentLikes = parseInt(
      queryData?.data?.article?.metafield?.value || "0",
      10
    );

    const newLikes = currentLikes + 1;

    // Save updated metafield
    const mutation = `
      mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors {
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