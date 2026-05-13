import { json } from "react-router";
import shopify from "../shopify.server";

export async function loader() {
  return json({
    success: true,
    message: "API is working",
  });
}

export async function action({ request }) {
  try {
    const { articleId } = await request.json();

    return json({
      success: true,
      likes: 1,
      articleId,
    });
  } catch (error) {
    return json({
      success: false,
      error: error.message,
    });
  }
}