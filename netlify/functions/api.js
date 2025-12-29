import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import multer from 'multer';

const app = express();
app.use(cors());

// In-memory upload layout (Netlify functions simplify this into event body usually, but multer helps with express compat)
// Note: In Netlify Functions, binary handling can be tricky. We might need 'serverless-http' config.
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: "Hello from Node.js Express Backend!" });
});

router.get('/health', (req, res) => {
    res.json({ status: "ok", environment: "nodejs" });
});

app.use('/api', router);

export const handler = serverless(app);
