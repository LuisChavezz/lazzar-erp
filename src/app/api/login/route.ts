import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Simulación de validación (Mock)
    // En un caso real, aquí consultarías tu base de datos o servicio externo
    if (email === "demo@example.com" && password === "123456") {
      // Simular delay de red
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return NextResponse.json({
        user: {
          id: "1",
          name: "Usuario Demo",
          email: "demo@example.com",
          role: "admin",
          token: "mock_jwt_token_123456",
        },
      });
    }

    return NextResponse.json(
      { message: "Credenciales inválidas" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
