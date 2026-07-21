import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { verifyAccessToken } from "../services/token.service";
import { env } from "../config/env";
import { logger } from "../config/logger";

let io: SocketIOServer | undefined;

export function initSocketServer(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Authentication required"));
      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const businessId = socket.data.user?.businessId as string | undefined;
    if (businessId) socket.join(`business:${businessId}`);

    logger.debug({ userId: socket.data.user?.sub }, "Socket connected");

    socket.on("disconnect", () => {
      logger.debug({ userId: socket.data.user?.sub }, "Socket disconnected");
    });
  });

  return io;
}

/** Emit a realtime event to every connected client belonging to a business (used for notifications, stock alerts, order updates). */
export function emitToBusiness(businessId: string, event: string, payload: unknown) {
  io?.to(`business:${businessId}`).emit(event, payload);
}
