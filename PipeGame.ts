import {
  _decorator, Component, Node, Label,
  UITransform, Color, Vec3, Graphics
} from 'cc';
import { TileType, getConnections } from './TileData';

const { ccclass } = _decorator;
const DIRS = [[-1,0],[0,1],[1,0],[0,-1]];

const PUZZLE: [TileType, number][][] = [
  [[TileType.START,0],   [TileType.STRAIGHT,0],[TileType.STRAIGHT,0],[TileType.ELBOW,90]],
  [[TileType.EMPTY,0],   [TileType.EMPTY,0],   [TileType.EMPTY,0],  [TileType.STRAIGHT,0]],
  [[TileType.EMPTY,0],   [TileType.EMPTY,0],   [TileType.EMPTY,0],  [TileType.STRAIGHT,0]],
  [[TileType.EMPTY,0],   [TileType.EMPTY,0],   [TileType.EMPTY,0],  [TileType.END,0]],
];

const START_ROT: number[][] = [
  [0,  90,  90,  180],
  [0,  0,   0,   90],
  [0,  0,   0,   90],
  [0,  0,   0,   0],
];

// Solved rotations for preview — matches what player achieves after winning
const SOLVED_ROT: number[][] = [
  [0,  0,  0,  90],
  [0,  0,  0,  0],
  [0,  0,  0,  0],
  [0,  0,  0,  0],
];

@ccclass('PipeGame')
export class PipeGame extends Component {
  private tileNodes:  Node[][]               = [];
  private tileData:   [TileType, number][][] = [];
  private movesLeft   = 12;
  private movesLbl!:  Label;
  private statusLbl!: Label;
  private gameScr!:   Node;
  private endScr!:    Node;
  private resultLbl!: Label;
  private solved      = false;

  onLoad() { this.buildUI(); this.startGame(); }

  private bg(node: Node, w: number, h: number, col: Color, radius = 10) {
    const g = node.addComponent(Graphics);
    g.fillColor = col;
    g.roundRect(-w/2, -h/2, w, h, radius);
    g.fill();
  }

  private makeBox(name: string, parent: Node, w: number, h: number, col: Color, radius = 10): Node {
    const n = new Node(name);
    n.addComponent(UITransform).setContentSize(w, h);
    this.bg(n, w, h, col, radius);
    parent.addChild(n);
    return n;
  }

  private makeLabel(text: string, parent: Node, size: number, col = new Color(255,255,255,255)): Label {
    const n = new Node('lbl');
    n.addComponent(UITransform).setContentSize(680, size + 20);
    const lb = n.addComponent(Label);
    lb.string = text; lb.fontSize = size; lb.color = col;
    parent.addChild(n);
    return lb;
  }

  private drawPipe(node: Node, type: TileType, size: number) {
    const g = node.addComponent(Graphics);
    g.strokeColor = new Color(255, 255, 255, 240);
    g.lineWidth = size * 0.25;
    const h = size / 2;
    if (type === TileType.STRAIGHT) {
      g.moveTo(-h, 0); g.lineTo(h, 0); g.stroke();
    } else if (type === TileType.ELBOW) {
      g.moveTo(h, 0); g.lineTo(0, 0); g.lineTo(0, h); g.stroke();
    } else if (type === TileType.START) {
      g.fillColor = new Color(255,255,255,255);
      g.circle(0, 0, size * 0.2); g.fill();
      g.moveTo(0, 0); g.lineTo(h, 0); g.stroke();
    } else if (type === TileType.END) {
      g.moveTo(-h, 0); g.lineTo(0, 0); g.stroke();
      g.fillColor = new Color(255,255,255,255);
      g.circle(0, 0, size * 0.22); g.fill();
    }
  }

