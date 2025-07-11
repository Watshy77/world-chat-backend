const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const authenticate = require('../middlewares/authenticate');

router.post('/:targetUserId', authenticate, async (req, res) => {
    const targetUserId = parseInt(req.params.targetUserId, 10);
    const userId = req.user.id;

    let room = await prisma.room.findFirst({
        where: {
            isPrivate: true,
            members: { some: { userId } },
            AND: { members: { some: { userId: targetUserId } } },
        },
        include: { members: true },
    });

    if (!room) {
        room = await prisma.room.create({
            data: {
                name: `dm_${userId}_${targetUserId}`,
                isPrivate: true,
                isDM: true,
                ownerId: userId,
                members: {
                    create: [
                        { userId },
                        { userId: targetUserId },
                    ],
                },
            },
            include: { members: true },
        });
    }

    res.json({ id: room.id, name: room.name });
});

module.exports = router;