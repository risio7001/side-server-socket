// server.js
const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = 8088;

let roomPosition = {
  "lecture-1": {
    x: 94,
    y: 3,
  },
  "lecture-2": {
    x: 94,
    y: 29,
  },
};

let users = {};

let usersPosition = {};

let room = {
  all: {
    id: "all",
    cnt: 0,
    totalCnt: 0,
  },
};

io.on("connection", (socket) => {
  // 새로운 접속자
  socket.on("rtcReady", (data) => {
    socket.broadcast.emit("inPage", socket.id);
  });

  socket.on("init", (data) => {
    console.log(data);

    room.all.totalCnt++;
    socket.join(room.all.id);
    users[socket.id] = {
      ...users[socket.id],
      roomNum: "all",
      name: data.name,
      id: socket.id,
    };

    // console.log(users);
    io.emit("init", {
      name: data.name,
      roomNum: "all",
      roomCnt: Object.keys(users).length,
      userList: Object.keys(users),
      users: usersPosition,
      usersAll:users
    });
    room.all.cnt++;
  });

  socket.on("disconnect", () => {
    if (!users[socket.id]) {
      return;
    }
    room.all.totalCnt--;
    handleDisconnect({ socket: socket, room: room, users: users });
    socket.broadcast.emit("disconnected", {
      msg: socket.id + "님이 나갔습니다.",
      target: socket.id,
      roomCnt: room.all.totalCnt,
      userList: Object.keys(users),
    });
  });

  socket.on("roomIn", (data) => {
    handleRoomIn({ socket: socket, room: room, users: users, roomNum: data });
    let temp = {};
    temp[socket.id] = roomPosition[data.roomName];
    console.log(temp);
    socket.broadcast.emit("roomIn", temp);
  });

  socket.on("move", (data) => {
    usersPosition[data.target] = data.position;
    socket.broadcast.emit("move", {
      id: data.target,
      position: data.position,
    });
  });
  
  socket.on("roomEnter", (data) => {
    usersPosition[data.target] = data.position;
    socket.broadcast.emit("roomEnter", {
      id: data.target,
      position: data.position,
    });
  });
  socket.on("roomLeave", (data) => {
    usersPosition[data.target] = data.position;
    socket.broadcast.emit("roomLeave", {
      id: data.target,
      position: data.position,
    });
  });

  socket.on("caller", (data) => {
    io.to(data.to).emit("caller", {
      signal: data.signalData,
      from: data.from,
    });
  });

  socket.on("answerCall", (data) => {
    // console.log("answer geo : ", data.to);
    io.to(data.to).emit("acceptcall", { signal: data.signal, id: data.id });
  });
});

server.listen(PORT, () => {
  console.log("Start Server : " + PORT);
});

function handleRoomIn(data) {
  // roomNumCnt 추가
  if (!data.room[data.roomNum]) {
    data.room[data.roomNum] = { cnt: 0, id: data.roomNum };
  }
  data.room[data.roomNum].cnt++;
  // 있던 룸 cnt--
  handleRoomOut(data);
  // users room 정보 입력
  data.users[data.socket.id] = {
    ...data.users[data.socket.id],
    roomNum: data.roomNum,
  };
}

function handleRoomOut(data) {
  if (
    data.users[data.socket.id]?.roomNum !== "all" &&
    data.room[data.users[data.socket.id].roomNum].cnt < 2
  ) {
    delete data.room[data.users.roomNum];
  } else {
    data.room[data.users[data.socket.id].roomNum].cnt--;
  }
}
function handleDisconnect(data) {
  handleRoomOut(data);
  // 유저 정보 삭제
  delete data.users[data.socket.id];
}
