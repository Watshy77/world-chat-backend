const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.channel.upsert({
        where: { name: 'Monde' },
        update: {},
        create: { name: 'Monde', isPublic: true },
    });
    console.log('Canal "Monde" créé.');
}

main().finally(() => prisma.$disconnect());