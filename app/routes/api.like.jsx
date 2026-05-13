import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);
    const { articleId } = await request.json();

    if (!articleId) {
      return json(
        {
          success: false,
          error: "Article ID is required",
        },
        { status: 400 }
      );
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
      variables: {
        id: articleId,
      },
    });

    const queryData = await queryResponse.json();

    const currentLikes = parseInt(
      queryData?.data?.article?.metafield?.value || "0",
      10
    );

    const newLikes = currentLikes + 1;

    // Update metafield
    const mutation = `
      mutation UpdateLikes($ownerId: ID!, $value: String!) {
        metafieldsSet(
          metafields: [
            {
              namespace: "custom"
              key: "like_count"
              type: "number_integer"
              ownerId: $ownerId
              value: $value
            }
          ]
        ) {
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
        ownerId: articleId,
        value: String(newLikes),
      },
    });

    const mutationData = await mutationResponse.json();

    const errors = mutationData?.data?.metafieldsSet?.userErrors || [];

    if (errors.length > 0) {
      return json(
        {
          success: false,
          error: errors[0].message,
        },
        { status: 400 }
      );
    }

    return json({
      success: true,
      likes: newLikes,
    });
  } catch (error) {
    console.error("Like API Error:", error);

    return json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}