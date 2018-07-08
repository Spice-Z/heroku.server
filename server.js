// =======================
// get instance we need
// =======================
const express         = require('express');
const app                = express();
const bodyParser    = require('body-parser');
const morgan          = require('morgan');
const db = require("./pg-setting.js");
const jwt                   = require('jsonwebtoken');
const config              = require('./config');
const cors = require("cors");

// =======================
// configuration
// =======================
// server setting
const port = process.env.PORT || 8080;

// application variables
app.set('superSecret', config.secret);

// config for body-parser
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());
app.use(cors());


// log request
app.use(morgan('dev'));

// =======================
// routes
// =======================
app.get('/', function(req, res) {
  res.send('Hello! The API is at http://localhost:' + port + '/api');
});



// =======================
// start the server
// =======================
app.listen(port);
console.log('started http://localhost:' + port + '/');



// API ROUTES ================

var apiRoutes = express.Router();

// GET(http://localhost:8080/api/)
apiRoutes.get('/', function(req, res) {
  res.json({ message: 'Welcome to API routing'});
});

// POST(http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function(req, res) {
  const reqName = req.body.name;
  const reqPassword = req.body.password;

  db.one('SELECT * FROM users WHERE name = $1', reqName)
    .then(user => {
      if (!user) {
        res.json({
          success: false,
          message: 'Authentication failed. User not found.'
        });
        return;
      }
      if (user.password != reqPassword) {
        res.json({
          success: false,
          message: 'Authentication failed. Wrong password.'
        });
        return;
      }

      const token = jwt.sign(user, app.get('superSecret'), {
        expiresIn: '24h'
      });
      console.log('id');
      console.log(user.id);

      res.json({
        success: true,
        message: 'Authentication successfully finished!',
        userId: user.id,
        token: token
      });

    })
    .catch(error => {
      res.json({
        success: false,
        message: 'Error! Something happen. cannot access DB.'
      });
    });
});

// Authentification Filter
apiRoutes.use(function(req, res, next) {

  // get token from body:token or query:token of Http Header:x-access-token
  const token = req.body.token || req.query.token || req.headers['x-access-token'];

  // validate token
  if (!token) {
    return res.status(403).send({
      success: false,
      message: 'No token provided.'
    });
  }

  jwt.verify(token, app.get('superSecret'), function(err, decoded) {
    if (err) {
      return res.json({
        success: false,
        message: 'Invalid token'
      });
    }

    // if token valid -> save token to request for use in other routes
    req.decoded = decoded;
    next();

  });

});


//----------------------secure api -------------------------

// GET(http://localhost:8080/api/users)
apiRoutes.get('/users', function(req, res) {
  db.any('SELECT * FROM users')
    .then(function(data) {
      res.json(data);
    })
    .catch(function(error) {
      throw error;
    });
});

// GET(http://localhost:8080/api/general)
apiRoutes.get('/general/:userId',function(req,res){
  const userId = req.params.userId
  console.log(userId);
  db
    .any(
      `select id,idea_text,date, mention_from_id.mentiond_id as is_mention_to, mentiond_id.mention_from_id as is_mentiond from ideas 
      LEFT JOIN ( select mention_from_id , mentiond_id from idea_relations ) as mention_from_id ON id = mention_from_id.mention_from_id 
      LEFT JOIN ( select mentiond_id , mention_from_id from idea_relations ) as mentiond_id ON id = mentiond_id.mentiond_id 
      WHERE user_id = $1`, [userId]
    )
    .then(function(data) {
      res.json(data);
    })
    .catch(function(error) {
      console.log(error);
    });
});

app.post("/api/tweetNewIdea", function(req, res) {
  let newId = "";
  const mentionToId = req.body.mentionTo;
  const ideaText = req.body.ideaText
  const userId = req.body.userId
  console.log(userId);
  
  db
    .one("INSERT INTO ideas(idea_text, user_id, date ) VALUES(${text}, ${userId}, now() ) RETURNING id", {
      test: ideaText, userId: userId
    })
    .then(data => {
      newId = data.id;
    })
    .catch(error => {
      console.log("ERROR:", error);
    });

  if (!mentionToId || mentionToId == 0) {
    res.json(req.body);
    return;
  }
  setTimeout(() => {
    db
      .none(
        "INSERT INTO idea_relations(mention_from_id, mentiond_id) VALUES($1, $2 )",
        [newId, mentionToId]
      )
      .then(() => {
        console.log("insert is success");
        res.json(req.body);
      })
      .catch(error => {
        console.log("ERROR:", error);
      });
  }, 3000);
});


// apply the routes to our application(prefix /api)
app.use('/api', apiRoutes);