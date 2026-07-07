export async function onRequestPost(context: any) {
  const body = await context.request.json();

  const { username, password } = body;

  if (username === "admin" && password === "admin123") {
    return Response.json({
      success: true,
      user: {
        username: "admin",
        role: "ADMIN"
      }
    });
  }

  return Response.json(
    {
      success: false,
      message: "Invalid credentials"
    },
    {
      status: 401
    }
  );
}