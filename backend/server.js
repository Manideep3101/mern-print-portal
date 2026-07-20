require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Ensure local uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 2. Configure Multer disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB limit

// 3. Define MongoDB Schema (auto-deletes after 24h as a backup safety net)
const FileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  storedFilename: { type: String, required: true },
  size: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});
const PrintFile = mongoose.model('PrintFile', FileSchema);

// 4. ROUTE: Upload a new document
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const newFile = new PrintFile({
      originalName: req.file.originalname,
      storedFilename: req.file.filename,
      size: req.file.size
    });

    await newFile.save();
    res.status(201).json(newFile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// 5. ROUTE: Get all uploaded files for the Dashboard
app.get('/api/files', async (req, res) => {
  try {
    // Return files sorted by newest first
    const files = await PrintFile.find().sort({ createdAt: -1 });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// 6. ROUTE: Download a specific file by its MongoDB ID
app.get('/api/download/:id', async (req, res) => {
  try {
    const fileDoc = await PrintFile.findById(req.params.id);
    if (!fileDoc) return res.status(404).json({ error: 'File not found or expired' });

    const filePath = path.join(__dirname, 'uploads', fileDoc.storedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File no longer exists on disk' });
    }

    res.download(filePath, fileDoc.originalName);
  } catch (err) {
    res.status(500).json({ error: 'Error downloading file' });
  }
});

// 7. ROUTE: Delete a file (from disk AND database)
app.delete('/api/files/:id', async (req, res) => {
  try {
    const fileDoc = await PrintFile.findById(req.params.id);
    if (!fileDoc) return res.status(404).json({ error: 'File not found' });

    // Delete physical file from uploads folder
    const filePath = path.join(__dirname, 'uploads', fileDoc.storedFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete record from MongoDB
    await PrintFile.findByIdAndDelete(req.params.id);
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting file' });
  }
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB Local');
    app.listen(process.env.PORT || 5000, () => console.log(`Server running on port ${process.env.PORT || 5000}`));
  })
  .catch(err => console.error('Database connection error:', err));