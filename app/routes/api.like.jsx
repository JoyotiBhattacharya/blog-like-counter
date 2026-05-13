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

// Test API
export async function loader() {
  return jsonResponse({
    success: true,
    message: "API is working",
  });
}

// Handle CORS preflight
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

// Main POST handler
export async function action({ request }) {
  let articleId;
  const shop = "my-new-app-8hk4xewp.myshopify.com";
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

  try {
    // Parse request body
    const body = await request.json();
    articleId = body.articleId;

    if (!articleId) {
      return jsonResponse({
        success: false,
        error: "Article ID is required",
      });
    }

    // Convert numeric ID to Shopify GraphQL GID
    if (!String(articleId).startsWith("gid://")) {
      articleId = `gid://shopify/Article/${articleId}`;
    }

    // Ensure token exists
    if (!accessToken) {
      return jsonResponse({
        success: false,
        error: "SHOPIFY_ADMIN_ACCESS_TOKEN is missing",
      });
    }

    // -----------------------------
    // STEP 1: Read current like_count
    // -----------------------------
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

    // Top-level GraphQL errors
    if (readData.errors?.length) {
      return jsonResponse({
        success: false,
        error: readData.errors[0].message,
        debug: {
          stage: "read_query",
          articleId,
          response: readData,
        },
      });
    }

    // Article not found
    if (!readData?.data?.article) {
      return jsonResponse({
        success: false,
        error: "Article not found",
        debug: {
          stage: "article_lookup",
          articleId,
          response: readData,
        },
      });
    }

    const currentValue =
      readData.data.article.metafield?.value || "0";

    const currentLikes = parseInt(currentValue, 10) || 0;
    const newLikes = currentLikes + 1;

    // -----------------------------
    // STEP 2: Update metafield
    // -----------------------------
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

    // Top-level GraphQL errors
    if (updateData.errors?.length) {
      return jsonResponse({
        success: false,
        error: updateData.errors[0].message,
        debug: {
          stage: "update_query",
          articleId,
          response: updateData,
        },
      });
    }

    // User errors from metafieldsSet
    const userErrors =
      updateData?.data?.metafieldsSet?.userErrors || [];

    if (userErrors.length > 0) {
      return jsonResponse({
        success: false,
        error: userErrors[0].message,
        debug: {
          stage: "metafields_set",
          articleId,
          userErrors,
        },
      });
    }

    // Success
    return jsonResponse({
      success: true,
      likes: newLikes,
    });
  } catch (error) {
    console.error("Like API Error:", error);

    return jsonResponse({
      success: false,
      error:
        error && error.message
          ? error.message
          : error
          ? String(error)
          : "Unknown error",
      stack:
        error && error.stack
          ? error.stack
          : null,
      debug: {
        articleId,
        hasAccessToken: !!accessToken,
        shop,
        errorType: typeof error,
      },
    });
  }
}