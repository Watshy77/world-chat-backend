const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const authenticate = require('../middlewares/authenticate');

// Liste de tous les utilisateurs sauf soi-même
router.get('/', authenticate, async (req, res) => {
    const users = await prisma.user.findMany({
        where: { id: { not: req.user.id } },
        select: { id: true, username: true },
    });

    res.json(users);
});

module.exports = router;
