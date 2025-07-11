const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    // 🔐 Création des utilisateurs
    const passwordHash = await bcrypt.hash('password123', 10);

    const watshy = await prisma.user.upsert({
        where: { username: 'watshy' },
        update: {},
        create: {
            username: 'watshy',
            password: passwordHash,
            role: 'admin',
        },
    });

    const alice = await prisma.user.upsert({
        where: { username: 'alice' },
        update: {},
        create: {
            username: 'alice',
            password: passwordHash,
        },
    });

    const bob = await prisma.user.upsert({
        where: { username: 'bob' },
        update: {},
        create: {
            username: 'bob',
            password: passwordHash,
        },
    });

    console.log('✔️ Utilisateurs créés : watshy, alice, bob');

    // 🌐 Création du canal public Monde (si pas déjà fait)
    await prisma.channel.upsert({
        where: { name: 'Monde' },
        update: {},
        create: {
            name: 'Monde',
            isPublic: true,
            ownerId: watshy.id,
            users: {
                create: { userId: watshy.id },
            },
        },
    });

    console.log('✔️ Canal public "Monde" créé');

    // 🔒 Canal privé "Projet X" créé par Watshy
    const projetX = await prisma.channel.create({
        data: {
            name: 'Projet X',
            isPublic: false,
            ownerId: watshy.id,
            users: {
                create: { userId: watshy.id }, // Watshy est dans son canal
            },
        },
    });

    // ➕ Ajout de Alice dans le canal Projet X
    await prisma.channelUser.create({
        data: {
            userId: alice.id,
            channelId: projetX.id,
        },
    });

    console.log('✔️ Canal privé "Projet X" créé et partagé avec Alice');
}

main()
    .then(() => console.log('Données d’exemple insérées.'))
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
