import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

// Endpointy POST zgodnie ze standardem RESTful API
router.post('/register', register);
router.post('/login', login);

export default router;