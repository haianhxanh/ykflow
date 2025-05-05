import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    // Clear existing data first
    await prisma.$executeRaw`TRUNCATE TABLE "Request" CASCADE`;

    // Create dummy requests
    const requests = [
      // Original requests
      {
        order_name: "#1234",
        order_id: "1234",
        order_email: "jan.novak@example.com",
        original_start_date: new Date("2024-03-01"),
        original_end_date: new Date("2024-03-30"),
        pause_start_date: new Date("2024-03-01"),
        pause_end_date: new Date("2024-03-15"),
        item_title: "Program Hubnutí",
        item_id: "prog_001",
        new_start_date: new Date("2024-03-16"),
        new_end_date: new Date("2024-03-30"),
        status: "PENDING",
        request_date: new Date("2024-02-20"),
        user_note: "Potřebuji pauzu kvůli dovolené",
        update_history: [],
      },
      {
        order_name: "#1235",
        order_id: "1235",
        order_email: "petra.svobodova@example.com",
        original_start_date: new Date("2024-03-10"),
        original_end_date: new Date("2024-04-04"),
        pause_start_date: new Date("2024-03-10"),
        pause_end_date: new Date("2024-03-20"),
        item_title: "Program Kondice",
        item_id: "prog_002",
        new_start_date: new Date("2024-03-21"),
        new_end_date: new Date("2024-04-04"),
        status: "PENDING",
        request_date: new Date("2024-02-21"),
        user_note: "Zdravotní důvody",
        update_history: [],
      },
      // Additional requests
      {
        order_name: "#1239",
        order_id: "1239",
        order_email: "lucie.krejcova@example.com",
        original_start_date: new Date("2024-03-05"),
        original_end_date: new Date("2024-04-03"),
        pause_start_date: new Date("2024-03-05"),
        pause_end_date: new Date("2024-03-19"),
        item_title: "Program Hubnutí Plus",
        item_id: "prog_003",
        new_start_date: new Date("2024-03-20"),
        new_end_date: new Date("2024-04-03"),
        status: "PENDING",
        request_date: new Date("2024-02-22"),
        user_note: "Služební cesta do zahraničí",
        update_history: [],
      },
      {
        order_name: "#1240",
        order_id: "1240",
        order_email: "marek.dvorak@example.com",
        original_start_date: new Date("2024-03-15"),
        original_end_date: new Date("2024-04-13"),
        pause_start_date: new Date("2024-03-15"),
        pause_end_date: new Date("2024-03-29"),
        item_title: "Program Kondice Premium",
        item_id: "prog_004",
        new_start_date: new Date("2024-03-30"),
        new_end_date: new Date("2024-04-13"),
        status: "PENDING",
        request_date: new Date("2024-02-23"),
        user_note: "Operace kolene",
        update_history: [],
      },
      // Approved requests
      {
        order_name: "#1241",
        order_id: "1241",
        order_email: "tereza.novotna@example.com",
        original_start_date: new Date("2024-02-28"),
        original_end_date: new Date("2024-03-28"),
        pause_start_date: new Date("2024-02-28"),
        pause_end_date: new Date("2024-03-13"),
        item_title: "Program Hubnutí",
        item_id: "prog_001",
        new_start_date: new Date("2024-03-14"),
        new_end_date: new Date("2024-03-28"),
        status: "APPROVED",
        request_date: new Date("2024-02-15"),
        merchant_note: "Schváleno - zdravotní důvody doloženy",
        user_note: "Rekonvalescence po operaci",
        update_history: [
          {
            timestamp: new Date("2024-02-16T09:30:00Z"),
            updatedBy: "admin_001",
            details: "Schváleno po doložení lékařské zprávy",
          },
        ],
      },
      {
        order_name: "#1242",
        order_id: "1242",
        order_email: "pavel.svoboda@example.com",
        original_start_date: new Date("2024-03-01"),
        original_end_date: new Date("2024-03-30"),
        pause_start_date: new Date("2024-03-01"),
        pause_end_date: new Date("2024-03-15"),
        item_title: "Program Kondice",
        item_id: "prog_002",
        new_start_date: new Date("2024-03-16"),
        new_end_date: new Date("2024-03-30"),
        status: "APPROVED",
        request_date: new Date("2024-02-16"),
        merchant_note: "Schváleno - pracovní cesta",
        user_note: "Dlouhodobá služební cesta v USA",
        update_history: [
          {
            timestamp: new Date("2024-02-17T14:15:00Z"),
            updatedBy: "admin_002",
            details: "Schváleno - doloženo potvrzení od zaměstnavatele",
          },
        ],
      },
      // Rejected requests
      {
        order_name: "#1243",
        order_id: "1243",
        order_email: "martin.prochazka@example.com",
        original_start_date: new Date("2024-03-05"),
        original_end_date: new Date("2024-04-03"),
        pause_start_date: new Date("2024-03-05"),
        pause_end_date: new Date("2024-03-19"),
        item_title: "Program Hubnutí Plus",
        item_id: "prog_003",
        new_start_date: new Date("2024-03-20"),
        new_end_date: new Date("2024-04-03"),
        status: "REJECTED",
        request_date: new Date("2024-02-18"),
        merchant_note: "Zamítnuto - příliš krátká doba od poslední pauzy",
        user_note: "Potřebuji další pauzu",
        update_history: [
          {
            timestamp: new Date("2024-02-19T10:45:00Z"),
            updatedBy: "admin_001",
            details: "Zamítnuto - nedodržen minimální interval mezi pauzami",
          },
        ],
      },
      {
        order_name: "#1244",
        order_id: "1244",
        order_email: "jana.kovarova@example.com",
        original_start_date: new Date("2024-03-10"),
        original_end_date: new Date("2024-04-08"),
        pause_start_date: new Date("2024-03-10"),
        pause_end_date: new Date("2024-03-24"),
        item_title: "Program Kondice Premium",
        item_id: "prog_004",
        new_start_date: new Date("2024-03-25"),
        new_end_date: new Date("2024-04-08"),
        status: "REJECTED",
        request_date: new Date("2024-02-19"),
        merchant_note: "Zamítnuto - chybí odůvodnění",
        user_note: "",
        update_history: [
          {
            timestamp: new Date("2024-02-20T11:30:00Z"),
            updatedBy: "admin_002",
            details: "Zamítnuto - žádost bez uvedení důvodu",
          },
        ],
      },
      // More pending requests
      {
        order_name: "#1245",
        order_id: "1245",
        order_email: "tomas.malik@example.com",
        original_start_date: new Date("2024-03-15"),
        original_end_date: new Date("2024-04-13"),
        pause_start_date: new Date("2024-03-15"),
        pause_end_date: new Date("2024-03-29"),
        item_title: "Program Hubnutí",
        item_id: "prog_001",
        new_start_date: new Date("2024-03-30"),
        new_end_date: new Date("2024-04-13"),
        status: "PENDING",
        request_date: new Date("2024-02-20"),
        user_note: "Lázeňský pobyt",
        update_history: [],
      },
      {
        order_name: "#1246",
        order_id: "1246",
        order_email: "eva.benesova@example.com",
        original_start_date: new Date("2024-03-20"),
        original_end_date: new Date("2024-04-18"),
        pause_start_date: new Date("2024-03-20"),
        pause_end_date: new Date("2024-04-03"),
        item_title: "Program Kondice",
        item_id: "prog_002",
        new_start_date: new Date("2024-04-04"),
        new_end_date: new Date("2024-04-18"),
        status: "PENDING",
        request_date: new Date("2024-02-21"),
        user_note: "Mateřská dovolená",
        update_history: [],
      },
      // More approved requests
      {
        order_name: "#1247",
        order_id: "1247",
        order_email: "petr.hajek@example.com",
        original_start_date: new Date("2024-02-25"),
        original_end_date: new Date("2024-03-25"),
        pause_start_date: new Date("2024-02-25"),
        pause_end_date: new Date("2024-03-10"),
        item_title: "Program Hubnutí Plus",
        item_id: "prog_003",
        new_start_date: new Date("2024-03-11"),
        new_end_date: new Date("2024-03-25"),
        status: "APPROVED",
        request_date: new Date("2024-02-15"),
        merchant_note: "Schváleno - hospitalizace",
        user_note: "Plánovaná operace",
        update_history: [
          {
            timestamp: new Date("2024-02-16T13:20:00Z"),
            updatedBy: "admin_001",
            details: "Schváleno na základě potvrzení o hospitalizaci",
          },
        ],
      },
      {
        order_name: "#1248",
        order_id: "1248",
        order_email: "lenka.machova@example.com",
        original_start_date: new Date("2024-03-01"),
        original_end_date: new Date("2024-03-30"),
        pause_start_date: new Date("2024-03-01"),
        pause_end_date: new Date("2024-03-15"),
        item_title: "Program Kondice Premium",
        item_id: "prog_004",
        new_start_date: new Date("2024-03-16"),
        new_end_date: new Date("2024-03-30"),
        status: "APPROVED",
        request_date: new Date("2024-02-16"),
        merchant_note: "Schváleno - rodinné důvody",
        user_note: "Narození dítěte",
        update_history: [
          {
            timestamp: new Date("2024-02-17T15:45:00Z"),
            updatedBy: "admin_002",
            details: "Schváleno - doložen rodný list",
          },
        ],
      },
      // More rejected requests
      {
        order_name: "#1249",
        order_id: "1249",
        order_email: "david.kral@example.com",
        original_start_date: new Date("2024-03-05"),
        original_end_date: new Date("2024-04-03"),
        pause_start_date: new Date("2024-03-05"),
        pause_end_date: new Date("2024-03-19"),
        item_title: "Program Hubnutí",
        item_id: "prog_001",
        new_start_date: new Date("2024-03-20"),
        new_end_date: new Date("2024-04-03"),
        status: "REJECTED",
        request_date: new Date("2024-02-18"),
        merchant_note: "Zamítnuto - překryv s jinou pauzou",
        user_note: "Dovolená v Itálii",
        update_history: [
          {
            timestamp: new Date("2024-02-19T09:15:00Z"),
            updatedBy: "admin_001",
            details: "Zamítnuto - již existující pauza ve stejném období",
          },
        ],
      },
      {
        order_name: "#1250",
        order_id: "1250",
        order_email: "michaela.vesela@example.com",
        original_start_date: new Date("2024-03-10"),
        original_end_date: new Date("2024-04-08"),
        pause_start_date: new Date("2024-03-10"),
        pause_end_date: new Date("2024-03-24"),
        item_title: "Program Kondice",
        item_id: "prog_002",
        new_start_date: new Date("2024-03-25"),
        new_end_date: new Date("2024-04-08"),
        status: "REJECTED",
        request_date: new Date("2024-02-19"),
        merchant_note: "Zamítnuto - příliš dlouhá pauza",
        user_note: "Dlouhodobý pobyt v zahraničí",
        update_history: [
          {
            timestamp: new Date("2024-02-20T11:30:00Z"),
            updatedBy: "admin_002",
            details:
              "Zamítnuto - požadovaná délka pauzy přesahuje maximální povolenou dobu",
          },
        ],
      },
    ];

    for (const request of requests) {
      await prisma.request.create({
        data: request,
      });
    }

    console.log("✅ Seed data created successfully");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
