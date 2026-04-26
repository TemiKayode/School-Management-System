import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../middleware/errorHandler';

export async function listBooks(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const search = (req.query.search as string) || '';
    const books = await prisma.book.findMany({
      where: search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { author: { contains: search, mode: 'insensitive' } }] } : {},
      orderBy: { title: 'asc' },
    });
    return sendSuccess(res, books);
  } catch (err) { next(err); }
}

export async function addBook(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const book = await prisma.book.create({ data: req.body });
    return sendSuccess(res, book, 'Book added', 201);
  } catch (err) { next(err); }
}

export async function updateBook(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const book = await prisma.book.update({ where: { id: req.params.id }, data: req.body });
    return sendSuccess(res, book);
  } catch (err) { next(err); }
}

export async function borrowBook(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { bookId, studentId, dueDate } = req.body;
    const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
    if (book.availableCopies < 1) throw new AppError('No copies available', 400);

    const [borrowing] = await prisma.$transaction([
      prisma.bookBorrowing.create({ data: { bookId, studentId, dueDate: new Date(dueDate) } }),
      prisma.book.update({ where: { id: bookId }, data: { availableCopies: { decrement: 1 } } }),
    ]);
    return sendSuccess(res, borrowing, 'Book borrowed', 201);
  } catch (err) { next(err); }
}

export async function returnBook(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const borrowing = await prisma.bookBorrowing.findUniqueOrThrow({ where: { id: req.params.id } });
    const [updated] = await prisma.$transaction([
      prisma.bookBorrowing.update({ where: { id: req.params.id }, data: { returnedAt: new Date() } }),
      prisma.book.update({ where: { id: borrowing.bookId }, data: { availableCopies: { increment: 1 } } }),
    ]);
    return sendSuccess(res, updated, 'Book returned');
  } catch (err) { next(err); }
}

export async function listBorrowings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const borrowings = await prisma.bookBorrowing.findMany({
      where: req.query.studentId ? { studentId: req.query.studentId as string } : {},
      include: { book: true, student: true },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, borrowings);
  } catch (err) { next(err); }
}
