
import { json } from "@remix-run/node";
import shopify from "../shopify.server";
export async function loader() {
  return json({
    success: true,
    message: "API is working",
  });
}

export async function action({ request }) {
  const { articleId } = await request.json();

  return json({
    success: true,
    likes: 1,
    articleId,
  });
}