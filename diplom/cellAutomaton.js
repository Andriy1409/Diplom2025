const canvas = document.getElementById('cellCanvas');
const ctx = canvas.getContext('2d');

// Початкові налаштування
let cellSize = 2;
let gridSize = canvas.width / cellSize; // 600/2 = 300 (якщо cellSize=2) або 600 (якщо 1)

let activeDuration = 1;      
let refractoryDuration = 1;  
let thresholdPoints = 3;     
const restingDuration = 1;   
let reincarnation = false;   
let impulseRows = 3;       

// Режим малювання активної лінії
let lineDrawingMode = false;
let lineLength = 100;
let lineWidth = 3;

// Режим малювання кола-середовища
let circleDrawingMode = false;
let circleEnvs = []; // Масив кол: {cx, cy, radius, rules}

// Змінна для таймера автозапуску
let intervalId = null;

// Сітка – кожна клітинка має властивості: state, timer, points, barrier (опціонально)
let grid = [];
function initializeGrid() {
  gridSize = canvas.width / cellSize;
  grid = [];
  for (let x = 0; x < gridSize; x++) {
    grid[x] = [];
    for (let y = 0; y < gridSize; y++) {
      grid[x][y] = {
        state: 0,
        timer: 0,
        points: 0,
        barrier: false
      };
    }
  }
}
initializeGrid();

