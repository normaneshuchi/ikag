// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

// Now import everything else
import { db } from "../lib/db";
import { users, serviceTypes, providerProfiles, providerServices, sessions, accounts, verifications, serviceRequests, agencies, agencyMembers, agencyServices, agencyMemberServices } from "./schema";
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

// Demo agencies with owner information
const demoAgencies = [
  {
    name: "CleanPro Kenya",
    description: "Professional cleaning services for homes and offices. We specialize in deep cleaning, move-in/move-out cleaning, and regular maintenance cleaning.",
    email: "info@cleanpro.ke",
    phone: "+254700111222",
    website: "https://cleanpro.ke",
    services: ["Cleaning", "Gardening"],
    location: { lat: -1.2921, lng: 36.8219, address: "Kenyatta Avenue, Nairobi CBD" },
    verified: true,
    owners: [
      { firstName: "Alice", lastName: "Muthoni", role: "owner" as const },
      { firstName: "Bob", lastName: "Odera", role: "manager" as const },
    ],
  },
  {
    name: "Nairobi Plumbing Masters",
    description: "Expert plumbing and electrical services. 24/7 emergency repairs available. Licensed and insured professionals.",
    email: "support@plumbingmasters.co.ke",
    phone: "+254700333444",
    website: "https://plumbingmasters.co.ke",
    services: ["Plumbing", "Electrical", "Handyman"],
    location: { lat: -1.2833, lng: 36.8167, address: "Westlands, Nairobi" },
    verified: true,
    owners: [
      { firstName: "Tom", lastName: "Kimani", role: "owner" as const },
    ],
  },
  {
    name: "Green Gardens Ltd",
    description: "Transform your outdoor space with our professional gardening and landscaping services. We handle everything from lawn care to complete garden makeovers.",
    email: "hello@greengardens.co.ke",
    phone: "+254700555666",
    website: "https://greengardens.co.ke",
    services: ["Gardening", "Painting"],
    location: { lat: -1.3031, lng: 36.7073, address: "Karen, Nairobi" },
    verified: true,
    owners: [
      { firstName: "Grace", lastName: "Wanjiru", role: "owner" as const },
      { firstName: "Peter", lastName: "Ndung'u", role: "owner" as const },
    ],
  },
  {
    name: "Swift Movers",
    description: "Reliable moving and relocation services across Kenya. We handle packing, transportation, and unpacking with care.",
    email: "move@swiftmovers.ke",
    phone: "+254700777888",
    website: "https://swiftmovers.ke",
    services: ["Moving", "Handyman"],
    location: { lat: -1.3226, lng: 36.8431, address: "South B, Nairobi" },
    verified: false,
    owners: [
      { firstName: "James", lastName: "Otieno", role: "owner" as const },
    ],
  },
  {
    name: "PetPals Nairobi",
    description: "Loving care for your furry friends. Dog walking, pet sitting, and grooming services by certified pet care professionals.",
    email: "woof@petpals.co.ke",
    phone: "+254700999000",
    services: ["Pet Care"],
    location: { lat: -1.2856, lng: 36.7589, address: "Lavington, Nairobi" },
    verified: true,
    owners: [
      { firstName: "Linda", lastName: "Achieng", role: "owner" as const },
      { firstName: "Mark", lastName: "Wekesa", role: "manager" as const },
    ],
  },
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
    const forceReseed = process.argv.includes("--force");
    
    if (forceReseed) {
      // Clear existing data (order matters due to foreign keys)
      console.log("🧹 Force flag detected, clearing existing data...");
      await db.delete(agencyMemberServices);
      await db.delete(agencyServices);
      await db.delete(agencyMembers);
      await db.delete(agencies);
      await db.delete(serviceRequests);
      await db.delete(providerServices);
      await db.delete(providerProfiles);
      await db.delete(sessions);
      await db.delete(accounts);
      await db.delete(verifications);
      await db.delete(users);
      await db.delete(serviceTypes);
    }

    // Check existing data in each table
    const existingServices = await db.select().from(serviceTypes).limit(1);
    const existingUsers = await db.select().from(users).limit(1);
    const existingProviders = await db.select().from(providerProfiles).limit(1);

    // Seed service types (if empty)
    let createdServices;
    if (existingServices.length > 0) {
      console.log("⏭️  Service types already exist, skipping...");
      createdServices = await db.select().from(serviceTypes);
    } else {
      console.log("📦 Creating service types...");
      createdServices = await db
        .insert(serviceTypes)
        .values(demoServices.map((s) => ({ ...s, isActive: true })))
        .returning();
      console.log(`   Created ${createdServices.length} service types`);
    }

    // Seed users (if empty)
    let createdUsers;
    const hashedPassword = await hashPassword(DEMO_PASSWORD);
    
    if (existingUsers.length > 0) {
      console.log("⏭️  Users already exist, skipping...");
      createdUsers = await db.select().from(users);
    } else {
      console.log("👤 Creating demo users...");
      createdUsers = await db
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
    }

    // Create provider profiles (if empty)
    if (existingProviders.length > 0) {
      console.log("⏭️  Provider profiles already exist, skipping...");
    } else {
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
    
      console.log("\n📋 Provider accounts created:");
      console.log("─".repeat(60));
      console.log(`   ${providerCount} provider accounts (email format: firstname.lastname.location@ikag.test)`);
      console.log("   Example provider emails:");
      providerEmails.slice(0, 5).forEach(email => console.log(`     - ${email}`));
      if (providerCount > 5) {
        console.log(`     ... and ${providerCount - 5} more`);
      }
      console.log(`   All providers use password: ${DEMO_PASSWORD}`);
      console.log(`   Note: ~20% of providers are set as unavailable, ~12% are unverified`);
    }

    // Seed agencies
    const existingAgencies = await db.select().from(agencies).limit(1);
    if (existingAgencies.length > 0) {
      console.log("⏭️  Agencies already exist, skipping...");
    } else {
      console.log("\n🏢 Creating demo agencies...");
      const adminUser = createdUsers.find((u) => u.email === "admin@ikag.test");
      
      // Get some provider users to add as agency members
      const providerUsers = await db.select().from(users).where(sql`role = 'provider'`).limit(20);
      
      let agencyCount = 0;
      const agencyOwnerEmails: string[] = [];
      
      for (const agencyData of demoAgencies) {
        // Create users for all owners/managers defined in the agency
        const agencyUserMembers: Array<{ user: typeof users.$inferSelect; role: "owner" | "manager" | "provider" }> = [];
        
        for (const ownerDef of agencyData.owners) {
          const userEmail = `${ownerDef.firstName.toLowerCase()}.${ownerDef.lastName.toLowerCase().replace(/'/g, "")}@${agencyData.name.toLowerCase().replace(/\s+/g, "")}.ikag.test`;
          const userName = `${ownerDef.firstName} ${ownerDef.lastName}`;
          
          const [agencyUser] = await db
            .insert(users)
            .values({
              email: userEmail,
              name: userName,
              role: "provider",
              emailVerified: true,
            })
            .returning();

          // Create account for the user
          await db.insert(accounts).values({
            id: randomUUID().replace(/-/g, ""),
            userId: agencyUser.id,
            accountId: agencyUser.id,
            providerId: "credential",
            password: hashedPassword,
          });

          agencyUserMembers.push({ user: agencyUser, role: ownerDef.role });
          agencyOwnerEmails.push(userEmail);
        }

        // The first owner is the primary owner
        const primaryOwner = agencyUserMembers.find(m => m.role === "owner") || agencyUserMembers[0];

        // Create agency with PostGIS location
        const result = await db.execute(sql`
          INSERT INTO agencies (name, description, email, phone, website, location, address, status, is_active, owner_id, verified_at, verified_by)
          VALUES (
            ${agencyData.name},
            ${agencyData.description},
            ${agencyData.email},
            ${agencyData.phone || null},
            ${agencyData.website || null},
            ST_SetSRID(ST_MakePoint(${agencyData.location.lng}, ${agencyData.location.lat}), 4326)::geography,
            ${agencyData.location.address},
            ${agencyData.verified ? "verified" : "pending"},
            ${true},
            ${primaryOwner.user.id},
            ${agencyData.verified ? new Date() : null},
            ${agencyData.verified ? adminUser?.id || null : null}
          )
          RETURNING id
        `);
        const agency = (result as unknown as { rows: { id: string }[] }).rows[0];

        // Add all agency owners/managers as members
        const agencyMemberRecords: Array<typeof agencyMembers.$inferSelect> = [];
        for (const memberData of agencyUserMembers) {
          const [member] = await db.insert(agencyMembers).values({
            agencyId: agency.id,
            userId: memberData.user.id,
            role: memberData.role,
            isActive: true,
          }).returning();
          agencyMemberRecords.push(member);
        }

        // Add agency services
        const matchingServices = createdServices.filter((s) => agencyData.services.includes(s.name));
        for (const service of matchingServices) {
          const hourlyRate = 800 + Math.floor(Math.random() * 2000); // KSh 800-2800/hr
          await db.insert(agencyServices).values({
            agencyId: agency.id,
            serviceTypeId: service.id,
            hourlyRate: hourlyRate.toString(),
            description: `Professional ${service.name.toLowerCase()} services by ${agencyData.name}`,
            isActive: true,
          });

          // Add services for all agency owners/managers
          for (const memberRecord of agencyMemberRecords) {
            await db.insert(agencyMemberServices).values({
              agencyMemberId: memberRecord.id,
              serviceTypeId: service.id,
              hourlyRate: hourlyRate.toString(),
            });
          }
        }

        // Add some provider users as additional members (2-4 members per agency)
        const memberCount = 2 + Math.floor(Math.random() * 3);
        const shuffledProviders = [...providerUsers].sort(() => Math.random() - 0.5);
        const selectedProviders = shuffledProviders.slice(0, memberCount);

        for (let i = 0; i < selectedProviders.length; i++) {
          const provider = selectedProviders[i];
          
          const [member] = await db.insert(agencyMembers).values({
            agencyId: agency.id,
            userId: provider.id,
            role: "provider",
            isActive: true,
          }).returning();

          // Add member services
          for (const service of matchingServices) {
            const hourlyRate = 700 + Math.floor(Math.random() * 1500);
            await db.insert(agencyMemberServices).values({
              agencyMemberId: member.id,
              serviceTypeId: service.id,
              hourlyRate: hourlyRate.toString(),
            });
          }
        }

        // Add 1-2 external members
        const externalCount = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < externalCount; i++) {
          const externalNames = ["John Doe", "Jane Smith", "Mike Johnson", "Sarah Williams"];
          const [externalMember] = await db.insert(agencyMembers).values({
            agencyId: agency.id,
            isExternal: true,
            externalName: externalNames[i % externalNames.length],
            externalEmail: `external${i + 1}.${agencyData.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
            externalPhone: `+254700${100000 + Math.floor(Math.random() * 900000)}`,
            externalNotes: "External contractor",
            role: "provider",
            isActive: true,
          }).returning();

          // Add member services
          for (const service of matchingServices) {
            const hourlyRate = 600 + Math.floor(Math.random() * 1200);
            await db.insert(agencyMemberServices).values({
              agencyMemberId: externalMember.id,
              serviceTypeId: service.id,
              hourlyRate: hourlyRate.toString(),
            });
          }
        }

        agencyCount++;
      }
      console.log(`   Created ${agencyCount} agencies with members and services`);
      
      console.log("\n📋 Agency owner/manager accounts created:");
      console.log("─".repeat(60));
      agencyOwnerEmails.forEach(email => console.log(`     - ${email}`));
      console.log(`   All agency accounts use password: ${DEMO_PASSWORD}`);
    }

    console.log("\n✅ Seed completed successfully!\n");
    console.log("Demo accounts:");
    console.log("─".repeat(60));
    console.log("| Email                              | Password   | Role     |");
    console.log("─".repeat(60));
    for (const user of demoUsers) {
      console.log(`| ${user.email.padEnd(34)} | ${DEMO_PASSWORD.padEnd(10)} | ${user.role.padEnd(8)} |`);
    }
    console.log("─".repeat(60));
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
