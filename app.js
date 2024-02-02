var express = require('express');
const app = express();
var createError = require('http-errors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const expressSession = require('express-session');
const passport = require("passport");
var express = require('express');
const flash = require('connect-flash');
const localStrategy = require('passport-local');
const userModel = require("./routes/users");
const postModel = require("./routes/posts");
const upload = require('./routes/multer');
require('dotenv').config();
require('./routes/cloudinary');
const cloudinary = require('cloudinary');
var usersapp = require('./routes/users');
const port = process.env.PORT || 3000;


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(expressSession({
  resave: true,
  saveUninitialized: true,
  secret: "Asad Asad Asad"
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(usersapp.serializeUser());
passport.deserializeUser(usersapp.deserializeUser());


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/users', usersapp);


passport.use(new localStrategy(userModel.authenticate()));


app.get('/', function (req, res) {
  const error = req.query.error || '';
  res.render('index', { error: error });
});

app.get('/login', function (req, res) {
  res.render("login", { error: req.flash("error") });
});

app.get('/home', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.find().populate('user');
  res.render('home', { post, user });
});

app.get('/profile', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('posts');
  const successMessage = req.query.success ? "Post was successfully deleted" : null;
  res.render('profile', { user, successMessage });
});

app.get('/UserProfile/:id', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ _id: req.params.id }).populate('posts');
  res.render('UserProfile', { user });
});

app.get('/search', isLoggedIn, function (req, res) {
  res.render('search');
});

app.get('/like/post/:id', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.findOne({ _id: req.params.id });
  if (post.likes.indexOf(user._id) === -1) {
    post.likes.push(user._id);
  } else {
    post.likes.splice(post.likes.indexOf(user._id), 1);
  }
  await post.save();
  res.redirect('/home');
});

app.get('/user/follow/:id', isLoggedIn, async function (req, res) {
  try {
    const currentUser = await userModel.findOne({ username: req.session.passport.user });
    const targetUser = await userModel.findOne({ _id: req.params.id });

    // Check if the current user is already following the target user
    const isFollowing = currentUser.following.includes(req.params.id);

    if (isFollowing) {
      // If already following, unfollow
      currentUser.following.pull(req.params.id);
      targetUser.followers.pull(currentUser._id);
    } else {
      // If not following, follow
      currentUser.following.push(req.params.id);
      targetUser.followers.push(currentUser._id);
    }

    await currentUser.save();
    await targetUser.save();

    // Respond with success status

    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get('/editProfile', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  console.log(user.profileImage.length);
  res.render('editProfile', { user });
});

app.post('/deletePost/:postId', async (req, res) => {
  const postId = req.params.postId;

  try {
    // Find and delete the post by its ID
    await postModel.findByIdAndDelete(postId);

    // Redirect to the profile page with success query parameter
    res.redirect('/profile/?success=true');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/createPost', isLoggedIn, async function (req, res) {
  res.render("createPost");
});

app.post('/createPost', isLoggedIn, upload.single("image"), async function (req, res) {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // Continue with the upload process
  try {
    const result = await cloudinary.v2.uploader.upload(req.file.path);
    const user = await userModel.findOne({ username: req.session.passport.user });
    const post = await postModel.create({
      picture: result.secure_url,
      user: user._id,
      caption: req.body.caption
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect('/home');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong!');
  }
});

app.post('/update', upload.single('image'), async function (req, res) {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  try {
    const result = await cloudinary.v2.uploader.upload(req.file.path);
    const user = await userModel.findOneAndUpdate(
      { username: req.session.passport.user },
      { username: req.body.username, name: req.body.name, bio: req.body.bio },
      { new: true });
    if (req.file) {
      user.profileImage = result.secure_url;
    }
    await user.save();
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong!');
  }
});

app.get('/username/:username', isLoggedIn, async function (req, res) {
  const regex = new RegExp(`^${req.params.username}`, 'i');

  // Exclude the logged-in user from the search results
  const users = await userModel.find({ username: regex, _id: { $ne: req.user._id } });

  res.json(users);
});

app.post('/register', async function (req, res) {
  try {
    let error = '';

    if (!req.body.username || !req.body.email || !req.body.name || !req.body.password) {
      error = 'All fields are required.';
      return res.render('index', { error: error });
    }

    const userExist = await userModel.findOne({ username: req.body.username });

    if (userExist) {
      error = 'User already exists';
      return res.render('index', { error: error });
    } else {
      const userData = new userModel({
        username: req.body.username,
        name: req.body.name,
        email: req.body.email
      });

      await userModel.register(userData, req.body.password);

      passport.authenticate('local')(req, res, function () {
        res.redirect('/home');
      });
    }
  } catch (error) {
    // Handle unexpected errors
    const errorMessage = 'An error occurred during registration.';
    res.render('index', { error: errorMessage });
  }
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/home',
  failureRedirect: '/login',
  failureFlash: true
}), function (req, res) {
});

app.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) { return next(err) }
    res.redirect('/login');
  });
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/')
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(port, () => {
  console.log(`App is listening on PORT ${port}`);
});