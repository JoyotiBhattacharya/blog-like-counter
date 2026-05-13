import shopify from "../shopify.server";

export async function loader() {
  return Response.json({
    success: true,
    message: "API is working",
  });
}

export async function action({ request }) {
  try {
    // Authenticate App Proxy request
    const { admin } =
      await shopify.authenticate.public.appProxy(request);

    // Get articleId from request body
    const body = await request.json();
    const articleId = body.articleId;

    if (!articleId) {
      return Response.json({
        success: false,
        error: "Article ID is required",
      });
    }

    // Read current metafield value
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

    // Save updated metafield
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
      return Response.json({
        success: false,
        error: userErrors[0].message,
      });
    }

    return Response.json({
      success: true,
      likes: newLikes,
    });
  } catch (error) {
    console.error("Like API Error:", error);

    return Response.json({
      success: false,
      error: error.message,
    });
  }
}