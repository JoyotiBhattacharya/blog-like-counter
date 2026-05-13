import { json } from "react-router";

export async function loader() {
  return json({
    success: true,
    message: "API is working",
  });
}

export async function action({ request }) {
  try {
    const { articleId } = await request.json();

    if (!articleId) {
      return json({
        success: false,
        error: "Article ID missing",
      });
    }

    return json({
      success: true,
      likes: 1,
    });
  } catch (error) {
    return json({
      success: false,
      error: error.message,
    });
  }
}