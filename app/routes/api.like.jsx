// export async function loader() {
//   return Response.json({
//     success: true,
//     message: "API is working",
//   });
// }

// export async function action({ request }) {
//   try {
//     const { articleId } = await request.json();

//     if (!articleId) {
//       return Response.json({
//         success: false,
//         error: "Article ID is required",
//       });
//     }

//     // Temporary test response
//     // First confirm alert is gone and frontend works.
//     return Response.json({
//       success: true,
//       likes: Math.floor(Math.random() * 100) + 1,
//     });
//   } catch (error) {
//     return Response.json({
//       success: false,
//       error: error.message,
//     });
//   }
// }
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

    const queryResponse = await fetch(
      `https://${shop}/admin/api/2026-07/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query,
          variables: {
            id: articleId,
          },
        }),
      }
    );

    const queryData = await queryResponse.json();

    const currentValue =
      queryData?.data?.article?.metafield?.value || "0";

    const currentLikes = parseInt(currentValue, 10) || 0;
    const newLikes = currentLikes + 1;

    // Update metafield
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

    const mutationResponse = await fetch(
      `https://${shop}/admin/api/2026-07/graphql.json`,
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
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}