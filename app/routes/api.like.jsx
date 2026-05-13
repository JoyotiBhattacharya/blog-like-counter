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

    // Temporary test response
    // First confirm alert is gone and frontend works.
    return Response.json({
      success: true,
      likes: Math.floor(Math.random() * 100) + 1,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}