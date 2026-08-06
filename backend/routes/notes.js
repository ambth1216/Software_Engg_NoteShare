const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Note = require('../models/Note');
const { protect } = require('../middleware/auth');

function createCloudFrontUrl(objectKey) {
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;

  if (!cloudFrontDomain) {
    throw new Error('CLOUDFRONT_DOMAIN is not configured');
  }

  // Accepts both:
  // d123example.cloudfront.net
  // https://d123example.cloudfront.net
  const cleanDomain = cloudFrontDomain
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

  // Properly encode spaces and special characters while preserving folders.
  const encodedKey = objectKey
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  return `https://${cleanDomain}/${encodedKey}`;
}

// Check if AWS S3 environment variables are provided
const isS3Enabled = process.env.USE_S3 === 'true' || !!process.env.AWS_S3_BUCKET_NAME;

let storage;

if (isS3Enabled) {
  try {
    const { S3Client } = require('@aws-sdk/client-s3');
    const multerS3 = require('multer-s3');

    const s3 = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
    });

    storage = multerS3({
      s3,
      bucket: process.env.AWS_S3_BUCKET_NAME,

      // Preserves the correct browser content type:
      // application/pdf, image/jpeg, etc.
      contentType: multerS3.AUTO_CONTENT_TYPE,

      metadata: function (req, file, cb) {
        cb(null, {
          fieldName: file.fieldname,
          originalName: file.originalname,
        });
      },

      key: function (req, file, cb) {
        // Remove potentially unsafe characters from the original filename.
        const safeFileName = path
          .basename(file.originalname)
          .replace(/[^a-zA-Z0-9._-]/g, '_');

        const objectKey = `notes/${Date.now()}_${safeFileName}`;

        cb(null, objectKey);
      },
    });
    console.log('AWS S3 Storage engine initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize AWS S3 storage engine, falling back to local disk storage:', err.message);
    storage = multer.diskStorage({
      destination: './uploads',
      filename: function (req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
      },
    });
  }
} else {
  // Local disk storage engine
  storage = multer.diskStorage({
    destination: './uploads',
    filename: function (req, file, cb) {
      cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    },
  });
}

// Upload middleware setup
const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|ppt|pptx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Files of this type are not allowed!');
    }
  },
}).single('file');

// Upload notes route
router.post('/upload', protect, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.log(err);
      return res.status(400).json({ success: false, message: typeof err === 'string' ? err : err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const { title, subject } = req.body;
    if (!title || !subject) {
      return res.status(400).json({ success: false, message: 'Please provide title and subject' });
    }

    try {
      // Determine file URL & path depending on S3 vs local storage
      let fileUrl;
      let storedFilePath;

      if (isS3Enabled && req.file.key) {
        // Store the CloudFront URL for viewing.
        fileUrl = createCloudFrontUrl(req.file.key);

        // Store only the S3 object key for backend operations.
        storedFilePath = req.file.key;
      } else {
        // Local development fallback.
        fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        storedFilePath = req.file.path;
      }

      const newNote = await Note.create({
        title,
        subject,
        viewUrl: fileUrl,
        filePath: storedFilePath,
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

// Route to get notes from DB with filtering & pagination
router.get('/', async (req, res) => {
  try {
    let query = {};
    if (req.query.role === 'teacher') {
      query.uploaderRole = 'teacher';
      query.verified = true;
    }

    if (req.query.subject) {
      query.subject = req.query.subject;
    }

    if (req.query.q) {
      query.$text = { $search: req.query.q };
    }

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

// Download note route
router.get('/download/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      });
    }

    // S3 objects are stored using the notes/ prefix.
    if (note.filePath && note.filePath.startsWith('notes/')) {
      const cloudFrontUrl = createCloudFrontUrl(note.filePath);
      return res.redirect(cloudFrontUrl);
    }

    // Local development file.
    const localFilePath = path.join(__dirname, '..', note.filePath);

    res.download(
      localFilePath,
      note.originalFileName,
      (downloadError) => {
        if (downloadError) {
          console.error('File download error:', downloadError);

          if (!res.headersSent) {
            res.status(404).json({
              success: false,
              message: 'File not found on server',
            });
          }
        }
      }
    );
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
});

module.exports = router;