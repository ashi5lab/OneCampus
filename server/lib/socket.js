const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, CLIENT_ORIGIN } = require('../config/env');
const db = require('../config/db');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: CLIENT_ORIGIN,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      // Allow passing token in auth.token for ease of setup with socket.io-client
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }

      // Verify the tenant is active and valid (just like tenantResolver)
      const tenantDomain = decoded.tenant;
      const result = await db.query(
        "SELECT * FROM public.onec_tenants WHERE domain = $1 AND is_active = true AND status = 'approved'",
        [tenantDomain]
      );
      
      const tenant = result.rows[0];
      if (!tenant) {
        return next(new Error('Authentication error: Tenant not found or inactive'));
      }

      // Attach user and tenant context to the socket
      socket.user = decoded;
      socket.tenant = tenant;

      next();
    } catch (err) {
      console.error('Socket authentication error:', err);
      next(new Error('Internal server error during socket auth'));
    }
  });

  io.on('connection', (socket) => {
    // Join a personal room for direct messages and targeted notifications
    if (socket.tenant && socket.user) {
      const personalRoom = `${socket.tenant.domain}_user_${socket.user.userId}`;
      socket.join(personalRoom);
    }

    // Rooms are scoped to tenant_cohortId to prevent cross-tenant leakage
    // if cohort IDs happen to overlap between schemas (they do start at 1).
    socket.on('join_class', (cohortId) => {
      if (!cohortId) return;
      const room = `${socket.tenant.domain}_cohort_${cohortId}`;
      socket.join(room);
    });

    socket.on('leave_class', (cohortId) => {
      if (!cohortId) return;
      const room = `${socket.tenant.domain}_cohort_${cohortId}`;
      socket.leave(room);
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

// Helper to broadcast events to a specific cohort room
function emitToCohort(tenantDomain, cohortId, event, data) {
  if (!io) return; // fail gracefully if not initialized
  const room = `${tenantDomain}_cohort_${cohortId}`;
  io.to(room).emit(event, data);
}

// Helper to broadcast events to a specific user
function emitToUser(tenantDomain, userId, event, data) {
  if (!io) return; // fail gracefully if not initialized
  const room = `${tenantDomain}_user_${userId}`;
  io.to(room).emit(event, data);
}

module.exports = { initSocket, getIo, emitToCohort, emitToUser };
