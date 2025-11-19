const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Note = require('../models/Note');
const { protect } = require('../middleware/auth');

// Uploading file with the help of multer
const storage = multer.diskStorage({
  destination: './uploads', // will be created by multer when file will be uploaded 
  // filename (unique)
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// uloading file
const upload = multer({
  storage: storage, // destination and filename
  limits: { fileSize: 10000000 }, // 10MB file size limit for now, later it will be scaled up
  fileFilter: function (req, file, cb) {
    // Allowed extensions
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|ppt|pptx/;
    // Check extension
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime type
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Files of this type are not allowed!');
    }
  },
}).single('file'); // "file" is the filled name to be setup in frontend

// Uploading notes route and controller
router.post('/upload', protect, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.log(err);
      return res.status(400).json({ success: false, message: err });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const { title, subject } = req.body;
    if (!title || !subject) {
      return res.status(400).json({ success: false, message: 'Please provide title and subject' });
    }

    try {
      const newNote = await Note.create({
        title,
        subject,
        viewUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
        filePath: req.file.path,
        originalFileName: req.file.originalname,
        uploader: req.user.id, 
        uploaderName: req.user.name, 
        uploaderRole: req.user.role, 
      });

      res.status(201).json({
        success: true,
        data: newNote,
      });
    } catch (dbErr) {
      console.error(dbErr);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  });
});

// Roter to get the notes from DB and its controller
router.get('/', async (req, res) => {
  try {
    let query = {};
    // Role Filtering (for 'teacher-notes' page)
    if (req.query.role === 'teacher') {
      query.uploaderRole = 'teacher';
      query.verified = true;
    }

    // "Subject" filtering
    if (req.query.subject) {
      query.subject = req.query.subject;
    }

    // Search query 
    if (req.query.q) {
      query.$text = { $search: req.query.q };
    }

    // sorting on the basis of recent, rating, title
    let sortOptions = {};
    switch (req.query.sort) {
      case 'rating':
        sortOptions = { rating: -1 }; 
        break;
      case 'title':
        sortOptions = { title: 1 }; 
        break;
      case 'recent':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 9;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const total = await Note.countDocuments(query);

    const notes = await Note.find(query)
      .sort(sortOptions)
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      count: notes.length,
      page,
      pages: Math.ceil(total / limit),
      notes: notes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});


router.get('/download/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id); // get the id of the note from the params 
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    // This builds the absolute path to the file
    // __dirname is .../notes-backend/routes
    // '..' goes up to .../notes-backend/
    // note.filePath is 'uploads/filename.pdf'
    // Result: .../notes-backend/uploads/filename.pdf
    const filePath = path.join(__dirname, '..', note.filePath);
    
    const originalName = note.originalFileName;  

    // This command sends the file for download
    res.download(filePath, originalName, (err) => {
      if (err) {
        console.error("File download error:", err);
        if (!res.headersSent) {
          res.status(404).json({ success: false, message: 'File not found on server.' });
        }
      }
    })

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});
module.exports = router;