import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { authRouter } from "./routes/auth.js";
import { assertAccessSecretInProduction } from "./tokens.js";

assertAccessSecretInProduction();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(helmet());
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, try again later" },
});

app.use("/api/register", authLimiter);
app.use("/api/login", authLimiter);
app.use("/api/refresh", authLimiter);

app.use("/api", authRouter);

app.listen(PORT, () => {
  console.log(`Auth service http://localhost:${PORT}`);
});

