import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find front-desk user and their branches
  const actor = await prisma.user.findUnique({
    where: { email: "front.a@repairflow.com" },
    include: { userBranches: true },
  });

  if (!actor) {
    console.error("Actor not found");
    return;
  }

  const branchIds = actor.userBranches.map((ub) => ub.branchId);
  console.log(`Actor branch IDs: ${branchIds}`);

  const andClauses: any[] = [];
  andClauses.push({
    customer: {
      OR: [
        { tickets: { none: {} } },
        { tickets: { some: { branchId: { in: branchIds } } } },
      ],
    },
  });

  const where = { AND: andClauses };

  const devices = await prisma.device.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      customer: {
        select: { id: true, fullName: true, phone: true },
      },
    },
  });

  console.log(`QUERY RESULTS (Total: ${devices.length}):`);
  devices.forEach((d) => {
    console.log(
      `ID: ${d.id}, Brand: ${d.brand}, Model: ${d.model}, SN: ${d.serialNumber}, Cust: ${d.customer?.fullName}`,
    );
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
