const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const dmRoutes = require('./routes/dmRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// ✅ Montage correct des routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/users', userRoutes);

// Fallback 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Socket.IO setup (appel à ton setupSocket)
const { setupSocket } = require('./socket/socketHandler');
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
setupSocket(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