// Функція малювання сітки, з відображенням контуру кол (нове середовище)
function drawGrid() {
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      const cell = grid[x][y];
      if (cell.state === 0)      ctx.fillStyle = "#FFFFFF"; 
      else if (cell.state === 1) ctx.fillStyle = "#FF0000"; 
      else if (cell.state === 2) ctx.fillStyle = "#00FF00"; 
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }
  // Малюємо контури всіх кол із середовищем чорним кольором
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  for (let env of circleEnvs) {
    // Центр кола в пікселях
    let centerX = env.cx * cellSize + cellSize / 2;
    let centerY = env.cy * cellSize + cellSize / 2;
    let rad = env.radius * cellSize;
    ctx.beginPath();
    ctx.arc(centerX, centerY, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
}
drawGrid();

// Обробка зміни розміру клітинки
document.getElementById('setCellSizeButton').addEventListener('click', () => {
  let newSize = parseInt(document.getElementById('cellSizeInput').value);
  if (newSize !== 1 && newSize !== 2) newSize = 2;
  cellSize = newSize;
  initializeGrid();
  drawGrid();
});

// Оновлення параметрів
document.getElementById('setParamsButton').addEventListener('click', () => {
  activeDuration = parseInt(document.getElementById('activeDurationInput').value) || 1;
  refractoryDuration = parseInt(document.getElementById('refractoryDurationInput').value) || 1;
  thresholdPoints = parseInt(document.getElementById('thresholdPointsInput').value) || 3;
  impulseRows = Math.min(3, Math.max(1, parseInt(document.getElementById('impulseRowsInput').value) || 3));
  reincarnation = document.getElementById('reincarnationCheckbox').checked;
});

// Режим малювання активної лінії
document.getElementById('drawLineButton').addEventListener('click', () => {
  lineLength = parseInt(document.getElementById('lineLengthInput').value) || 1;
  lineWidth = parseInt(document.getElementById('lineWidthInput').value) || 1;
  lineDrawingMode = true;
});

// Режим малювання кола-середовища
document.getElementById('drawCircleButton').addEventListener('click', () => {
  circleDrawingMode = true;
});

// Обробка кліку по полотну
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = Math.floor((e.clientX - rect.left) / cellSize);
  const clickY = Math.floor((e.clientY - rect.top) / cellSize);

  if (lineDrawingMode) {
    // Обчислюємо зміщення, щоб центр активної лінії відповідав кліку
    const leftOffset = Math.floor(lineLength / 2);
    const rightOffset = lineLength - leftOffset - 1;
    const topOffset = Math.floor(lineWidth / 2);
    const bottomOffset = lineWidth - topOffset - 1;
    for (let dx = -leftOffset; dx <= rightOffset; dx++) {
      for (let dy = -topOffset; dy <= bottomOffset; dy++) {
        let x = clickX + dx, y = clickY + dy;
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
          grid[x][y].state = 1;
          grid[x][y].timer = activeDuration;
          grid[x][y].points = 0;
          grid[x][y].barrier = false;
        }
      }
    }
    lineDrawingMode = false;
    drawGrid();

    // Автоматичне створення бар'єрної лінії відносно активної лінії
    const mode = document.getElementById('barrierModeSelect').value;
    if (mode !== "none") {
      // Обчислюємо межі активної лінії
      const activeXMin = clickX - Math.floor(lineLength / 2);
      const activeXMax = clickX + (lineLength - Math.floor(lineLength / 2) - 1);
      const activeYMin = clickY - Math.floor(lineWidth / 2);
      const activeYMax = clickY + (lineWidth - Math.floor(lineWidth / 2) - 1);
      
      if (mode === "single") {
        const side = document.getElementById('singleBarrierSideSelect').value;
        let region = null;
        if (side === "left") {
          region = { xMin: activeXMin - lineWidth, xMax: activeXMin - 1, yMin: activeYMin, yMax: activeYMax };
        } else if (side === "right") {
          region = { xMin: activeXMax + 1, xMax: activeXMax + lineWidth, yMin: activeYMin, yMax: activeYMax };
        } else if (side === "top") {
          region = { xMin: activeXMin, xMax: activeXMax, yMin: activeYMin - lineWidth, yMax: activeYMin - 1 };
        } else if (side === "bottom") {
          region = { xMin: activeXMin, xMax: activeXMax, yMin: activeYMax + 1, yMax: activeYMax + lineWidth };
        }
        if (region) {
          for (let x = region.xMin; x <= region.xMax; x++) {
            for (let y = region.yMin; y <= region.yMax; y++) {
              if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                grid[x][y].state = 2;
                grid[x][y].timer = refractoryDuration;
                grid[x][y].points = 0;
                grid[x][y].barrier = true;
              }
            }
          }
        }
      } else if (mode === "double") {
        const orient = document.getElementById('doubleBarrierOrientationSelect').value;
        if (orient === "vertical") {
          let regionLeft = { xMin: activeXMin - lineWidth, xMax: activeXMin - 1, yMin: activeYMin, yMax: activeYMax };
          let regionRight = { xMin: activeXMax + 1, xMax: activeXMax + lineWidth, yMin: activeYMin, yMax: activeYMax };
          [regionLeft, regionRight].forEach(region => {
            for (let x = region.xMin; x <= region.xMax; x++) {
              for (let y = region.yMin; y <= region.yMax; y++) {
                if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                  grid[x][y].state = 2;
                  grid[x][y].timer = refractoryDuration;
                  grid[x][y].points = 0;
                  grid[x][y].barrier = true;
                }
              }
            }
          });
        } else if (orient === "horizontal") {
          let regionTop = { xMin: activeXMin, xMax: activeXMax, yMin: activeYMin - lineWidth, yMax: activeYMin - 1 };
          let regionBottom = { xMin: activeXMin, xMax: activeXMax, yMin: activeYMax + 1, yMax: activeYMax + lineWidth };
          [regionTop, regionBottom].forEach(region => {
            for (let x = region.xMin; x <= region.xMax; x++) {
              for (let y = region.yMin; y <= region.yMax; y++) {
                if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                  grid[x][y].state = 2;
                  grid[x][y].timer = refractoryDuration;
                  grid[x][y].points = 0;
                  grid[x][y].barrier = true;
                }
              }
            }
          });
        }
      }
      drawGrid();
    }
  } else if (circleDrawingMode) {
    // Режим малювання кола-середовища
    const radius = parseInt(document.getElementById('circleRadiusInput').value) || 1;
    const circleActive = parseInt(document.getElementById('circleActiveInput').value) || 4;
    const circleRefractory = parseInt(document.getElementById('circleRefractoryInput').value) || 5;
    const circleResting = parseInt(document.getElementById('circleRestingInput').value) || 1;
    circleEnvs.push({
      cx: clickX,
      cy: clickY,
      radius: radius,
      rules: { activeDuration: circleActive, refractoryDuration: circleRefractory, restingDuration: circleResting }
    });
    circleDrawingMode = false;
    drawGrid();
  } else {
    // Звичайна активація однієї клітинки
    if (clickX >= 0 && clickX < gridSize && clickY >= 0 && clickY < gridSize) {
      grid[clickX][clickY].state = 1;
      grid[clickX][clickY].timer = activeDuration;
      grid[clickX][clickY].points = 0;
      grid[clickX][clickY].barrier = false;
      drawGrid();
    }
  }
});

