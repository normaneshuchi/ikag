import { db } from "../lib/db";
import { users, serviceTypes, providerProfiles, providerServices, sessions, accounts, verifications } from "./schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

const DEMO_PASSWORD = "Demo123!";

const demoUsers = [
  { email: "admin@ikag.test", name: "Admin User", role: "admin" as const },
  { email: "plumber@ikag.test", name: "John Plumber", role: "provider" as const },
  { email: "gardener@ikag.test", name: "Sarah Gardner", role: "provider" as const },
  { email: "cleaner@ikag.test", name: "Mike Cleaner", role: "provider" as const },
  { email: "user@ikag.test", name: "Jane Customer", role: "user" as const },
  { email: "jane@ikag.test", name: "Jane Doe", role: "user" as const },
];

const demoServices = [
  { name: "Plumbing", description: "Fix leaks, unclog drains, install fixtures", icon: "🔧" },
  { name: "Gardening", description: "Lawn care, landscaping, tree trimming", icon: "🌱" },
  { name: "Cleaning", description: "House cleaning, deep cleaning, move-out cleaning", icon: "🧹" },
  { name: "Electrical", description: "Wiring, outlet installation, lighting", icon: "⚡" },
  { name: "Painting", description: "Interior and exterior painting", icon: "🎨" },
  { name: "Handyman", description: "General repairs and maintenance", icon: "🔨" },
  { name: "Moving", description: "Packing, loading, transportation", icon: "📦" },
  { name: "Pet Care", description: "Dog walking, pet sitting, grooming", icon: "🐕" },
];

// Demo locations in a metropolitan area
const demoLocations = [
  { lat: 40.7128, lng: -74.0060 },  // NYC
  { lat: 40.7580, lng: -73.9855 },  // Midtown
  { lat: 40.7484, lng: -73.9857 },  // Empire State area
];

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function seed() {
  console.log("🌱 Starting database seed...\n");

  try {
    // Clear existing data
    console.log("🧹 Clearing existing data...");
    await db.delete(providerServices);
    await db.delete(providerProfiles);
    await db.delete(sessions);
    await db.delete(accounts);
    await db.delete(verifications);
    await db.delete(users);
    await db.delete(serviceTypes);

    // Seed service types
    console.log("📦 Creating service types...");
    const createdServices = await db
      .insert(serviceTypes)
      .values(demoServices.map((s) => ({ ...s, isActive: true })))
      .returning();
    console.log(`   Created ${createdServices.length} service types`);

    // Seed users
    console.log("👤 Creating demo users...");
    const hashedPassword = await hashPassword(DEMO_PASSWORD);
    
    const createdUsers = await db
      .insert(users)
      .values(
        demoUsers.map((u) => ({
          email: u.email,
          name: u.name,
          role: u.role,
          emailVerified: true,
        }))
      )
      .returning();

    // Create accounts for each user (for better-auth)
    for (const user of createdUsers) {
      await db.insert(accounts).values({
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashedPassword,
      });
    }
    console.log(`   Created ${createdUsers.length} users`);

    // Create provider profiles
    console.log("🏪 Creating provider profiles...");
    const providers = createdUsers.filter((u) => 
      demoUsers.find((du) => du.email === u.email)?.role === "provider"
    );

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const location = demoLocations[i % demoLocations.length];
      const isVerified = provider.email !== "cleaner@ikag.test";

      // Create profile with PostGIS location
      const result = await db.execute(sql`
        INSERT INTO provider_profiles (user_id, bio, location, is_available, verified_at, verified_by)
        VALUES (
          ${provider.id},
          ${`Experienced ${provider.name.split(" ")[1]?.toLowerCase() || "service"} professional with years of experience.`},
          ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)::geography,
          true,
          ${isVerified ? new Date() : null},
          ${isVerified ? createdUsers.find((u) => u.email === "admin@ikag.test")?.id || null : null}
        )
        RETURNING id
      `);
      const profile = (result as { rows: { id: string }[] }).rows[0];

      // Assign services based on provider specialty
      let serviceNames: string[] = [];
      if (provider.email === "plumber@ikag.test") {
        serviceNames = ["Plumbing", "Handyman"];
      } else if (provider.email === "gardener@ikag.test") {
        serviceNames = ["Gardening", "Handyman"];
      } else if (provider.email === "cleaner@ikag.test") {
        serviceNames = ["Cleaning", "Moving"];
      }

      const matchingServices = createdServices.filter((s) => serviceNames.includes(s.name));
      for (const service of matchingServices) {
        await db.insert(providerServices).values({
          providerId: profile.id,
          serviceTypeId: service.id,
        });
      }
    }
    console.log(`   Created ${providers.length} provider profiles`);

    console.log("\n✅ Seed completed successfully!\n");
    console.log("Demo accounts:");
    console.log("─".repeat(50));
    console.log("| Email                    | Password   | Role     |");
    console.log("─".repeat(50));
    for (const user of demoUsers) {
      console.log(`| ${user.email.padEnd(24)} | ${DEMO_PASSWORD.padEnd(10)} | ${user.role.padEnd(8)} |`);
    }
    console.log("─".repeat(50));
    console.log("\nNote: cleaner@ikag.test is an unverified provider");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
