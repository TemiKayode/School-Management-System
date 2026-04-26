import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/apiResponse';

export async function listRoutes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const routes = await prisma.transportRoute.findMany({
      include: { _count: { select: { students: true } } },
    });
    return sendSuccess(res, routes);
  } catch (err) { next(err); }
}

export async function createRoute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const route = await prisma.transportRoute.create({ data: req.body });
    return sendSuccess(res, route, 'Route created', 201);
  } catch (err) { next(err); }
}

export async function updateRoute(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const route = await prisma.transportRoute.update({ where: { id: req.params.id }, data: req.body });
    return sendSuccess(res, route);
  } catch (err) { next(err); }
}

export async function assignStudent(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.student.update({
      where: { id: req.body.studentId },
      data: { transportRouteId: req.params.id },
    });
    return sendSuccess(res, null, 'Student assigned to route');
  } catch (err) { next(err); }
}
