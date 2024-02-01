const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/instagram');

const userSchema = mongoose.Schema({
  username: String,
  name: String,
  email: String,
  password: String,
  bio: String,
  profileImage: {
    type: String,
    default:"https://imgs.search.brave.com/Q4bL_yMEAbXiFCo2MCwZ4wHEa5PwxrArKnfgEBhrCTU/rs:fit:860:0:0/g:ce/aHR0cHM6Ly9hc3Nl/dHMuc3RpY2twbmcu/Y29tL2ltYWdlcy81/ODVlNGJmM2NiMTFi/MjI3NDkxYzMzOWEu/cG5n"
  },
  following: {
    type: Array,
    default: []
  },
  followers: {
    type: Array,
    default: []
  },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'post' }]
});

userSchema.plugin(plm);

module.exports = mongoose.model("user", userSchema);