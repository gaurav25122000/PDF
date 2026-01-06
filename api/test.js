import express from 'express';

export default function handler(req, res) {
  const app = express(); // verify express works
  res.status(200).json({ message: 'API is working with EXPRESS' });
}

