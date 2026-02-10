import express from 'express';
import uploadsRouter from './routes/uploads';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', uploadsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});