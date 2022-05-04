const WebSocket = require('ws');
const lastUpdateDate = 'SV-002 [4-05-2022]';

const usedPort = process.env.PORT || 6789;
const socketServer = new WebSocket.Server({ port: usedPort });
socketServer.on('connection', onConnect);

//
const updateIterationTimeout = 8;
let updateCounter = 0;
let timeStamp = Date.now();
//
let getUpdateArr = [];
let getUpdateMaxSize = 30;

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

// start update planes loop
updateIteration();

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

  //
  if (getUpdateArr.length < getUpdateMaxSize) {
    getUpdateArr.push(Date.now());
    if (getUpdateArr.length === getUpdateMaxSize) {
      for (let i = 0; i < getUpdateMaxSize - 1; i++) 
        getUpdateArr[i] = getUpdateArr[i + 1] - getUpdateArr[i];
      console.log(getUpdateArr);
    }
  }

}

function updateIteration() {
  let message = JSON.stringify({  action: 'update', data: planesArr });
  clientsArr.forEach(client => client.socket.send(message) );

  updateCounter++;
  let nowTime = Date.now();
  if (nowTime >= timeStamp + 1000) {
    console.log('*** timer:', ((timeStamp - nowTime) / 1000).toFixed(1), '; counter:', updateCounter);
    updateCounter = 0;
    timeStamp = nowTime;
  }

  setTimeout(updateIteration, updateIterationTimeout);
}

function getUnknownAction(action, data) {
  console.log('-- WRONG ACTION --');
  console.log(`action: ${action}; data:`);
  console.log(data);
  console.log('-- -- --');
}
