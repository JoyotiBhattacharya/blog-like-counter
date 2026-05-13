export async function loader() {
  return Response.json({
    success: true,
    message: "API is working",
  });
}

export async function action({ request }) {
  try {
    const { articleId } = await request.json();

    if (!articleId) {
      return Response.json({
        success: false,
        error: "Article ID is required",
      });
    }

    const shop = "my-new-app-8hk4xewp.myshopify.com";
    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

    if (!accessToken) {
      return Response.json({
        success: false,
        error: "SHOPIFY_ADMIN_ACCESS_TOKEN is missing",
      });
    }

    // STEP 1: Read current like_count metafield
    const readQuery = `
      query GetArticle($id: ID!) {
        article(id: $id) {
          metafield(namespace: "custom", key: "like_count") {
            value
          }
        }
      }
    `;

    const readResponse = await fetch(
      `https://${shop}/admin/api/2026-04/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: readQuery,
          variables: {
            id: articleId,
          },
        }),
      }
    );

    const readData = await readResponse.json();

    const currentValue =
      readData?.data?.article?.metafield?.value || "0";

    const currentLikes = parseInt(currentValue, 10) || 0;
    const newLikes = currentLikes + 1;

    // STEP 2: Save updated like_count metafield
    const mutation = `
      mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            namespace
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const updateResponse = await fetch(
      `https://${shop}/admin/api/2026-04/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: mutation,
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
        }),
      }
    );

    const updateData = await updateResponse.json();

    const userErrors =
      updateData?.data?.metafieldsSet?.userErrors || [];

    if (userErrors.length > 0) {
      return Response.json({
        success: false,
        error: userErrors[0].message,
      });
    }

    // STEP 3: Return updated count to frontend
    return Response.json({
      success: true,
      likes: newLikes,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}