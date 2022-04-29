const WebSocket = require('ws');
const lastUpdateDate = 'SV-012 [29-04-2022]';

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

class Client {
  constructor(id, socket) {
    this.id = id;
    this.socket = socket;
  }
};

let planesArr = [];

// IF NEW CONNECTION
function onConnect(clientSocket) {
  console.log('-- get new connection --');

  clientSocket.on('message', function (message) {
    let { action, data } = JSON.parse(message);
    switch (action) {
      case 'connect' : getConnect(clientSocket); break;
      case 'plane' : getPlane(data, clientSocket); break;
      case 'update' : getUpdate(data); break;
      default : getUnknownAction(action, data);
    }
  });

  clientSocket.on('close', function () {
    let disconnectedClient = clientsArr.find(client => client.socket === clientSocket);

    planesArr = planesArr.filter(plane => plane.id !== disconnectedClient.id);
    clientsArr = clientsArr.filter(client => client.socket !== clientSocket);

    let message = JSON.stringify({ action: 'update', data: planesArr });
    clientsArr.forEach(client => client.socket.send(message));

    console.log(`-- client with id ${disconnectedClient.id} disconnect`);
  });

}
// SERVER START CONSOLE INFO
console.log(`server start on port ${usedPort}`);
console.log(`last update date is ${lastUpdateDate}`);

function getConnect(clientSocket) {
  let id = getId();

  let client = new Client(id, clientSocket);
  clientsArr.push(client);

  clientSocket.send(JSON.stringify({ action: 'connect', data: id }));
}

function getPlane(data, clientSocket) {
  planesArr.push(data);

  clientSocket.send(JSON.stringify({  action: 'update', data: planesArr }));
}

function getUpdate(data) {
  let targetPlane = planesArr.find(plane => plane.id == data.id);
  targetPlane.x = data.x;
  targetPlane.y = data.y;
  targetPlane.direction = data.direction;
  targetPlane.speed = data.speed;

  let message = JSON.stringify({  action: 'update', data: planesArr });
  clientsArr.forEach(client => client.socket.send(message) );
}

function getUnknownAction(action, data) {
  console.log('-- WRONG ACTION --');
  console.log(`action: ${action}; data:`);
  console.log(data);
  console.log('-- -- --');
}