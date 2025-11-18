const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
  },
  subject: {
    type: String,
    required: [true, 'Please add a subject'],
    trim: true,
  },
  viewUrl: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  originalFileName: {
    type: String,
    required: true,
  },
  uploader: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  uploaderName: {
    type: String,
    required: true,
  },
  uploaderRole: {
    type: String,
    enum: ['student', 'teacher'],
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

NoteSchema.pre('save', function (next) {
  if (this.uploaderRole === 'teacher') {
    this.verified = true;  // a verified batch is put on note model if the role is "teacher"
  }

  if (this.isNew) {
    this.rating = (Math.random() * (5 - 3) + 3).toFixed(1); // random rating is assigned to the "teacher's notes" between 3.0 to 5.0
  }
  next();
});

NoteSchema.index({ title: 'text', subject: 'text' });  // Indexing has been enabled so searching notes on basis of "title" and subject is easy

module.exports = mongoose.model('Note', NoteSchema);