const WebSocket = require('ws');
const lastUpdateDate = 'SV-010 [28-04-2022]';

const usedPort = process.env.PORT || 6789;
const socketServer = new WebSocket.Server({ port: usedPort });
socketServer.on('connection', onConnect);

function countId() {
  let counter = 0;
  return function() {
    return counter++;
  }
}

var getId = countId();

let clientsArr = [];

// canvas and images description
const C_WIDTH = 1200;
const C_HEIGHT = 600;
const planeWidth = 100;
const planeHeight = 100;
const planeHalfWidth = 50;
const planeHalfHeight = 50;

class Client {
  constructor(id, socket) {
    this.id = id;
    this.socket = socket;
    this.x = planeWidth * clientsArr.length + planeHalfWidth;
    this.y = planeHeight * clientsArr.length + planeHalfHeight;
    this.direction = 0;
  }
};

// IF NEW CONNECTION
function onConnect(clientSocket) {
  console.log('-- get new connection --');

  clientSocket.on('message', function (message) {
    let { action, data } = JSON.parse(message);
    switch (action) {
      case 'connect' : getConnect(clientSocket); break;
      case 'update' : getUpdate(data); break;
      default : getWrongActionInRequest(action, data);
    }
  });

  clientSocket.on('close', function () {
    let disconnectedClient = clientsArr.find(client => client.socket === clientSocket);
    clientsArr = clientsArr.filter(client => client.socket !== clientSocket);

    let message = JSON.stringify({  action: 'update', data: clientsArr });
    clientsArr.forEach(client => client.socket.send(message) );

    console.log('-- client ' + disconnectedClient.id + ' disconnect');
  });

}
// SERVER START CONSOLE INFO
console.log(`server start on port ${usedPort}`);
console.log(`last update date is ${lastUpdateDate}`);

function getConnect(clientSocket) {
  let id = getId(); console.log('GET ID', id);
  let client = new Client(id, clientSocket);
  clientsArr.push(client);
  clientSocket.send(JSON.stringify({ action: 'connect', data: id }));
}

function getUpdate(data) {
  let { id, direction } = data;
  let target = clientsArr.find(client => client.id == id);
  target.direction += direction;
  console.log(target);
  let message = JSON.stringify({  action: 'update', data: clientsArr });
  clientsArr.forEach(client => client.socket.send(message) );
}

function getWrongActionInRequest(action, data) {
  console.log('-- WRONG ACTION --');
  console.log(' - action ' + action);
  console.log(' - data ' + data);
  console.log('-- -- --');
}
