export async function loader() {
  return Response.json({
    success: true,
    message: "API is working",
  });
}

export async function action({ request }) {
  try {
    const body = await request.json();
    const articleId = body.articleId || null;

    return Response.json({
      success: true,
      likes: 1,
      articleId,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}