import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { streamChatResponse } from "../services/ai.service";

export const chat = asyncHandler(async (req: Request, res: Response) => {
  const { message, history = [] } = req.body as {
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };
  const businessId = req.user!.businessId!;

  if (!message?.trim()) {
    res.status(400).json({ success: false, message: "Message is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  await streamChatResponse(
    businessId,
    message,
    history,
    (text) => {
      res.write(`data: ${JSON.stringify({ type: "text", content: text })}\n\n`);
    },
    () => {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    },
    (errorMsg) => {
      res.write(`data: ${JSON.stringify({ type: "error", message: errorMsg })}\n\n`);
      res.end();
    },
  );
});
