'use strict';

const lastUpdateDate = 'SV-012 [14-05-2022]';
console.log(`last update date is ${lastUpdateDate}`);

const updateTimeout = 5; 
let lastUpdateTimeStamp;
let timeStamp;
let timeout = 10;
let speedModifier;

/*****************
 *  CLIENTS
 */

class Client {
  constructor(id, key, socket) {
    this.id = id;
    this.key = key;
    this.socket = socket;
  }
};
let clientsArr = [];

function countId() {
  let counter = 0;
  return function() {
    return counter++;
  }
}
var getId = countId();

/*****************
 *  DRAW
 */

 const RAD = Math.PI / 180;

 const C_WIDTH = 1200;
 const C_HEIGHT = 600;

/*****************
 *  PLANES
 */

const planeWidth = 100;
const planeHeight = 100;
const planeHalfWidth = 50;
const planeHalfHeight = 50;

// speed and acceleration
let minSpeed = 1;
let cruiseSpeed = 2;
let maxSpeed = 4;
let accPass = 0.01;
let accHard = 0.02;
let turnSpeed = 0.5; // 0.5 -- 1 -- 1.5 -- 2.5 -- 4.5

let missileReadyTimeout = 1000;

class Plane {
  constructor(id) {
    this.id = id;
    this.x = (C_WIDTH / 2) - planeHalfWidth;
    this.y = C_HEIGHT + planeHalfHeight;
    this.direction = 270;
    this.speed = cruiseSpeed;
    this.speedChange = false;

    this.missileReadyTimeStamp = Date.now() + missileReadyTimeout;
  }

  update() {
    if (this.speedChange) this.speedChange = false;
    else if (this.speed != cruiseSpeed) {
      if (this.speed < cruiseSpeed) this.speed = ((this.speed + accPass) < cruiseSpeed) ? (this.speed + accPass) : cruiseSpeed;
      if (this.speed > cruiseSpeed) this.speed = ((this.speed - accPass) > cruiseSpeed) ? (this.speed - accPass) : cruiseSpeed;
    }

    let currentSpeed = this.speed * speedModifier;
  
    let angle = RAD * this.direction;
    this.x += Math.cos(angle) * currentSpeed;
    this.y += Math.sin(angle) * currentSpeed;
  
    if (this.x > (C_WIDTH + planeWidth)) this.x -= C_WIDTH + planeWidth;
    else if (this.x < -planeWidth) this.x += C_WIDTH + planeWidth;
  
    if (this.y > (C_HEIGHT + planeHeight)) this.y -= C_HEIGHT + planeWidth;
    else if (this.y < -planeHeight) this.y += C_HEIGHT + planeWidth;
  }
};

let planesArr = [];

/*****************
 *  MISSILES
 */

const missileWidth = 40;
const missileHeight = 40;

// speed and acceleration
let missileSpeed = 3;
let missileAcc = 0.03;

class Missile {
  constructor(id, x, y, direction) {
    this.id = id,
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.speed = missileSpeed;
    this.fly = true;
  }

  update() {
    let currentSpeed = this.speed * speedModifier;
  
    let angle = RAD * this.direction;
    this.x += Math.cos(angle) * currentSpeed;
    this.y += Math.sin(angle) * currentSpeed;
  
    if (this.x > (C_WIDTH + missileWidth) || this.x < -missileWidth) this.fly = false;
    if (this.y > (C_HEIGHT + missileHeight) || this.y < -missileHeight) this.fly = false;

    this.speed += missileAcc;
  }
};
let missilesArr = [];

/*****************
 *  CONNECTION
 */

const WebSocket = require('ws');

const usedPort = process.env.PORT || 6789;
const socketServer = new WebSocket.Server({ port: usedPort });
socketServer.on('connection', onConnect);

// IF NEW CONNECTION
function onConnect(clientSocket) {
  console.log('-- get new connection --');

  clientSocket.on('message', function (message) {
    let { action, data } = JSON.parse(message);
    switch (action) {
      case 'connect' : getConnect(clientSocket, data); break;
      case 'update' : getUpdate(data); break;
      default : getUnknownAction(action, data);
    }
  });

  clientSocket.on('close', function () {
    let disconnectedClient = clientsArr.find(client => client.socket === clientSocket);

    planesArr = planesArr.filter(plane => plane.id !== disconnectedClient.id);
    clientsArr = clientsArr.filter(client => client.socket !== clientSocket);

    let message = JSON.stringify({ action: 'out', data: disconnectedClient.id });
    clientsArr.forEach(client => client.socket.send(message));

    console.log(`-- client with id ${disconnectedClient.id} disconnect`);
  });

}
// SERVER START CONSOLE INFO
console.log(`server start on port ${usedPort}`);

function getConnect(clientSocket, data) {
  let id = getId();

  let client = new Client(id, data, clientSocket);
  clientsArr.push(client);

  let plane = new Plane(id);
  planesArr.push(plane);

  let connectionData = {
    id : id,
    updateTimeout : updateTimeout,
    planesArr : planesArr
  }

  clientSocket.send(JSON.stringify({ action: 'connect', data: connectionData }));
}

function getUpdate(data) {
  //test client key
  let targetClient = clientsArr.find(client => client.id === data.id);
  let targetKey = targetClient.key;

  if (targetKey === data.key) {
    let targetPlane = planesArr.find(plane => plane.id == data.id);
  
    if (data.directionChanging === 1 || data.directionChanging === -1) {
      targetPlane.direction = (360 + targetPlane.direction + data.directionChanging * turnSpeed) % 360;
    }

    if (data.speedChanging === 1 || data.speedChanging === -1) {
      targetPlane.speedChange = true;
      if (data.speedChanging > 0) targetPlane.speed = (targetPlane.speed < maxSpeed) ? targetPlane.speed + accHard : maxSpeed;
      else targetPlane.speed = (targetPlane.speed > minSpeed) ? targetPlane.speed - accHard : minSpeed;
    }

    if (data.missileLaunchIs) {
      let timeStamp = Date.now();

      if (targetPlane.missileReadyTimeStamp < timeStamp) {
        let missile = new Missile(targetPlane.id, targetPlane.x, targetPlane.y, targetPlane.direction);
        missilesArr.push(missile);

        targetPlane.missileReadyTimeStamp = Date.now() + missileReadyTimeout;
      }
    }
  }
}

function updateLoop() {
  timeStamp = Date.now();
  timeout = (lastUpdateTimeStamp) ? timeStamp - lastUpdateTimeStamp : 10;
  lastUpdateTimeStamp = timeStamp;
  speedModifier = timeout / updateTimeout;

  planesArr.forEach( plane => plane.update());

  missilesArr.forEach( missile => missile.update());
  missilesArr = missilesArr.filter(missile => missile.fly);

  let message = JSON.stringify({
    action: 'update',
    data: {
      planesArr: planesArr,
      missilesArr: missilesArr,
      timeout: timeout
    } });
  clientsArr.forEach( client => client.socket.send(message) );
}
setInterval(updateLoop, updateTimeout);

function getUnknownAction(action, data) {
  console.log('-- WRONG ACTION --');
  console.log(`action: ${action}; data:`);
  console.log(data);
  console.log('-- -- --');
}