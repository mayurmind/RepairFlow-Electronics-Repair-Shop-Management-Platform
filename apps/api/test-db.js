const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const tickets = await prisma.repairTicket.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      customer: true,
      assignedTechnician: true
    }
  });

  console.log("RECENT 20 REPAIR TICKETS:");
  tickets.forEach(t => {
    console.log(`ID: ${t.id}, Num: ${t.ticketNumber}, Cust: ${t.customer?.fullName}, Tech: ${t.assignedTechnician?.fullName || "NONE"}, Status: ${t.status}, Created: ${t.createdAt.toISOString()}`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
