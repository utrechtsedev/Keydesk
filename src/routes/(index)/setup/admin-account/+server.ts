import { models } from "$lib/server/db/models";
import { hashPassword } from "$lib/utils/password";
import { generateRandomString } from "$lib/utils/string";
import { json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }) => {

  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { user } = body as { user?: { name?: string; email?: string; password?: string } };

    if (!user) {
      return json(
        { success: false, error: "User object is required" },
        { status: 400 }
      );
    }

    if (!user.name || !user.email || !user.password) {
      return json(
        {
          success: false,
          error: "Missing required fields: name, email, and password are required"
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      return json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (user.name.trim().length === 0) {
      return json(
        { success: false, error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    if (user.password.length < 8) {
      return json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    let uid = generateRandomString(32)
    await models.User.create({ id: uid, email: user.email, name: user.name, emailVerified: true, role: "admin", banned: false })
    await models.Account.create({
      id: generateRandomString(32),
      accountId: uid,
      providerId: 'credential',
      userId: uid,
      password: await hashPassword(user.password)
    })

    return json({
      success: true,
    });

  } catch (error: any) {
    console.error("Error creating user:", error);

    if (error.name === "SequelizeUniqueConstraintError" || error.code === "ER_DUP_ENTRY") {
      return json(
        { success: false, error: "Email already exists" },
        { status: 409 }
      );
    }

    if (error.name === "SequelizeValidationError") {
      const messages = error.errors?.map((e: any) => e.message).join(", ");
      return json(
        { success: false, error: `Validation error: ${messages || "Invalid data"}` },
        { status: 400 }
      );
    }

    if (error.name === "SequelizeDatabaseError") {
      if (error.message.includes("CONSTRAINT")) {
        return json(
          { success: false, error: "Database constraint violation" },
          { status: 400 }
        );
      }
    }

    if (error.name === "SequelizeConnectionError") {
      return json(
        { success: false, error: "Database connection failed" },
        { status: 503 }
      );
    }

    return json(
      { success: false, error: "Failed to create user" },
      { status: 500 }
    );
  }
};
