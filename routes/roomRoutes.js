const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const authenticate = require('../middlewares/authenticate');

/* Liste des salons accessibles */
router.get('/', authenticate, async (req, res) => {
    const rooms = await prisma.room.findMany({
        where: {
            isDM: false,
            OR: [
                { isPrivate: false },
                { members: { some: { userId: req.user.id } } },
            ],
        },
        include: { owner: true },
    });

    res.json(rooms);
});

/* Détails d’un salon */
router.get('/:id', authenticate, async (req, res) => {
    const roomId = parseInt(req.params.id);

    const membership = await prisma.roomMember.findFirst({
        where: { roomId, userId: req.user.id },
    });

    const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { owner: true },
    });

    if (!room || (room.isPrivate && !membership && room.ownerId !== req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    res.json(room);
});

/* Liste des messages d’un salon */
router.get('/:id/messages', authenticate, async (req, res) => {
    const { id } = req.params;
    if (id === 'Monde') return res.json([]);

    const messages = await prisma.message.findMany({
        where: { roomId: Number(id) },
        include: { sender: true },
        orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
});

/* Création d’un salon */
router.post('/', authenticate, async (req, res) => {
    const { name, isPrivate = true } = req.body;

    const newRoom = await prisma.room.create({
        data: {
            name,
            isPrivate,
            ownerId: req.user.id,
        },
    });

    await prisma.roomMember.create({
        data: { roomId: newRoom.id, userId: req.user.id },
    });

    res.status(201).json(newRoom);
});

/* Modification d’un salon */
router.put('/:id', authenticate, async (req, res) => {
    const roomId = parseInt(req.params.id);
    const { name, isPrivate } = req.body;

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    const updatedRoom = await prisma.room.update({
        where: { id: roomId },
        data: { name, isPrivate },
    });

    res.json(updatedRoom);
});

/* Suppression d’un salon */
router.delete('/:id', authenticate, async (req, res) => {
    const roomId = parseInt(req.params.id);

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.ownerId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    await prisma.roomMember.deleteMany({ where: { roomId } });
    await prisma.message.deleteMany({ where: { roomId } });
    await prisma.room.delete({ where: { id: roomId } });

    res.status(204).send();
});

module.exports = router;