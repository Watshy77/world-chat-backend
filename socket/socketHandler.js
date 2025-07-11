const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

const onlineUsers = new Map();

function setupSocket(io) {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        try {
            const user = jwt.verify(token, JWT_SECRET);
            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        const { user } = socket;
        console.log(`${user.username} connected [${socket.id}]`);

        onlineUsers.set(user.id, socket.id);
        io.emit('user:connected', { userId: user.id, username: user.username });

        socket.join('Monde');

        socket.on('chat:message', async ({ room, message }) => {
            const userId = user.id;
            console.log('➡️ Received room:', room, 'type:', typeof room);

            if (room !== 'Monde') {
                const roomId = Number(room);

                if (!roomId || isNaN(roomId)) {
                    console.error('❌ Invalid room ID provided for message:', room);
                    return;
                }

                try {
                    await prisma.message.create({
                        data: {
                            content: message,
                            room: { connect: { id: roomId } },
                            sender: { connect: { id: userId } },
                        },
                    });
                } catch (err) {
                    console.error('❌ Prisma error creating message:', err);
                    return;
                }
            }

            socket.to(room).emit('chat:message', {
                sender: user.username,
                message,
            });
        });

        socket.on('chat:create', async ({ roomName, isPrivate = true, members = [] }) => {
            const newRoom = await prisma.room.create({
                data: { name: roomName, isPrivate, ownerId: user.id },
            });

            await prisma.roomMember.create({
                data: { roomId: newRoom.id, userId: user.id },
            });

            for (const memberId of members) {
                if (memberId !== user.id) {
                    await prisma.roomMember.create({ data: { roomId: newRoom.id, userId: memberId } });
                }
            }

            socket.join(`room_${newRoom.id}`);
            io.to(`room_${newRoom.id}`).emit('chat:created', { room: newRoom });
        });

        socket.on('chat:join', async (roomId) => {
            if (roomId === 'Monde') {
                socket.join('Monde');
                return;
            }

            const membership = await prisma.roomMember.findFirst({
                where: { roomId: Number(roomId), userId: user.id },
            });

            if (!membership) {
                socket.emit('chat:error', 'Accès refusé au salon');
                return;
            }

            socket.join(roomId);
        });

        socket.on('chat:add_user', async ({ roomId, userId }) => {
            const room = await prisma.room.findUnique({ where: { id: roomId } });
            if (room.ownerId !== user.id) {
                return socket.emit('chat:error', { error: 'Only the owner can add users.' });
            }

            await prisma.roomMember.create({ data: { roomId, userId } });

            const targetSocketId = onlineUsers.get(userId);
            if (targetSocketId) {
                io.sockets.sockets.get(targetSocketId).join(`room_${roomId}`);
                io.to(`room_${roomId}`).emit('chat:user_added', { roomId, userId });
            }
        });

        socket.on('disconnect', () => {
            console.log(`${user.username} disconnected`);
            onlineUsers.delete(user.id);
            io.emit('user:disconnected', { userId: user.id, username: user.username });
        });

        socket.emit(
            'user:list',
            Array.from(onlineUsers.entries()).map(([id, sockId]) => ({ id, socketId: sockId }))
        );
    });
}

module.exports = { setupSocket };