import { db } from "../lib/db";
import { users, serviceTypes, providerProfiles, providerServices, sessions, accounts, verifications } from "./schema";
import { sql } from "drizzle-orm";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { bytesToHex, randomBytes } from "@noble/hashes/utils.js";

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

// Demo locations in Nairobi, Kenya
// Demo locations - Nairobi suburbs and neighborhoods
const demoLocations = [
  // Central
  { lat: -1.2921, lng: 36.8219, name: "Nairobi CBD" },
  { lat: -1.2833, lng: 36.8167, name: "Westlands" },
  { lat: -1.2741, lng: 36.8030, name: "Parklands" },
  { lat: -1.2697, lng: 36.8127, name: "Highridge" },
  
  // West
  { lat: -1.3031, lng: 36.7073, name: "Karen" },
  { lat: -1.3167, lng: 36.7667, name: "Langata" },
  { lat: -1.2856, lng: 36.7589, name: "Lavington" },
  { lat: -1.2789, lng: 36.7678, name: "Kileleshwa" },
  { lat: -1.2967, lng: 36.7833, name: "Kilimani" },
  { lat: -1.2958, lng: 36.7667, name: "Hurlingham" },
  
  // South
  { lat: -1.3226, lng: 36.8431, name: "South B" },
  { lat: -1.3167, lng: 36.8333, name: "South C" },
  { lat: -1.3089, lng: 36.8256, name: "Nairobi West" },
  { lat: -1.3500, lng: 36.8833, name: "Athi River" },
  
  // East
  { lat: -1.2864, lng: 36.8667, name: "Eastleigh" },
  { lat: -1.2667, lng: 36.8833, name: "Kasarani" },
  { lat: -1.2500, lng: 36.9000, name: "Ruiru" },
  { lat: -1.2333, lng: 36.8667, name: "Roysambu" },
  { lat: -1.2833, lng: 36.8500, name: "Pangani" },
  { lat: -1.2958, lng: 36.8583, name: "Buruburu" },
  
  // North
  { lat: -1.2333, lng: 36.8167, name: "Gigiri" },
  { lat: -1.2167, lng: 36.8000, name: "Runda" },
  { lat: -1.2000, lng: 36.8167, name: "Muthaiga" },
  { lat: -1.2500, lng: 36.8333, name: "Thika Road" },
  { lat: -1.1833, lng: 36.9333, name: "Thika" },
  
  // Other notable areas
  { lat: -1.2622, lng: 36.8036, name: "Spring Valley" },
  { lat: -1.2694, lng: 36.7889, name: "Loresho" },
  { lat: -1.2583, lng: 36.7750, name: "Kitisuru" },
  { lat: -1.3000, lng: 36.8167, name: "Upper Hill" },
  { lat: -1.3167, lng: 36.8167, name: "Mbagathi" },
  { lat: -1.2833, lng: 36.8333, name: "Ngara" },
  { lat: -1.2917, lng: 36.8500, name: "Makadara" },
  { lat: -1.3333, lng: 36.8667, name: "Industrial Area" },
  { lat: -1.2667, lng: 36.8000, name: "Brookside" },
  { lat: -1.3167, lng: 36.7500, name: "Rongai" },
];

// Hash password using the exact same algorithm as better-auth
// Uses @noble/hashes/scrypt with config: N=16384, r=16, p=1, dkLen=64
async function hashPassword(password: string): Promise<string> {
  const salt = bytesToHex(randomBytes(16));
  const key = await scryptAsync(password.normalize("NFKC"), salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
    maxmem: 128 * 16384 * 16 * 2,
  });
  return `${salt}:${bytesToHex(key)}`;
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