// Функція, що повертає правила для клітинки (якщо вона всередині кола-середовища)
function getRulesForCell(x, y) {
  for (let env of circleEnvs) {
    let dx = x - env.cx, dy = y - env.cy;
    if (dx * dx + dy * dy <= env.radius * env.radius) {
      return env.rules;
    }
  }
  return { activeDuration: activeDuration, refractoryDuration: refractoryDuration, restingDuration: restingDuration };
}

// Функція одного кроку симуляції
function step() {
  let newGrid = [];
  for (let x = 0; x < gridSize; x++) {
    newGrid[x] = [];
    for (let y = 0; y < gridSize; y++) {
      newGrid[x][y] = { ...grid[x][y] };
    }
  }
  // 1) Активні клітинки роздають поінти сусідам (в межах impulseRows)
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      if (grid[x][y].state === 1) {
        for (let dx = -impulseRows; dx <= impulseRows; dx++) {
          for (let dy = -impulseRows; dy <= impulseRows; dy++) {
            if (dx === 0 && dy === 0) continue;
            let r = Math.max(Math.abs(dx), Math.abs(dy));
            if (r > impulseRows) continue;
            let d = Math.sqrt(dx * dx + dy * dy);
            let base = 1 / Math.pow(2, r - 1);
            let pointsToGive = base * (r / d);
            let nx = x + dx;
            let ny = y + dy;
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
              if (grid[nx][ny].state === 0) {
                newGrid[nx][ny].points += pointsToGive;
              }
            }
          }
        }
      }
    }
  }
  // 2) Оновлення станів клітинок
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      const oldCell = grid[x][y];
      const cell = newGrid[x][y];
      const rules = getRulesForCell(x, y);
      if (oldCell.state === 1) {
        if (oldCell.timer > 1) {
          cell.timer = oldCell.timer - 1;
        } else {
          cell.state = 2;
          cell.timer = rules.refractoryDuration;
          cell.points = 0;
        }
      } else if (oldCell.state === 2) {
        if (oldCell.timer > 1) {
          cell.timer = oldCell.timer - 1;
        } else {
          cell.state = 0;
          cell.timer = reincarnation ? rules.restingDuration : 0;
          cell.points = 0;
          cell.barrier = false;
        }
      } else if (oldCell.state === 0) {
        if (cell.points >= thresholdPoints) {
          cell.state = 1;
          cell.timer = rules.activeDuration;
          cell.points = 0;
        } else if (reincarnation) {
          if (oldCell.timer > 1) {
            cell.timer = oldCell.timer - 1;
          } else if (oldCell.timer === 1) {
            cell.state = 1;
            cell.timer = rules.activeDuration;
            cell.points = 0;
          }
        }
      }
    }
  }
  grid = newGrid;
  drawGrid();
}

// Обробка кнопок "Крок", "Старт" і "Стоп"
document.getElementById('stepButton').addEventListener('click', step);
document.getElementById('startButton').addEventListener('click', () => {
  if (!intervalId) { intervalId = setInterval(step, 100); }
});
document.getElementById('stopButton').addEventListener('click', () => {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
});
drawGrid();
