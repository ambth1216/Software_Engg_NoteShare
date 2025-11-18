const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // importing bycryptjs to hash the password

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true, 
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, // validating email on backend side also
      'Please add a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6, 
    select: false,
  },
  role: {
    type: String,
    enum: ['student', 'teacher'], 
    default: 'student',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Mongoos "pre" hook | Hashing the password beffore storing data in DB
UserSchema.pre('save', async function (next) {
    // when password is modified (changed the old password) or is new (account created firt time) then only it will run
  if (!this.isModified('password')) { 
    next();
  }
  const salt = await bcrypt.genSalt(10); // rounds of hashing = 10
  this.password = await bcrypt.hash(this.password, salt); 
  next();  // after completing the work this middleware will pass-on the command to the next middleware or function
});


// A mongooes method to check the entered password with the stored password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  // 'this.password' refers to the user's hashed password
  return await bcrypt.compare(enteredPassword, this.password); // bcrypt is used because passord is hassed
};

module.exports = mongoose.model('User', UserSchema); // a "users" name cluster is created in mongoDB