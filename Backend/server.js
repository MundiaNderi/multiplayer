// server/index.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());



const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let players = [];
let gameState = {
  history: [{ squares: Array(9).fill(null) }],
  stepNumber: 0,
  xIsNext: true,
};

wss.on('connection', (ws) => {
  if (players.length >= 2) {
    ws.send(JSON.stringify({ type: 'status', status: 'Game is full' }));
    ws.close();
    return;
  }

  const player = players.length;
  players.push(ws);
  ws.send(JSON.stringify({ type: 'init', player }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'move' && data.player === players.indexOf(ws)) {
      handleMove(data.index, data.player);
    }
  });

  ws.on('close', () => {
    players = players.filter((playerWs) => playerWs !== ws);
    if (players.length === 0) resetGame();
  });
});

const handleMove = (index, player) => {
  const { history, stepNumber, xIsNext } = gameState;
  const current = history[stepNumber];
  const squares = current.squares.slice();
  if (squares[index] || calculateWinner(squares)) return;

  squares[index] = xIsNext ? 'X' : 'O';
  gameState = {
    history: history.concat([{ squares }]),
    stepNumber: history.length,
    xIsNext: !xIsNext,
  };

  broadcastGameState();
};

const broadcastGameState = () => {
  const { history, stepNumber, xIsNext } = gameState;
  const status = calculateWinner(history[stepNumber].squares)
    ? `Winner: ${xIsNext ? 'O' : 'X'}`
    : `Next player: ${xIsNext ? 'X' : 'O'}`;

  players.forEach((player) =>
    player.send(
      JSON.stringify({
        type: 'update',
        history: gameState.history,
        stepNumber: gameState.stepNumber,
        xIsNext: gameState.xIsNext,
      })
    )
  );

  players.forEach((player) =>
    player.send(JSON.stringify({ type: 'status', status }))
  );
};

const calculateWinner = (squares) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
};
// post the winner 

app.post('/calculate-winner', (req, res) => {
    const { squares } = req.body;
    const winner = calculateWinner(squares);
    res.send({ winner})
})
const resetGame = () => {
  gameState = {
    history: [{ squares: Array(9).fill(null) }],
    stepNumber: 0,
    xIsNext: true,
  };
};

server.listen(8080, () => {
  console.log('Server started on port 8080');
});