  private buildUI() {
    const root = this.node;
    const W = 720, H = 1280;

    // ══ GAME SCREEN ══
    this.gameScr = new Node('GS');
    this.gameScr.addComponent(UITransform).setContentSize(W, H);
    root.addChild(this.gameScr);

    const bgNode = new Node('bg');
    bgNode.addComponent(UITransform).setContentSize(W, H);
    this.bg(bgNode, W, H, new Color(13,35,70,255), 0);
    this.gameScr.addChild(bgNode);

    // title
    const title = this.makeLabel('💧 Pipe Rescue', this.gameScr, 54);
    title.node.setPosition(new Vec3(0, 520, 0));

    // moves pill
    const movePill = this.makeBox('mp', this.gameScr, 300, 54, new Color(20,90,170,255), 27);
    movePill.setPosition(new Vec3(0, 450, 0));
    this.movesLbl = this.makeLabel('Moves Left: 12', movePill, 26);
    this.movesLbl.node.setPosition(new Vec3(0, 0, 0));

    // instruction
    const inst = this.makeLabel('Tap tiles to rotate  ·  Connect S → E', this.gameScr, 24, new Color(150,200,255,255));
    inst.node.setPosition(new Vec3(0, 385, 0));

    // GRID
    const TILE = 130, ROWS = 4, COLS = 4;
    const ox = -((COLS-1)*TILE)/2;
    const oy =  ((ROWS-1)*TILE)/2;
    const gridY = 80;

    this.tileNodes = [];
    for (let r = 0; r < ROWS; r++) {
      this.tileNodes[r] = [];
      for (let c = 0; c < COLS; c++) {
        const [type] = PUZZLE[r][c];
        const tileCol =
          type === TileType.START  ? new Color(30,150,60,255)  :
          type === TileType.END    ? new Color(190,145,10,255) :
          type === TileType.EMPTY  ? new Color(18,42,80,255)   :
                                     new Color(40,95,175,255);

        const tile = this.makeBox(`t${r}${c}`, this.gameScr, TILE-6, TILE-6, tileCol, 14);
        tile.setPosition(new Vec3(ox+c*TILE, oy-r*TILE+gridY, 0));

        if (type !== TileType.EMPTY) {
          const pn = new Node('pipe');
          pn.addComponent(UITransform).setContentSize(TILE-6, TILE-6);
          this.drawPipe(pn, type, TILE-18);
          tile.addChild(pn);
          const row = r, col = c;
          tile.on(Node.EventType.TOUCH_END, () => this.onTap(row, col), this);
        }
        this.tileNodes[r][c] = tile;
      }
    }

    // check path button
    const checkBtn = this.makeBox('cb', this.gameScr, 500, 68, new Color(30,150,60,255), 34);
    checkBtn.setPosition(new Vec3(0, -300, 0));
    this.makeLabel('✓  Check Path', checkBtn, 32);
    checkBtn.on(Node.EventType.TOUCH_END, () => this.checkAndShow(), this);

    // status
    this.statusLbl = this.makeLabel('Status: Not connected yet', this.gameScr, 26, new Color(150,200,255,255));
    this.statusLbl.node.setPosition(new Vec3(0, -390, 0));

    // ══ END SCREEN ══
    this.endScr = new Node('ES');
    this.endScr.addComponent(UITransform).setContentSize(W, H);
    root.addChild(this.endScr);
    this.endScr.active = false;

    const ebg = new Node('ebg');
    ebg.addComponent(UITransform).setContentSize(W, H);
    this.bg(ebg, W, H, new Color(8,20,48,255), 0);
    this.endScr.addChild(ebg);

    this.resultLbl = this.makeLabel('', this.endScr, 62);
    this.resultLbl.node.setPosition(new Vec3(0, 430, 0));

    this.makeLabel('Puzzle complete! 🎊', this.endScr, 32, new Color(150,200,255,255))
        .node.setPosition(new Vec3(0, 355, 0));

    this.makeLabel('— Solved Path —', this.endScr, 26, new Color(150,200,255,255))
        .node.setPosition(new Vec3(0, 285, 0));

    // mini preview grid with CORRECT solved rotations
    const MINI = 66;
    const mx = -((COLS-1)*MINI)/2;
    const my =  ((ROWS-1)*MINI)/2;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const [type] = PUZZLE[r][c];
        const mc =
          type === TileType.START ? new Color(30,150,60,255)  :
          type === TileType.END   ? new Color(190,145,10,255) :
          type === TileType.EMPTY ? new Color(18,38,72,255)   :
                                    new Color(40,190,90,255);
        const mn = this.makeBox(`m${r}${c}`, this.endScr, MINI-4, MINI-4, mc, 8);
        mn.setPosition(new Vec3(mx+c*MINI, my-r*MINI+140, 0));
        // apply solved rotation to preview tile
        mn.angle = -SOLVED_ROT[r][c];
        if (type !== TileType.EMPTY) {
          const pn = new Node('p');
          pn.addComponent(UITransform).setContentSize(MINI-4, MINI-4);
          this.drawPipe(pn, type, MINI-10);
          mn.addChild(pn);
        }
      }
    }

    // Play Now button — restarts game
    const playBtn = this.makeBox('pb', this.endScr, 580, 88, new Color(20,110,210,255), 44);
    playBtn.setPosition(new Vec3(0, -190, 0));
    this.makeLabel('🎮  Play Now', playBtn, 42);
    playBtn.on(Node.EventType.TOUCH_END, () => this.startGame(), this);

    // Retry button — also restarts game
    const retryBtn = this.makeBox('rb', this.endScr, 300, 68, new Color(55,55,85,255), 34);
    retryBtn.setPosition(new Vec3(0, -305, 0));
    this.makeLabel('↩  Retry', retryBtn, 34);
    retryBtn.on(Node.EventType.TOUCH_END, () => this.startGame(), this);
  }

  private startGame() {
    this.solved    = false;
    this.movesLeft = 12;
    this.movesLbl.string  = 'Moves Left: 12';
    this.statusLbl.string = 'Status: Not connected yet';
    this.gameScr.active   = true;
    this.endScr.active    = false;

    this.tileData = PUZZLE.map((row, r) =>
      row.map(([t], c) => [t, START_ROT[r][c]] as [TileType, number])
    );
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        this.tileNodes[r][c].angle = -this.tileData[r][c][1];
  }

  private onTap(row: number, col: number) {
    if (this.solved || this.movesLeft <= 0) return;
    const d = this.tileData[row][col];
    d[1] = (d[1] + 90) % 360;
    this.tileNodes[row][col].angle = -d[1];
    this.movesLeft--;
    this.movesLbl.string = `Moves Left: ${this.movesLeft}`;

    const connected = this.checkSolved();
    this.statusLbl.string = connected
      ? '✅ Connected! Well done!'
      : this.movesLeft > 0 ? 'Status: Not connected yet' : '❌ Out of moves!';

    if (connected) {
      this.solved = true;
      this.scheduleOnce(() => this.showEnd(true), 0.8);
    } else if (this.movesLeft <= 0) {
      this.scheduleOnce(() => this.showEnd(false), 0.6);
    }
  }

  private checkAndShow() {
    const connected = this.checkSolved();
    this.statusLbl.string = connected
      ? '✅ Connected! Well done!'
      : 'Status: Not connected yet';
    if (connected) {
      this.solved = true;
      this.scheduleOnce(() => this.showEnd(true), 0.8);
    }
  }

  private checkSolved(): boolean {
    let sr = -1, sc = -1;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (this.tileData[r][c][0] === TileType.START) { sr=r; sc=c; }
    if (sr < 0) return false;

    const vis = Array.from({length:4}, () => new Array(4).fill(false));
    const q: [number,number][] = [[sr,sc]];
    vis[sr][sc] = true;

    while (q.length) {
      const [r,c] = q.shift()!;
      const conns = getConnections(this.tileData[r][c][0], this.tileData[r][c][1]);
      for (let d = 0; d < 4; d++) {
        if (!conns[d]) continue;
        const nr = r+DIRS[d][0], nc = c+DIRS[d][1];
        if (nr<0||nr>=4||nc<0||nc>=4||vis[nr][nc]) continue;
        const [nt,nrot] = this.tileData[nr][nc];
        if (getConnections(nt,nrot)[(d+2)%4]) {
          if (nt === TileType.END) return true;
          vis[nr][nc] = true;
          q.push([nr,nc]);
        }
      }
    }
    return false;
  }

  private showEnd(won: boolean) {
    this.gameScr.active = false;
    this.endScr.active  = true;
    this.resultLbl.string = won ? 'You fixed it! 🎉' : '💧 Out of Moves!';
  }
}


