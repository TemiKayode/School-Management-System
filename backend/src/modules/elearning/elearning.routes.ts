import { Router } from 'express';
import * as ctrl from './elearning.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

// Courses
router.get('/courses', ctrl.listCourses);
router.post('/courses', authorize('ADMIN', 'TEACHER'), ctrl.createCourse);
router.get('/courses/:id', ctrl.getCourse);
router.put('/courses/:id', authorize('ADMIN', 'TEACHER'), ctrl.updateCourse);
router.delete('/courses/:id', authorize('ADMIN'), ctrl.deleteCourse);
router.post('/courses/:id/publish', authorize('ADMIN', 'TEACHER'), ctrl.publishCourse);

// Enroll / progress
router.post('/courses/:id/enroll', ctrl.enroll);
router.get('/courses/:id/progress', ctrl.getCourseProgress);

// Lessons
router.post('/courses/:id/lessons', authorize('ADMIN', 'TEACHER'), ctrl.addLesson);
router.put('/lessons/:lessonId', authorize('ADMIN', 'TEACHER'), ctrl.updateLesson);
router.delete('/lessons/:lessonId', authorize('ADMIN', 'TEACHER'), ctrl.deleteLesson);
router.post('/lessons/:lessonId/complete', ctrl.markLessonComplete);

// My courses
router.get('/my-courses', ctrl.myCourses);

export default router;
