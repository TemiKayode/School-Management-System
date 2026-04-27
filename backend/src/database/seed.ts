import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const inDays = (n: number) => new Date(Date.now() + n * 86400000);

async function main() {
  console.log('Seeding database...');
  const hash = await bcrypt.hash('Admin@123', 12);

  // ─── Users ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: { name: 'System Admin', email: 'admin@school.com', password: hash, role: 'ADMIN' },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@school.com' },
    update: {},
    create: { name: 'John Teacher', email: 'teacher@school.com', password: hash, role: 'TEACHER' },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: 'student@school.com' },
    update: {},
    create: { name: 'Jane Student', email: 'student@school.com', password: hash, role: 'STUDENT' },
  });

  // ─── Teacher profile ────────────────────────────────────────────────────────
  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: { userId: teacherUser.id, employeeNo: 'T001', department: 'Mathematics', qualification: 'B.Ed Mathematics' },
  });

  // ─── Subjects ───────────────────────────────────────────────────────────────
  const math = await prisma.subject.upsert({
    where: { code: 'MATH101' },
    update: {},
    create: { name: 'Mathematics', code: 'MATH101', credits: 3 },
  });
  const english = await prisma.subject.upsert({
    where: { code: 'ENG101' },
    update: {},
    create: { name: 'English Language', code: 'ENG101', credits: 3 },
  });
  const science = await prisma.subject.upsert({
    where: { code: 'SCI101' },
    update: {},
    create: { name: 'General Science', code: 'SCI101', credits: 3 },
  });
  const history = await prisma.subject.upsert({
    where: { code: 'HIS101' },
    update: {},
    create: { name: 'History', code: 'HIS101', credits: 2 },
  });

  // Link teacher to subjects
  await prisma.teacher.update({
    where: { id: teacher.id },
    data: { subjects: { connect: [{ id: math.id }, { id: science.id }] } },
  });

  // ─── Class ──────────────────────────────────────────────────────────────────
  const cls = await prisma.class.upsert({
    where: { name: 'Grade 10A' },
    update: {},
    create: {
      name: 'Grade 10A', grade: '10', section: 'A',
      teacherId: teacher.id, academicYear: '2024-2025',
      subjects: { connect: [{ id: math.id }, { id: english.id }, { id: science.id }, { id: history.id }] },
    },
  });

  // ─── Student profile ────────────────────────────────────────────────────────
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id, admissionNo: 'S2024001', classId: cls.id,
      parentName: 'Robert Student', parentEmail: 'parent@school.com',
      parentPhone: '+1 555 000 1234', gender: 'FEMALE',
    },
  });

  // ─── Timetable ──────────────────────────────────────────────────────────────
  const slots = [
    { dayOfWeek: 'MONDAY',    startTime: '08:00', endTime: '09:00', subjectId: math.id,    room: 'Room 101' },
    { dayOfWeek: 'MONDAY',    startTime: '09:00', endTime: '10:00', subjectId: english.id, room: 'Room 102' },
    { dayOfWeek: 'TUESDAY',   startTime: '08:00', endTime: '09:00', subjectId: science.id, room: 'Lab 1' },
    { dayOfWeek: 'TUESDAY',   startTime: '10:00', endTime: '11:00', subjectId: math.id,    room: 'Room 101' },
    { dayOfWeek: 'WEDNESDAY', startTime: '08:00', endTime: '09:00', subjectId: history.id, room: 'Room 103' },
    { dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '10:00', subjectId: english.id, room: 'Room 102' },
    { dayOfWeek: 'THURSDAY',  startTime: '08:00', endTime: '09:00', subjectId: math.id,    room: 'Room 101' },
    { dayOfWeek: 'THURSDAY',  startTime: '10:00', endTime: '11:00', subjectId: science.id, room: 'Lab 1' },
    { dayOfWeek: 'FRIDAY',    startTime: '08:00', endTime: '09:00', subjectId: english.id, room: 'Room 102' },
    { dayOfWeek: 'FRIDAY',    startTime: '09:00', endTime: '10:00', subjectId: history.id, room: 'Room 103' },
  ] as const;

  for (const slot of slots) {
    const exists = await prisma.timetableSlot.findFirst({
      where: { classId: cls.id, dayOfWeek: slot.dayOfWeek, startTime: slot.startTime },
    });
    if (!exists) {
      await prisma.timetableSlot.create({
        data: { ...slot, classId: cls.id, teacherId: teacher.id },
      });
    }
  }

  // ─── Assignments ────────────────────────────────────────────────────────────
  const assignmentDefs = [
    { title: 'Algebra Problem Set 1',  description: 'Solve all problems on pages 45–47', subjectId: math.id,    dueDate: inDays(7),   totalPoints: 100 },
    { title: 'Essay: My Community',    description: 'Write a 500-word essay',             subjectId: english.id, dueDate: inDays(10),  totalPoints: 50 },
    { title: 'Lab Report: Osmosis',    description: 'Complete the osmosis report',         subjectId: science.id, dueDate: inDays(5),   totalPoints: 80 },
    { title: 'History Timeline',       description: 'Create a WWII events timeline',       subjectId: history.id, dueDate: inDays(-3),  totalPoints: 60 },
  ];

  const createdAssignments = [];
  for (const a of assignmentDefs) {
    const exists = await prisma.assignment.findFirst({ where: { title: a.title, classId: cls.id } });
    if (!exists) {
      const created = await prisma.assignment.create({ data: { ...a, classId: cls.id, createdById: teacherUser.id } });
      createdAssignments.push(created);
    } else { createdAssignments.push(exists); }
  }

  // Submission from student on first assignment
  if (createdAssignments[0]) {
    const exists = await prisma.assignmentSubmission.findFirst({
      where: { assignmentId: createdAssignments[0].id, studentId: student.id },
    });
    if (!exists) {
      await prisma.assignmentSubmission.create({
        data: { assignmentId: createdAssignments[0].id, studentId: student.id,
          content: 'Completed all 15 problems. Full working shown.', score: 92, feedback: 'Excellent work!' },
      });
    }
  }

  // ─── Attendance ─────────────────────────────────────────────────────────────
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
  for (const [date, status] of [
    [todayMidnight, 'PRESENT'],
    [new Date(todayMidnight.getTime() - 86400000), 'PRESENT'],
    [new Date(todayMidnight.getTime() - 2 * 86400000), 'LATE'],
  ] as [Date, 'PRESENT' | 'LATE' | 'ABSENT'][]) {
    const exists = await prisma.attendance.findFirst({ where: { studentId: student.id, date } });
    if (!exists) {
      await prisma.attendance.create({
        data: { studentId: student.id, classId: cls.id, date, status, markedById: teacherUser.id },
      });
    }
  }

  // ─── Exams ──────────────────────────────────────────────────────────────────
  const examDefs = [
    { title: 'Mid-Term Mathematics', subjectId: math.id,    examDate: inDays(14), totalMarks: 100, passMark: 50, duration: 120 },
    { title: 'English Language Test', subjectId: english.id, examDate: inDays(21), totalMarks: 80,  passMark: 40, duration: 90 },
    { title: 'Science Practical Exam', subjectId: science.id, examDate: inDays(7),  totalMarks: 50,  passMark: 25, duration: 60 },
  ];

  const createdExams = [];
  for (const e of examDefs) {
    const exists = await prisma.exam.findFirst({ where: { title: e.title, classId: cls.id } });
    if (!exists) {
      const created = await prisma.exam.create({ data: { ...e, classId: cls.id } });
      createdExams.push(created);
    } else { createdExams.push(exists); }
  }

  // Exam result for student
  if (createdExams[0]) {
    const exists = await prisma.examResult.findFirst({ where: { examId: createdExams[0].id, studentId: student.id } });
    if (!exists) {
      await prisma.examResult.create({
        data: { examId: createdExams[0].id, studentId: student.id, score: 88, grade: 'A', remarks: 'Well done' },
      });
    }
  }

  // ─── Fees ───────────────────────────────────────────────────────────────────
  await prisma.fee.upsert({
    where: { id: 'fee-001' },
    update: {},
    create: { id: 'fee-001', name: 'Tuition Fee - Term 1', amount: 500, dueDate: inDays(30), academicYear: '2024-2025' },
  });
  await prisma.fee.upsert({
    where: { id: 'fee-002' },
    update: {},
    create: { id: 'fee-002', name: 'Tuition Fee - Term 2', amount: 500, dueDate: inDays(120), academicYear: '2024-2025' },
  });

  const existingPayment = await prisma.feePayment.findFirst({ where: { studentId: student.id } });
  if (!existingPayment) {
    await prisma.feePayment.create({
      data: { studentId: student.id, feeId: 'fee-001', amount: 500, status: 'PENDING', method: 'CASH' },
    });
  }

  // ─── Announcements ──────────────────────────────────────────────────────────
  const announcementDefs = [
    { title: 'Welcome Back to School', content: 'We are excited to welcome all students back for the new term. Classes begin Monday at 8:00 AM.', audience: ['ALL'], pinned: true },
    { title: 'Parent-Teacher Meeting', content: 'Quarterly parent-teacher meeting is scheduled for next Friday from 2PM to 5PM.', audience: ['ALL'], pinned: false },
    { title: 'Sports Day Registration', content: 'Sports Day is coming! Register with your class teacher by this Friday.', audience: ['STUDENT'], pinned: false },
    { title: 'Staff Professional Development', content: 'All teaching staff must attend the CPD session on Saturday 9AM–1PM.', audience: ['TEACHER'], pinned: false },
  ];

  for (const a of announcementDefs) {
    const exists = await prisma.announcement.findFirst({ where: { title: a.title } });
    if (!exists) {
      await prisma.announcement.create({ data: { ...a, authorId: admin.id } });
    }
  }

  // ─── Library / Books ────────────────────────────────────────────────────────
  const bookDefs = [
    { title: 'Essential Mathematics Grade 10', author: 'David Brown',  isbn: '9780134685991', category: 'Math',       totalCopies: 5, availableCopies: 4 },
    { title: 'Oxford English Grammar',         author: 'John Eastwood', isbn: '9780194313485', category: 'Literature', totalCopies: 8, availableCopies: 8 },
    { title: 'Biology: The Core',              author: 'Eric Simon',    isbn: '9780134163414', category: 'Biology',    totalCopies: 4, availableCopies: 3 },
    { title: 'Physics Fundamentals',           author: 'Paul Tipler',   isbn: '9781464126995', category: 'Physics',    totalCopies: 6, availableCopies: 6 },
    { title: 'World History: Patterns',        author: 'Roger Beck',    isbn: '9780547034883', category: 'History',    totalCopies: 3, availableCopies: 3 },
    { title: 'Chemistry: Matter and Change',   author: 'Buthelezi',     isbn: '9780078892293', category: 'Chemistry',  totalCopies: 5, availableCopies: 5 },
  ];

  for (const b of bookDefs) {
    const exists = await prisma.book.findFirst({ where: { isbn: b.isbn } });
    if (!exists) { await prisma.book.create({ data: b }); }
  }

  // ─── Transport Routes ────────────────────────────────────────────────────────
  const routeDefs = [
    { name: 'Route A - North', vehicleNo: 'BUS-001', capacity: 40, driverName: 'Mike Adams',  driverPhone: '+1 555 100 0001', description: 'Covers North district' },
    { name: 'Route B - South', vehicleNo: 'BUS-002', capacity: 40, driverName: 'Sara Jones',  driverPhone: '+1 555 100 0002', description: 'Covers South district' },
    { name: 'Route C - East',  vehicleNo: 'BUS-003', capacity: 35, driverName: 'Tom Harris',  driverPhone: '+1 555 100 0003', description: 'Covers East district' },
  ];

  for (const r of routeDefs) {
    const exists = await prisma.transportRoute.findFirst({ where: { vehicleNo: r.vehicleNo } });
    if (!exists) { await prisma.transportRoute.create({ data: r }); }
  }

  // ─── E-Learning Courses ──────────────────────────────────────────────────────
  const courseDefs = [
    { title: 'Algebra Mastery',        description: 'Master algebraic equations and graphing', subjectId: math.id,    authorId: teacherUser.id, status: 'PUBLISHED' as const },
    { title: 'English Writing Skills', description: 'Improve essay writing and comprehension',  subjectId: english.id, authorId: teacherUser.id, status: 'PUBLISHED' as const },
    { title: 'Science Experiments',    description: 'Hands-on virtual science experiments',     subjectId: science.id, authorId: teacherUser.id, status: 'PUBLISHED' as const },
    { title: 'Modern World History',   description: 'From World War I to the present day',      subjectId: history.id, authorId: teacherUser.id, status: 'PUBLISHED' as const },
  ];

  const createdCourses = [];
  for (const c of courseDefs) {
    const exists = await prisma.course.findFirst({ where: { title: c.title } });
    if (!exists) { createdCourses.push(await prisma.course.create({ data: c })); }
    else { createdCourses.push(exists); }
  }

  // Enroll student in first two courses
  for (const course of createdCourses.slice(0, 2)) {
    const exists = await prisma.courseEnrollment.findFirst({ where: { courseId: course.id, userId: studentUser.id } });
    if (!exists) {
      await prisma.courseEnrollment.create({ data: { courseId: course.id, userId: studentUser.id } });
    }
  }

  // ─── Notifications ───────────────────────────────────────────────────────────
  const notifDefs = [
    { userId: studentUser.id, title: 'New Assignment', message: 'Algebra Problem Set 1 has been posted. Due in 7 days.' },
    { userId: studentUser.id, title: 'Fee Reminder',   message: 'Tuition Fee Term 1 is due in 30 days.' },
    { userId: teacherUser.id, title: 'Announcement',   message: 'Staff Professional Development session this Saturday.' },
    { userId: admin.id,       title: 'New Student',    message: 'Jane Student has been registered successfully.' },
  ];

  for (const n of notifDefs) {
    const exists = await prisma.notification.findFirst({ where: { userId: n.userId, title: n.title } });
    if (!exists) { await prisma.notification.create({ data: n }); }
  }

  console.log('\n✅ Seed complete!\n');
  console.log('Credentials:');
  console.log('  Admin:   admin@school.com   / Admin@123');
  console.log('  Teacher: teacher@school.com / Admin@123');
  console.log('  Student: student@school.com / Admin@123');
  console.log('\nSeeded: 4 subjects · 10 timetable slots · 4 assignments · 3 exams');
  console.log('        6 books · 3 transport routes · 4 courses · 4 announcements');
}

export { main };

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
