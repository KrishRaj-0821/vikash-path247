import { db } from "../src/lib/db";

async function main() {
  console.log("🌱 Seeding Vikash Path database...");

  // Clean existing data
  await db.notification.deleteMany();
  await db.badge.deleteMany();
  await db.resolution.deleteMany();
  await db.budgetEstimate.deleteMany();
  await db.vote.deleteMany();
  await db.complaint.deleteMany();
  await db.cluster.deleteMany();
  await db.user.deleteMany();

  // ---- Citizens ----
  const citizen1 = await db.user.create({
    data: {
      role: "CITIZEN",
      name: "Ramesh Kumar",
      phone: "9876500001",
      email: "ramesh.kumar@gmail.com",
      swachhCoins: 320,
      verified: true,
      badges: {
        create: [
          { badgeType: "SWACHHTA_YODHA" },
          { badgeType: "FIRST_REPORT" },
        ],
      },
    },
  });

  const citizen2 = await db.user.create({
    data: {
      role: "CITIZEN",
      name: "Sunita Devi",
      phone: "9876500002",
      email: "sunita.devi@gmail.com",
      swachhCoins: 185,
      verified: true,
      badges: {
        create: [{ badgeType: "GRAM_VEER" }],
      },
    },
  });

  const citizen3 = await db.user.create({
    data: {
      role: "CITIZEN",
      name: "Arjun Singh",
      phone: "9876500003",
      email: "arjun.singh@gmail.com",
      swachhCoins: 410,
      verified: true,
      badges: {
        create: [
          { badgeType: "COMMUNITY_LEADER" },
          { badgeType: "SWACHHTA_YODHA" },
          { badgeType: "FIRST_REPORT" },
        ],
      },
    },
  });

  const citizen4 = await db.user.create({
    data: {
      role: "CITIZEN",
      name: "Priya Sharma",
      phone: "9876500004",
      email: "priya.sharma@gmail.com",
      swachhCoins: 95,
      verified: false,
    },
  });

  // ---- Municipal Officials ----
  const official1 = await db.user.create({
    data: {
      role: "MUNICIPAL",
      name: "Anil Prasad Mehta",
      email: "a.p.mehta@nagarnigam.gov.in",
      employeeId: "MUN-BHR-2014-0892",
      department: "Roads & Infrastructure",
      govtDomain: "nagarnigam.gov.in",
      swachhCoins: 0,
      verified: true,
      badges: {
        create: [{ badgeType: "VERIFIED_OFFICIAL" }],
      },
    },
  });

  const official2 = await db.user.create({
    data: {
      role: "MUNICIPAL",
      name: "Kavita Nair",
      email: "k.nair@nagarnigam.gov.in",
      employeeId: "MUN-SWB-2017-0451",
      department: "Solid Waste Management",
      govtDomain: "nagarnigam.gov.in",
      swachhCoins: 0,
      verified: true,
      badges: {
        create: [{ badgeType: "VERIFIED_OFFICIAL" }],
      },
    },
  });

  // ---- Complaints ----
  // Complaint 1: Pothole (clustered, high priority)
  const complaint1 = await db.complaint.create({
    data: {
      title: "Gaddha near Mahatma Gandhi Marg",
      description:
        "Bara gaddha hai sadak pe. Pani bhara hai andar. Do wheelara gir gaya kal. Jaldi repair karo.",
      category: "POTHOLE",
      severity: "HIGH",
      status: "VOTING",
      address: "Mahatma Gandhi Marg, Ward 12, Bhagalpur",
      lat: 25.2425,
      lng: 86.9842,
      ward: "Ward 12",
      imageUrl: "/samples/pothole1.png",
      voiceLang: "Hindi",
      audioTranscript:
        "There is a large pothole on the road. It is filled with water. A two-wheeler fell yesterday. Please repair it quickly.",
      aiAnalysis:
        "Detected: Large pothole (~1.2m diameter) with stagnant water accumulation. Severity: HIGH. Risk: Two-wheeler accidents likely, waterlogging breeds mosquitoes. Immediate repair recommended.",
      priorityScore: 87.5,
      reporterId: citizen1.id,
    },
  });

  // Complaint 2: duplicate of complaint1 (same location, for clustering demo)
  const complaint2 = await db.complaint.create({
    data: {
      title: "Pothole MG Road — dangerous for bikes",
      description:
        "Bahut bada gaddha hai. Traffic bahut hai yahan. Accident ho sakta hai.",
      category: "POTHOLE",
      severity: "HIGH",
      status: "VOTING",
      address: "MG Marg, Ward 12, Bhagalpur",
      lat: 25.2426,
      lng: 86.9844,
      ward: "Ward 12",
      voiceLang: "Hinglish",
      audioTranscript:
        "There is a very big pothole. There is a lot of traffic here. An accident can happen.",
      priorityScore: 82.0,
      reporterId: citizen2.id,
    },
  });

  // Complaint 3: Garbage
  const complaint3 = await db.complaint.create({
    data: {
      title: "Kachra pile near Subhash Chowk",
      description:
        "Kachra ka pahad hai yahan. Stray dogs bikhar gaye. Smell bahut aati hai. Safai karamchari nahi aata 4 din se.",
      category: "GARBAGE",
      severity: "MEDIUM",
      status: "VOTING",
      address: "Subhash Chowk, Ward 8, Bhagalpur",
      lat: 25.2410,
      lng: 86.9801,
      ward: "Ward 8",
      imageUrl: "/samples/garbage1.png",
      voiceLang: "Hindi",
      audioTranscript:
        "There is a mountain of garbage here. Stray dogs are scattered. There is a lot of smell. The sanitation worker has not come for 4 days.",
      aiAnalysis:
        "Detected: Large pile of mixed household waste (~2m³) with plastic bags. Stray dogs present. Health risk: Fly/mosquito breeding, foul odor. Category: GARBAGE. Recommend immediate clearance + disinfection.",
      priorityScore: 74.0,
      reporterId: citizen3.id,
    },
  });

  // Complaint 4: Streetlight
  const complaint4 = await db.complaint.create({
    data: {
      title: "Streetlight broken on Station Road",
      description: "Light nahi jal raha. Raat mein andhera. Chori ke chances badh gaye.",
      category: "STREETLIGHT",
      severity: "MEDIUM",
      status: "PENDING",
      address: "Station Road, Ward 5, Bhagalpur",
      lat: 25.2435,
      lng: 86.9855,
      ward: "Ward 5",
      imageUrl: "/samples/streetlight1.png",
      aiAnalysis:
        "Detected: Non-functional streetlight pole. Surrounding area in darkness. Security risk: Theft/accident potential at night. Recommend bulb/fixture replacement within 48 hours.",
      priorityScore: 58.0,
      reporterId: citizen4.id,
    },
  });

  // Complaint 5: Drainage
  const complaint5 = await db.complaint.create({
    data: {
      title: "Overflowing drain near Hanuman Mandir",
      description: "Naala overflow ho gaya. Gali mein pani. Bimari failne ka khatra.",
      category: "DRAINAGE",
      severity: "HIGH",
      status: "VOTING",
      address: "Hanuman Mandir Gali, Ward 12, Bhagalpur",
      lat: 25.2428,
      lng: 86.9848,
      ward: "Ward 12",
      imageUrl: "/samples/drainage1.png",
      voiceLang: "Bhojpuri",
      audioTranscript:
        "The drain has overflowed. There is water in the lane. Risk of disease spreading.",
      aiAnalysis:
        "Detected: Overflowing open drain with dirty water on street. Health risk: Waterborne diseases (cholera, dengue). Severity: HIGH. Recommend desilting + chemical treatment.",
      priorityScore: 80.0,
      reporterId: citizen1.id,
    },
  });

  // Complaint 6: Resolved (for Jan Samvaad demo)
  const complaint6 = await db.complaint.create({
    data: {
      title: "Garbage cleared at Tilak Chowk",
      description: "Kachra hata diya gaya. Safai ho gayi.",
      category: "GARBAGE",
      severity: "MEDIUM",
      status: "RESOLVED",
      address: "Tilak Chowk, Ward 3, Bhagalpur",
      lat: 25.2400,
      lng: 86.9820,
      ward: "Ward 3",
      priorityScore: 70.0,
      reporterId: citizen2.id,
    },
  });

  await db.resolution.create({
    data: {
      complaintId: complaint6.id,
      resolvedBy: official2.id,
      proofImageUrl: "/samples/garbage1.png",
      resolutionNote:
        "Kachra clearance completed. 2 trucks dispatched. Area disinfected with bleaching powder. Complaint resolved within 36 hours of approval.",
      actualCost: 8500,
    },
  });

  // ---- Votes ----
  await db.vote.createMany({
    data: [
      { complaintId: complaint1.id, userId: citizen1.id },
      { complaintId: complaint1.id, userId: citizen2.id },
      { complaintId: complaint1.id, userId: citizen3.id },
      { complaintId: complaint1.id, userId: citizen4.id },
      { complaintId: complaint2.id, userId: citizen1.id },
      { complaintId: complaint2.id, userId: citizen3.id },
      { complaintId: complaint3.id, userId: citizen1.id },
      { complaintId: complaint3.id, userId: citizen2.id },
      { complaintId: complaint3.id, userId: citizen4.id },
      { complaintId: complaint5.id, userId: citizen2.id },
      { complaintId: complaint5.id, userId: citizen3.id },
      { complaintId: complaint5.id, userId: citizen4.id },
    ],
  });

  // ---- Cluster (potholes near MG Marg) ----
  const cluster1 = await db.cluster.create({
    data: {
      name: "MG Marg Pothole Cluster",
      centerLat: 25.24255,
      centerLng: 86.9843,
      radius: 50,
      category: "POTHOLE",
      complaintCount: 2,
      totalVotes: 6,
      priorityScore: 86.5,
      status: "VOTING",
      summary:
        "2 complaints of severe potholes within 50m of MG Marg, Ward 12. Combined community concern: 6 votes. Risk: Two-wheeler accidents + waterlogging. Recommended immediate road resurfacing.",
    },
  });

  await db.complaint.updateMany({
    where: { id: { in: [complaint1.id, complaint2.id] } },
    data: { clusterId: cluster1.id, status: "CLUSTERED" },
  });

  // ---- Budget Estimate (for the cluster / complaint1) ----
  await db.budgetEstimate.create({
    data: {
      complaintId: complaint1.id,
      estimatedCost: 42500,
      costMin: 35000,
      costMax: 52000,
      materials:
        '[{"item":"Cold mix asphalt","qty":"2 ton","cost":16000},{"item":"Crushed aggregate","qty":"3 cum","cost":9000},{"item":"Tack coat bitumen","qty":"50 ltr","cost":4500},{"item":"Labor","qty":"8 person-days","cost":8000},{"item":"Equipment rental","qty":"1 day","cost":5000}]',
      timeline: "3-5 working days",
      engineeringDraft:
        "ENGINEERING DRAFT — MG Marg Pothole Remediation\n\nScope: Excavate damaged asphalt (approx 4 sqm), lay new CC base (150mm), apply tack coat, and surface with 50mm cold mix asphalt. Provide proper camber for drainage. Install warning signage during curing.\n\nMaterials: Cold mix asphalt (2 ton), crushed aggregate (3 cum), tack coat bitumen (50 ltr).\nLabor: 2 masons + 4 helpers × 2 days.\nEquipment: Road roller (1 day), breaker machine.\n\nEstimated Cost: ₹42,500 (range ₹35,000–₹52,000 incl. contingency).\nTimeline: 3–5 working days, weather permitting.\nRisk Level: LOW. Quality check: Core test after 7 days.",
      laborRequired: "2 masons, 4 helpers (2 days)",
      equipmentNeeded: "Road roller, breaker machine, hand tools",
      riskLevel: "LOW",
      createdBy: official1.id,
    },
  });

  // ---- Notifications (Jan Samvaad) ----
  await db.notification.create({
    data: {
      userId: citizen2.id,
      complaintId: complaint6.id,
      type: "RESOLUTION_ALERT",
      title: "Aapki complaint resolve ho gayi!",
      message:
        "Tilak Chowk garbage clearance complaint ko Municipal Corporation ne resolve kar diya hai. Proof uploaded. Kripya verify karein.",
      isRead: false,
    },
  });

  console.log("✅ Seed complete!");
  console.log(`   Citizens: 4, Officials: 2, Complaints: 6, Clusters: 1, Budget estimates: 1`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
