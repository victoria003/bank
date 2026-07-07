export async function onRequestPost(context: any) {
  const body = await context.request.json();

  const { username, password } = body;

  if (username === "admin" && password === "admin123") {
    return Response.json({
      success: true,
      token: "dummy-token",
      user: {
        name: "Administrator",
        email: "admin@example.com",
        role: "ADMIN"
      }
    });
  }

  return Response.json(
    {
      success: false,
      error: "Invalid credentials"
    },
    {
      status: 401
    }
  );
}