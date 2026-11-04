import { Router } from 'express';
import * as authController from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { loginSchema, registerSchema, changePasswordSchema } from './auth.schema';

const router = Router();

// Accounts can only be created by an authenticated administrator.
router.post('/register', authenticate, authorize('ADMIN'), validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.post('/mfa/enable', authenticate, authController.enableMFA);
router.post('/mfa/verify', authenticate, authController.verifyMFA);
router.post('/mfa/disable', authenticate, authController.disableMFA);
router.get('/me', authenticate, authController.getMe);

export default router;
