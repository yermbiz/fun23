const http = require('http')
const cluster = require('cluster');

http.globalAgent.maxSockets = 200;

process.on('unhandledRejection', function(reason, p){
  console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
  process.exit(1);
});
process.on('uncaughtException', function (err) {
  console.error('Uncaught Exception', err);
  process.exit(1);
});


let query = `/multiple?`;

for (let i = 0; i < 1; i += 1) {
  query = `${query}bob=/customers/13&alice=/customers/25&mustard=/products/90&`
}


const options = {
  hostname: 'localhost',
  port: 3001,
  path: query.slice(0, -1),
  method: 'GET'
}


callback = function(response) {
  var str = '';
  //another chunk of data has been received, so append it to `str`
  response.on('data', function (chunk) {
    console.log('##', chunk.toString());
    str += chunk;
  });

  //the whole response has been received, so we just print it out here
  response.on('end', function () {
    // console.log(str);
  });
}

http.request(options, callback).end();
