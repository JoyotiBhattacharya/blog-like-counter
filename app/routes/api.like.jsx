function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Test API in browser
export async function loader() {
  return jsonResponse({
    success: true,
    message: "API is working",
  });
}

// Handle CORS preflight request
export async function options() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Main POST request
export async function action({ request }) {
  try {
    let { articleId } = await request.json();

    if (!articleId) {
      return jsonResponse({
        success: false,
        error: "Article ID is required",
      });
    }

    // Convert numeric ID to Shopify GID if needed
    if (!String(articleId).startsWith("gid://")) {
      articleId = `gid://shopify/Article/${articleId}`;
    }

    const shop = "my-new-app-8hk4xewp.myshopify.com";
    const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

    if (!accessToken) {
      return jsonResponse({
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

    if (readData.errors?.length) {
      return jsonResponse({
        success: false,
        error: readData.errors[0].message,
      });
    }

    const currentValue =
      readData?.data?.article?.metafield?.value || "0";

    const currentLikes = parseInt(currentValue, 10) || 0;
    const newLikes = currentLikes + 1;

    // STEP 2: Update metafield
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

    if (updateData.errors?.length) {
      return jsonResponse({
        success: false,
        error: updateData.errors[0].message,
      });
    }

    const userErrors =
      updateData?.data?.metafieldsSet?.userErrors || [];

    if (userErrors.length > 0) {
      return jsonResponse({
        success: false,
        error: userErrors[0].message,
      });
    }

    // Success response
    return jsonResponse({
      success: true,
      likes: newLikes,
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message,
    });
  }
}