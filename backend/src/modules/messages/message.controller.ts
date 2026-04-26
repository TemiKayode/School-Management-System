import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/apiResponse';
import { getIO } from '../../config/socket';

export async function listConversations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId: req.user!.id } } },
      include: {
        participants: { include: { user: { select: { name: true, avatar: true, role: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return sendSuccess(res, conversations);
  } catch (err) { next(err); }
}

export async function getMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      include: { sender: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return sendSuccess(res, messages);
  } catch (err) { next(err); }
}

export async function send(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { conversationId, recipientId, content } = req.body;

    let convId = conversationId;
    if (!convId) {
      // Find or create 1-1 conversation
      const existing = await prisma.conversation.findFirst({
        where: {
          AND: [
            { participants: { some: { userId: req.user!.id } } },
            { participants: { some: { userId: recipientId } } },
          ],
        },
      });

      if (existing) {
        convId = existing.id;
      } else {
        const conv = await prisma.conversation.create({
          data: {
            participants: {
              create: [{ userId: req.user!.id }, { userId: recipientId }],
            },
          },
        });
        convId = conv.id;
      }
    }

    const message = await prisma.message.create({
      data: { conversationId: convId, senderId: req.user!.id, content },
      include: { sender: { select: { name: true, avatar: true } } },
    });

    await prisma.conversation.update({ where: { id: convId }, data: { updatedAt: new Date() } });

    // Real-time delivery
    getIO().to(`user:${recipientId}`).emit('message:new', message);

    return sendSuccess(res, message, 'Sent', 201);
  } catch (err) { next(err); }
}
