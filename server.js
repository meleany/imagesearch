// Image Search Abstraction Layer API by Yasmin Melean 28/04/2017
// Using the request form for custom http headers, explained at:
// https://www.npmjs.com/package/request#custom-http-headers
// Uses Node.js, Express, Pug and MongoDB.
var request = require("request");
var mongo = require("mongodb");
var express = require("express");
var app = express();
var PORT = process.env.PORT || 3000;

var mongoUrl = process.env.MONGODB_URI;
var client_ID = process.env.CLIENT_ID;
var collection;

//Include this line if you want to load images in your page.
app.use('/resources', express.static(__dirname + "/static"));

// Starting MongoDB connection to database, this is the only dependency driver.
mongo.mongoClient;

// npm install pug in order to use Pug, Express loads the module internally using:
app.set("view engine", "pug");
app.set("views", __dirname + "/static");

app.get("/", function(request, response){
  var hostname = request.protocol + "://" + request.hostname;
  var url = hostname + "/search/funny cats?offset=2";
  var recent = hostname + "/latest/";
  response.render("index.pug", {"url": url, "latest": recent});
});

// Accepts a parameter passed as a string in the URL and returns the results in JSON form.
app.get("/search/:id", function(req, response){
  var id = req.params.id;
  var offset = 0;
  if(req.query.offset){
    offset = req.query.offset;
  }
  var date = new Date().toISOString();
  var options = {
    url: "https://api.imgur.com/3/gallery/search/"+ offset + "?q=" + id,
    headers: { "Authorization": "Client-ID " + client_ID },
    json: true
  };
  mongo.connect(mongoUrl, function(err, db){  // Saves in the DB the query & Date values.
    if(err) throw err;
    collection = db.collection("latestquery");
    collection.insert({term:id, when:date});
    db.close();
  });
  // Starts image search using Imgur API and request.
  request.get(options, function(err, res, body){
    if(!err && res.statusCode == 200){
      response.send(body.data.map(function(item){ 
        return {context: item.link, snippet: item.title, url: "https://i.imgur.com/"+item.cover+".jpg" } 
      }));
    }
  });
});

// List of the most recently submitted search strings. Use MongoDB to save 10 latest search.
app.get("/latest", function(request, response){
  mongo.connect(mongoUrl, function(err, db){
    if(err) throw err;
    collection = db.collection("latestquery");
    collection.find({},{"term":1, "when":1, "_id":0}).limit(10).sort({$natural:-1}).toArray(function(err, doc){
      response.send(doc);
    });
  });
});

// Starts a server and listens in PORT connection
// The default routing is 0.0.0.0 represented by :: in IPv6
var server = app.listen(PORT, function(){
  var host = server.address().address;
  if(host == "::") { host =  "0.0.0.0"}
  var port = server.address().port;
  console.log("Image Search Microservice running at: http://%s:%s", host, port);
});