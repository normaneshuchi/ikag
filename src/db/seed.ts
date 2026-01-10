import { db } from "../lib/db";
import { users, serviceTypes, providerProfiles, providerServices, sessions, accounts, verifications, serviceRequests } from "./schema";
import { sql } from "drizzle-orm";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { bytesToHex, randomBytes } from "@noble/hashes/utils.js";
import { randomUUID } from "crypto";

const DEMO_PASSWORD = "Demo123!";

// Core demo users (admin and regular users)
const demoUsers = [
  { email: "admin@ikag.test", name: "Admin User", role: "admin" as const },
  { email: "user@ikag.test", name: "Jane Customer", role: "user" as const },
  { email: "jane@ikag.test", name: "Jane Doe", role: "user" as const },
];

// Provider templates - will be instantiated in multiple locations
const providerTemplates = [
  // Plumbers
  { firstName: "John", lastName: "Mwangi", specialty: "Plumbing", services: ["Plumbing", "Handyman"], verified: true },
  { firstName: "Peter", lastName: "Ochieng", specialty: "Plumbing", services: ["Plumbing"], verified: true },
  { firstName: "David", lastName: "Kamau", specialty: "Plumbing", services: ["Plumbing", "Electrical"], verified: true },
  
  // Gardeners
  { firstName: "Sarah", lastName: "Wanjiku", specialty: "Gardening", services: ["Gardening"], verified: true },
  { firstName: "Grace", lastName: "Akinyi", specialty: "Gardening", services: ["Gardening", "Handyman"], verified: true },
  { firstName: "Joseph", lastName: "Kiprop", specialty: "Gardening", services: ["Gardening"], verified: false },
  
  // Cleaners
  { firstName: "Mary", lastName: "Njeri", specialty: "Cleaning", services: ["Cleaning", "Moving"], verified: true },
  { firstName: "Agnes", lastName: "Wambui", specialty: "Cleaning", services: ["Cleaning"], verified: true },
  { firstName: "Mike", lastName: "Otieno", specialty: "Cleaning", services: ["Cleaning", "Moving"], verified: false },
  
  // Electricians
  { firstName: "James", lastName: "Kariuki", specialty: "Electrical", services: ["Electrical", "Handyman"], verified: true },
  { firstName: "Brian", lastName: "Mutua", specialty: "Electrical", services: ["Electrical"], verified: true },
  { firstName: "Kevin", lastName: "Omondi", specialty: "Electrical", services: ["Electrical", "Plumbing"], verified: true },
  
  // Painters
  { firstName: "Daniel", lastName: "Wafula", specialty: "Painting", services: ["Painting", "Handyman"], verified: true },
  { firstName: "Samuel", lastName: "Kiptoo", specialty: "Painting", services: ["Painting"], verified: true },
  { firstName: "Mercy", lastName: "Chebet", specialty: "Painting", services: ["Painting"], verified: false },
  
  // Handymen
  { firstName: "Charles", lastName: "Maina", specialty: "Handyman", services: ["Handyman", "Plumbing", "Electrical"], verified: true },
  { firstName: "George", lastName: "Njoroge", specialty: "Handyman", services: ["Handyman", "Painting"], verified: true },
  { firstName: "Francis", lastName: "Kibet", specialty: "Handyman", services: ["Handyman", "Moving"], verified: true },
  
  // Movers
  { firstName: "Patrick", lastName: "Korir", specialty: "Moving", services: ["Moving", "Handyman"], verified: true },
  { firstName: "Stephen", lastName: "Rotich", specialty: "Moving", services: ["Moving"], verified: true },
  { firstName: "Alex", lastName: "Ndirangu", specialty: "Moving", services: ["Moving", "Cleaning"], verified: false },
  
  // Pet Care
  { firstName: "Lucy", lastName: "Adhiambo", specialty: "Pet Care", services: ["Pet Care"], verified: true },
  { firstName: "Faith", lastName: "Moraa", specialty: "Pet Care", services: ["Pet Care"], verified: true },
  { firstName: "Diana", lastName: "Kemunto", specialty: "Pet Care", services: ["Pet Care"], verified: true },
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
    // Check if data already exists (skip seeding if so)
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log("⏭️  Database already seeded, skipping...");
      console.log("   (Use --force flag to reseed: npx tsx src/db/seed.ts --force)");
      process.exit(0);
    }

    const forceReseed = process.argv.includes("--force");
    if (forceReseed) {
      // Clear existing data (order matters due to foreign keys)
      console.log("🧹 Force flag detected, clearing existing data...");
      await db.delete(serviceRequests);
      await db.delete(providerServices);
      await db.delete(providerProfiles);
      await db.delete(sessions);
      await db.delete(accounts);
      await db.delete(verifications);
      await db.delete(users);
      await db.delete(serviceTypes);
    }

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
        id: randomUUID().replace(/-/g, ""),
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashedPassword,
      });
    }
    console.log(`   Created ${createdUsers.length} users`);

    // Create provider profiles - 3 providers per location
    console.log("🏪 Creating provider profiles...");
    const adminUser = createdUsers.find((u) => u.email === "admin@ikag.test");
    let providerCount = 0;
    const providerEmails: string[] = [];

    // Distribute providers across all locations
    // Each location gets 3 different service providers
    for (let locIdx = 0; locIdx < demoLocations.length; locIdx++) {
      const location = demoLocations[locIdx];
      
      // Pick 3 different providers for this location
      // Rotate through templates to ensure variety
      const providersForLocation = [
        providerTemplates[(locIdx * 3) % providerTemplates.length],
        providerTemplates[(locIdx * 3 + 1) % providerTemplates.length],
        providerTemplates[(locIdx * 3 + 2) % providerTemplates.length],
      ];

      for (let pIdx = 0; pIdx < providersForLocation.length; pIdx++) {
        const template = providersForLocation[pIdx];
        const providerEmail = `${template.firstName.toLowerCase()}.${template.lastName.toLowerCase()}.${location.name.toLowerCase().replace(/\s+/g, "")}@ikag.test`;
        const providerName = `${template.firstName} ${template.lastName}`;

        // Create user
        const [providerUser] = await db
          .insert(users)
          .values({
            email: providerEmail,
            name: providerName,
            role: "provider",
            emailVerified: true,
          })
          .returning();

        // Create account for the provider
        await db.insert(accounts).values({
          id: randomUUID().replace(/-/g, ""),
          userId: providerUser.id,
          accountId: providerUser.id,
          providerId: "credential",
          password: hashedPassword,
        });

        // Add slight random offset to location to spread providers within the area
        const latOffset = (Math.random() - 0.5) * 0.01; // ~1km variation
        const lngOffset = (Math.random() - 0.5) * 0.01;

        // Create profile with PostGIS location
        const result = await db.execute(sql`
          INSERT INTO provider_profiles (user_id, bio, location, address, is_available, verified_at, verified_by, years_of_experience, service_radius)
          VALUES (
            ${providerUser.id},
            ${`Experienced ${template.specialty.toLowerCase()} professional serving the ${location.name} area. Quality work guaranteed.`},
            ST_SetSRID(ST_MakePoint(${location.lng + lngOffset}, ${location.lat + latOffset}), 4326)::geography,
            ${`${location.name}, Nairobi, Kenya`},
            ${Math.random() > 0.2},
            ${template.verified ? new Date() : null},
            ${template.verified ? adminUser?.id || null : null},
            ${Math.floor(Math.random() * 10) + 1},
            ${5000 + Math.floor(Math.random() * 10000)}
          )
          RETURNING id
        `);
        const profile = (result as unknown as { rows: { id: string }[] }).rows[0];

        // Assign services based on template
        const matchingServices = createdServices.filter((s) => template.services.includes(s.name));
        for (const service of matchingServices) {
          const hourlyRate = 500 + Math.floor(Math.random() * 2000); // KSh 500-2500/hr
          await db.insert(providerServices).values({
            providerId: profile.id,
            serviceTypeId: service.id,
            hourlyRate: hourlyRate.toString(),
          });
        }

        providerCount++;
        providerEmails.push(providerEmail);
      }
    }
    console.log(`   Created ${providerCount} provider profiles across ${demoLocations.length} locations`);

    console.log("\n✅ Seed completed successfully!\n");
    console.log("Demo accounts:");
    console.log("─".repeat(60));
    console.log("| Email                              | Password   | Role     |");
    console.log("─".repeat(60));
    for (const user of demoUsers) {
      console.log(`| ${user.email.padEnd(34)} | ${DEMO_PASSWORD.padEnd(10)} | ${user.role.padEnd(8)} |`);
    }
    console.log("─".repeat(60));
    console.log(`\nPlus ${providerCount} provider accounts (email format: firstname.lastname.location@ikag.test)`);
    console.log("Example provider emails:");
    providerEmails.slice(0, 5).forEach(email => console.log(`  - ${email}`));
    console.log(`  ... and ${providerCount - 5} more`);
    console.log(`\nAll providers use password: ${DEMO_PASSWORD}`);
    console.log(`Note: ~20% of providers are set as unavailable, ~12% are unverified`);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
