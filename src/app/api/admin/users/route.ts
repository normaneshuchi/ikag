import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, like, or, desc } from "drizzle-orm";

async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}

// GET - List users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const role = searchParams.get("role");

    let query = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users);

    // Build conditions
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }

    if (role && role !== "all") {
      conditions.push(eq(users.role, role as "admin" | "provider" | "user"));
    }

    // Apply conditions
    if (conditions.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.where(conditions.reduce((acc: any, cond) => acc ? (acc && cond) : cond, null) as any) as any;
    }

    const usersList = await query.orderBy(desc(users.createdAt));

    return NextResponse.json(usersList);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
