var http = require('http')
var cluster = require('cluster')
const express = require('express');
const app = express();

const customers = [{
  name: 'Bob',
  id: 13,
  age: 21,
},
{
  name: 'Alice',
  id: 25,
  age: 21,
}];

const products = [{
  name: 'Heinz',
  id: 993,
  price: '221.00'
}];

process.on('unhandledRejection', function(reason, p){
  console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
  process.exit(1);
});
process.on('uncaughtException', function (err) {
  console.error('Uncaught Exception', err);
  process.exit(1);
});

function getResponse(key, subQuery, cb){
  var request = {
      hostname: '127.0.0.1',
      port: 3000,
      path: subQuery,
      method: 'GET'
  }
  http.get(request, (res) => {
      var body = ''
      res.on('data', function (chunk) {
        body += chunk
      })
      res.on('error', (err) => console.log('Error:', err));
      res.on('end', function () {
        if (res.statusCode !== 200) {
          cb({
            [key]: {
              error: { 
                status: res.statusCode,
                response: body
              }
            }
          })
        } else {
          console.log('====', body);
          cb({ [key]: JSON.parse(body) });
        }
      })
  }).end()
}


if(cluster.isMaster) {
  console.log("Running concurrent requests!")
  var numWorkers = require('os').cpus().length;
  console.log({ numWorkers });

  app.get('/multiple', async function(req, res) {
      for(var i = 0; i < 5; i++) {
        cluster.fork()
      }
  
      res.writeHead(200, { 'Content-Type' : 'application/json' });
  
      res.write('{');
        const reqData = [];
      for (const key in req.query) {
        if (Array.isArray(req.query[key])) {
          req.query[key].forEach(item => reqData.push({ key, subQuery: item }))
        } else {
          reqData.push({ key, subQuery: req.query[key] });
        }
      }
  
      let counter = reqData.length;
      while(counter > 0) {
        counter = counter - 1;
        for(var wid in cluster.workers) {
          // if (count > 5) {return}
          cluster.workers[wid].on('message', function(message) {
            res.write(JSON.stringify(message.data.result).slice(1,-1));
          })
          cluster.workers[wid].send({
            type: 'request',
            data: reqData[counter]
          })
        }
      }
  
  });
  
  app.listen(3001, function() {
    console.log('Server is listening on port 3001')
  });
} else {
  process.on('message', function(message) {
    if(message.type === 'request') {
      getResponse(message.data.key, message.data.subQuery, function(res){
        process.send({
          data: {
            result: res
          }
        })
        process.exit(0)
      })
    }
  })
  
  app.get('/customers/:id', function(req, res) {
    // const id = +req.params.id;
    function processRequest(id, res) {
      const customer = customers.find(item => item.id === id);
      if (!customer) {
        return res.sendStatus(404);
      }
      return res.json(customer);
    }
    setImmediate(() => processRequest(+req.params.id, res));
    // console.log(`=> Getting /customers/${id}`);
  });
  
  app.get('/products/:id', function(req, res) {
    function processRequest(id, res) {
      const product = products.find(item => item.id === id);
      if (!product) {
        return res.sendStatus(404);
      }
      return res.json(product);
    }
    setImmediate(() => processRequest(+req.params.id, res));
  });
  
  app.listen(3000, function() {
    console.log('Server is listening on port 3000')
  });
}


