const http = require('http')
const express = require('express');

const app = express();

http.globalAgent.maxSockets = 100;

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

process.on('unhandledRejection', function(reason, p){
  console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
  process.exit(1);
});
process.on('uncaughtException', function (err) {
  console.error('Uncaught Exception', err);
  process.exit(1);
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


function createSubrequestGrabber(key, subQuery) {
  return new Promise((resolve, reject) => {
    console.log('New request grabber for:', key, subQuery);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: subQuery,
      method: 'GET'
    }
    const subRequest = http.request(options, (response) => {
      let responseBody = ''; 
      response.on('data', chunk => responseBody += chunk);
      response.on('error', (err) => console.log('EEE', err));
      response.on('end', () => {
        if (response.statusCode !== 200) {
          return resolve({
            [key]: {
              error: { 
                status: response.statusCode,
                response: responseBody
              }
            }
          });
        } else {
          console.log(response.statusCode);
          console.log(response.body);
          return resolve({ [key]: JSON.parse(responseBody) });  
        }
      });
    });
    subRequest.on('error', error => {
      console.error(error)
    })
    
    subRequest.end();
  }); 
}
app.get('/multiple', async function(req, res) {
  console.log('Start');
  res.writeHead(200, { 'Content-Type' : 'application/json' });

  res.write('{');
  const requests = [];
  for (const key in req.query) {
    if (Array.isArray(req.query[key])) {
      req.query[key].forEach(item => requests.push(createSubrequestGrabber(key, item)))
    } else {
      requests.push(createSubrequestGrabber(key, req.query[key]));
    }
  }
  
  await requests.reduce(async (acc, callSubReq, currentIndex) => {
    const a = await acc;
    callSubReq.then(responseData => {
      console.log('###', responseData);
      res.write(JSON.stringify(responseData).slice(1,-1));
      if (currentIndex < requests.length - 1) {
        res.write(', '); 
      }
    }); 
    return Promise.resolve(a);
  }, Promise.resolve({ res }));
  
  Promise.allSettled(requests).then(() => {
    console.log('Finished');
    res.write('}');
    return res.end();
  });

  // setInterval(() => {
  //   console.log('---');
  //   requests.forEach(r => console.log(r));
  // }, 1000);
  // let condition = true;
  // while(condition) {

  // }
});

app.listen(3000, function() {
  console.log('Server is listening on port 3000')
});
