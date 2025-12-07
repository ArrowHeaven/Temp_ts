├─ Scripts
  └─ bgController.ts
      import { _decorator, Component, Node, UITransform, view, Vec3 } from 'cc';
      const { ccclass, property } = _decorator;
      
      @ccclass('bgController')
      export class bgController extends Component {
      
          @property(Node)
          public bg01: Node = null;
      
          @property(Node)
          public bg02: Node = null;
      
          @property
          public moveSpeed: number = 300;
      
          private bgHeight: number = 0;
      
          start() {
              // 获取屏幕可视大小
              const screenSize = view.getVisibleSize();
      
              // 获取背景 UITransform（两张尺寸一样）
              const ui = this.bg01.getComponent(UITransform);
      
              // 计算适配比例：背景按高度适配
              const scale = screenSize.height / ui.height;
      
              // 同步设置 bg01 & bg02 的缩放
              this.bg01.setScale(scale, scale);
              this.bg02.setScale(scale, scale);
      
              // 计算适配后的真实背景高度
              this.bgHeight = ui.height * scale;
      
              // 初始化位置（bg01 在上，bg02 在下）
              this.bg01.setPosition(0, 0, 0);
              this.bg02.setPosition(0, this.bgHeight, 0);
          }
      
          update(deltaTime: number) {
      
              // 向下滚动
              this.bg01.setPosition(this.bg01.position.x, this.bg01.position.y - this.moveSpeed * deltaTime);
              this.bg02.setPosition(this.bg02.position.x, this.bg02.position.y - this.moveSpeed * deltaTime);
      
              // 如果 bg01 滚出下边，则放到最上
              if (this.bg01.position.y <= -this.bgHeight) {
                  this.bg01.setPosition(0, this.bg02.position.y + this.bgHeight, 0);
              }
      
              // 如果 bg02 滚出下边，则放到最上
              if (this.bg02.position.y <= -this.bgHeight) {
                  this.bg02.setPosition(0, this.bg01.position.y + this.bgHeight, 0);
              }
          }
      }
      
  └─ bgController.ts.meta
  └─ bullet.ts
      import { _decorator, Component, PhysicsSystem2D, view } from 'cc';
      import { GameManager } from './gameManager';
      const { ccclass, property } = _decorator;
      
      @ccclass('bullet')
      export class bullet extends Component {
      
          @property
          speed: number = 400;
      
          private screenTop: number = 0;
      
          start() {
              const visibleSize = view.getVisibleSize();
              this.screenTop = visibleSize.height / 2;
      
              // 确保物理系统启用
              if (PhysicsSystem2D.instance && !PhysicsSystem2D.instance.enable) {
                  PhysicsSystem2D.instance.enable = true;
              }
          }
      
          update(deltaTime: number) {
              if (!GameManager.instance || GameManager.instance.isPaused) return; // 新增暂停判断
              if (!GameManager.instance) return;
      
              const pos = this.node.position;
      
              this.node.setPosition(pos.x, pos.y + this.speed * deltaTime, pos.z);
      
              if (pos.y > this.screenTop) {
                  this.node.destroy();
              }
          }
      }
      
  └─ bullet.ts.meta
  └─ enemy.ts
      import { _decorator, Animation, Collider2D, Component, Contact2DType, director, IPhysics2DContact, PhysicsSystem2D} from 'cc';
      import { bullet } from './bullet';
      import { GameManager } from './gameManager';
      const { ccclass, property } = _decorator;
      
      @ccclass('enemy')
      export class enemy extends Component {
      
          @property()
          speed: number = 300;
      
          @property(Animation)
          anima: Animation = null;
      
          @property
          hp: number = 1;
      
          collider: Collider2D = null;
      
          @property(String)
          animaHit: string = "";
          @property(String)
          animaDestroy: string = "";
      
          @property()
          score: number = 100;
      
          // enemy.ts
          start() {
              // 确保物理系统启用
              if (!PhysicsSystem2D.instance.enable) {
                  PhysicsSystem2D.instance.enable = true;
              }
      
              this.collider = this.getComponent(Collider2D);
              if (this.collider) {
                  this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
              } else {
                  console.warn("[Enemy] 敌机缺少碰撞组件");
              }
      
              // 监听场景重启事件
              director.on('SceneRestarting', this.onSceneRestart, this);
          }
      
          private onSceneRestart() {
              // 清理物理回调
              if (this.collider) {
                  this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
              }
              this.unscheduleAllCallbacks();
          }
      
          protected onDestroy(): void {
              director.off('SceneRestarting', this.onSceneRestart, this);
              if (this.collider) {
                  this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
              }
              this.unscheduleAllCallbacks();
          }
      
          update(deltaTime: number) {
              if (!GameManager.instance || GameManager.instance.isPaused) return; // 新增暂停判断
      
              if (!GameManager.instance) return;
      
              if (this.hp > 0) {
                  const pos1 = this.node.position;
                  this.node.setPosition(pos1.x, pos1.y - this.speed * deltaTime, pos1.z)
      
                  const pos2 = this.node.worldPosition;
      
                  if (pos2.y < -10) {
                      this.node.destroy();
                  }
              }
      
          }
      
          onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
              // 完整的实例有效性检查
              if (!GameManager.instance || !GameManager.instance.node || !GameManager.instance.node.isValid) {
                  return;
              }
      
              this.hp -= 1;
              if (otherCollider.getComponent(bullet)) {
      
                  otherCollider.enabled = false;
                  otherCollider.node.destroy();
              }
      
              if (this.hp > 0) {
                  this.anima.play(this.animaHit);
              } else {
                  GameManager.instance.addScore(this.score);
                  this.anima.play(this.animaDestroy);
                  this.anima.once(Animation.EventType.FINISHED, () => {
                      // 延迟到下一帧销毁节点
                      this.scheduleOnce(() => {
                          if (this.node && this.node.isValid) {
                              this.node.destroy();
                          }
                      }, 0);
                  });
                  this.collider.enabled = false;
              }
      
      
          }
      }
      
      
      
  └─ enemy.ts.meta
  └─ enemyManger.ts
      import { _decorator, Component, instantiate, math, Prefab, view } from 'cc';
      import { GameManager } from './gameManager';
      const { ccclass, property } = _decorator;
      
      @ccclass('enemyManger')
      export class enemyManger extends Component {
      
          @property(Prefab)
          enemy0SpawnPre: Prefab = null;
          @property()
          enemy0SpawnRate: number = 1; // 秒
      
          @property(Prefab)
          enemy1SpawnPre: Prefab = null;
          @property()
          enemy1SpawnRate: number = 3;
      
          @property(Prefab)
          enemy2SpawnPre: Prefab = null;
          @property()
          enemy2SpawnRate: number = 5;
      
          private screenWidth: number = 0;
      
          start() {
              const screenSize = view.getVisibleSize();
              this.screenWidth = screenSize.width;
      
              // 分别 schedule 每种敌机
              this.schedule(this.spawnEnemy0, this.enemy0SpawnRate);
              this.schedule(this.spawnEnemy1, this.enemy1SpawnRate);
              this.schedule(this.spawnEnemy2, this.enemy2SpawnRate);
          }
      
          spawnEnemy0() {
              // 添加实例检查
              if (!GameManager.instance || GameManager.instance.isPaused) return;
              this.spawnEnemy(this.enemy0SpawnPre, 450);
          }
      
          spawnEnemy1() {
              // 添加实例检查
              if (!GameManager.instance || GameManager.instance.isPaused) return;
              this.spawnEnemy(this.enemy1SpawnPre, 500);
          }
      
          spawnEnemy2() {
              // 添加实例检查
              if (!GameManager.instance || GameManager.instance.isPaused) return;
              this.spawnEnemy(this.enemy2SpawnPre, 550);
          }
      
          private spawnEnemy(prefab: Prefab, y: number) {
              if (!prefab) return;
              const enemy = instantiate(prefab);
              this.node.addChild(enemy);
      
              const spawnX = math.randomRangeInt(-this.screenWidth / 2, this.screenWidth / 2);
              enemy.setPosition(spawnX, y, 0);
          }
      
          protected onDestroy() {
              this.unscheduleAllCallbacks();
          }
      }
      
  └─ enemyManger.ts.meta
  └─ gameManager.ts
      import { _decorator, Component, Director, director, Node, PhysicsSystem2D } from 'cc';
      import { gameoverUI } from './UI/gameoverUI';
      const { ccclass, property } = _decorator;
      
      @ccclass('GameManager')
      export class GameManager extends Component {
      
          private static _instance: GameManager | null = null;
      
          @property()
          private bombCount: number = 0;
      
          @property()
          private score: number = 0;
      
          @property(Node)
          pauseButton: Node = null;
          @property(Node)
          resumeButton: Node = null;
      
          @property({ visible: false })
          isPaused: boolean = false; // 新增暂停状态标志
      
      
          @property(gameoverUI)
          gameoverUI: gameoverUI = null;
      
          public static get instance(): GameManager {
              if (!this._instance) {
                  console.warn(
                      "[GameManager] 实例尚未初始化！请确认场景中挂了 GameManager 节点。"
                  );
              }
              return this._instance!;
          }
      
          public getBombCount(): number {
              return this.bombCount;
          }
      
          public getScore(): number {
              return this.score;
          }
      
          public addBomb() {
              // 加强实例检查
              if (!GameManager._instance || !GameManager._instance.node) return;
      
              console.log("玩家获得炸弹+1");
              this.bombCount++;
              this.node.emit("bombCountChange");
          }
      
          public addScore(score: number) {
              // 加强实例检查
              if (!GameManager._instance || !GameManager._instance.node) return;
      
              this.score += score;
              this.node.emit("scoreChange");
          }
      
          gameOver() {
              // 添加 gameoverUI 存在性检查
              if (!this.gameoverUI) {
                  console.error("[GameManager] gameoverUI 组件未找到！");
                  return;
              }
      
              const currentScore = this.score;
      
              // 自定义存储路径 key
              const highestScoreKey = "myGame_highestScore";
      
              // 读取历史最高分，读取不到时默认为 0
              let highestScore = 0;
              try {
                  const val = localStorage.getItem(highestScoreKey);
                  highestScore = val !== null ? parseInt(val) : 0;
              } catch (e) {
                  console.error("读取最高分失败:", e);
                  highestScore = 0; // 读取异常也默认为0
              }
      
              // 更新最高分
              if (currentScore > highestScore) {
                  highestScore = currentScore;
                  try {
                      localStorage.setItem(highestScoreKey, highestScore.toString());
                  } catch (e) {
                      console.error("保存最高分失败:", e);
                  }
              }
      
              // 显示游戏结束 UI
              this.gameoverUI.displayScore(highestScore, currentScore);
          }
      
          onLoad() {
              GameManager._instance = this;
          }
      
          gamePause() {
              // 添加按钮存在性检查
              if (this.pauseButton) {
                  this.pauseButton.active = false;
              }
              if (this.resumeButton) {
                  this.resumeButton.active = true;
              }
      
              this.isPaused = true; // 设置暂停标志
          }
      
          gameResume() {
              // 添加按钮存在性检查
              if (this.resumeButton) {
                  this.resumeButton.active = false;
              }
              if (this.pauseButton) {
                  this.pauseButton.active = true;
              }
      
              this.isPaused = false; // 恢复游戏
          }
      
          clickRestart() {
              this.gameResume();
      
              director.once(Director.EVENT_BEFORE_SCENE_LOADING, () => {
                  // 发送场景重启信号，让各组件提前清理
                  director.emit('SceneRestarting');
      
                  // 延迟禁用物理系统以确保清理完成
                  this.scheduleOnce(() => {
                      PhysicsSystem2D.instance.enable = false;
                      this.unscheduleAllCallbacks();
                  }, 0.2);
              });
      
              // 延迟场景加载和物理系统重新启用
              this.scheduleOnce(() => {
                  director.loadScene(director.getScene().name);
              }, 1);
          }
      
          clickQuit() {
              director.loadScene("01-mianMenu");
          }
      
          private onSceneRestart() {
              // 清理所有定时器
              this.unscheduleAllCallbacks();
      
              // 清理物理系统
              if (PhysicsSystem2D.instance) {
                  PhysicsSystem2D.instance.enable = false;
              }
          }
      
          start() {
              // 确保只发送一次就绪事件
              if (GameManager._instance === this) {
                  director.emit('GameManagerReady');
              }
      
              // 确保物理系统启用
              if (PhysicsSystem2D.instance && !PhysicsSystem2D.instance.enable) {
                  PhysicsSystem2D.instance.enable = true;
              }
      
              // 重新获取丢失的引用（使用更可靠的方式）
              if (!this.gameoverUI) {
                  this.gameoverUI = this.node.getComponentInChildren(gameoverUI);
              }
      
              console.log("[GameManager] 初始化完成");
          }
      
          protected onDestroy(): void {
              // 清理所有定时器
              this.unscheduleAllCallbacks();
      
              // 清理事件监听器
              director.off('SceneRestarting', this.onSceneRestart, this);
      
              // 发送销毁事件通知其他组件
              director.emit('GameManagerDestroyed');
          }
      
          update(dt: number) {
              // 每帧逻辑
          }
      }
      
  └─ gameManager.ts.meta
  └─ playerController.ts
      import { _decorator, Component, EventTouch, Input, input, instantiate, Node, Prefab, Vec3, UITransform, Collider2D, Contact2DType, Animation, IPhysics2DContact, game } from 'cc';
      import { reward } from './reward';
      import { rewardType } from './rewardManager';
      import { GameManager } from './gameManager';
      const { ccclass, property } = _decorator;
      
      enum shootType {
          oneShoot,
          multiShoot
      };
      
      @ccclass('player')
      export class player extends Component {
      
          private minX = 0;
          private maxX = 0;
          private minY = 0;
          private maxY = 0;
      
          @property()
          shootRate: number = 0.3;
      
          private shootTimer: number = 0;
      
          @property(Prefab)
          bulletPrefab: Prefab = null;
      
          @property(Prefab)
          bulletPrefab2: Prefab = null;
      
          @property(Node)
          bulletParent: Node = null;
      
          @property(Node)
          Position1: Node = null;
      
          @property(Node)
          Position2: Node = null;
      
          @property(Node)
          Position3: Node = null;
      
          // 双击相关
          private lastClickTime = 0;
          private readonly doubleClickThreshold = 0.2;
      
          @property()
          shootType: shootType = shootType.oneShoot;
      
          @property(Animation)
          anima: Animation = null;
      
          @property(String)
          animaHit: string = "";
          @property(String)
          animaDestroy: string = "";
      
          collider: Collider2D = null;
      
          @property()
          lifeCount: number = 3;
      
          // 是否无敌
          private invincible: boolean = false;
      
          protected onLoad(): void {
              input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
              input.on(Input.EventType.TOUCH_START, this.onTouchStartDoubleClick, this);
      
              // 1) 正确获取 Canvas 节点（两种写法任选其一）
              // 推荐：通过场景查找 Canvas（确保场景里节点名确实是 "Canvas"）
              const canvasNode = this.node.scene.getChildByName("Canvas");
              // 也可以在编辑器里把 Canvas 作为属性拖进来（更稳）：
              // @property(Node) public canvasNode: Node = null;
              // 然后用 this.canvasNode.getComponent(UITransform);
      
              if (!canvasNode) {
                  console.error("找不到 Canvas 节点！请检查场景中 Canvas 名称或把 Canvas 引用作为属性传入。");
                  return;
              }
      
              // 2) 获取 Canvas 的 UITransform（说明：这是 UI 的实际宽高）
              const canvasUI = canvasNode.getComponent(UITransform);
              if (!canvasUI) {
                  console.error("Canvas 上没有 UITransform 组件（很奇怪）");
                  return;
              }
      
              const halfW = canvasUI.width / 2;
              const halfH = canvasUI.height / 2;
      
              // 3) 获取玩家自身的 UITransform（用于玩家宽高）
              const ui = this.node.getComponent(UITransform);
              if (!ui) {
                  console.error("玩家节点没有 UITransform！");
                  return;
              }
              const pw = ui.width / 2;
              const ph = ui.height / 2;
      
              // 4) 允许部分出界（例如允许半宽出界）
              const allow = pw * 0.9; // 修改这个值控制能出界多少比例
      
              // 5) 计算边界（注意用 Canvas 的 halfW/halfH）
              this.minX = -halfW + pw - allow;
              this.maxX = halfW - pw + allow;
              this.minY = -halfH + ph - allow;
              this.maxY = halfH - ph + allow;
      
              this.collider = this.getComponent(Collider2D);
              if (this.collider) {
                  this.collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
              }
          }
      
          // onBeginContact 方法中的奖励处理部分
          // playerController.ts 中的 onBeginContact 方法
          onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
              // 移除过于严格的检查，只保留必要的检查
              if (this.lifeCount <= 0) return; // 只在玩家存活时处理
      
              // 判断是否为奖励
              const r = otherCollider.getComponent(reward);
              if (r) {
                  // 奖励处理逻辑
                  switch (r.type) {
                      case rewardType.reward1:
                          this.shootType = shootType.multiShoot;
                          this.scheduleOnce(() => {
                              this.shootType = shootType.oneShoot;
                          }, 5);
                          break;
                      case rewardType.reward2:
                          if (GameManager.instance) {
                              GameManager.instance.addBomb();
                          }
                          break;
                  }
                  // 加强节点有效性检查后再销毁
                  if (otherCollider.node && otherCollider.node.isValid) {
                      otherCollider.node.destroy();
                  }
                  return; // 奖励不会扣血，直接 return
              }
      
              // 只有在非奖励情况下才检查无敌
              if (this.invincible) return;
      
              // 扣血逻辑
              this.invincible = true;
              this.heartChange(-1);
      
              if (this.lifeCount > 0) {
                  this.anima.play(this.animaHit);
                  this.scheduleOnce(() => {
                      this.invincible = false;
                  }, 1);
              } else {
                  this.anima.play(this.animaDestroy);
                  this.scheduleOnce(() => {
                      if (GameManager.instance) {
                          GameManager.instance.gameOver();
                          GameManager.instance.gamePause();
                      }
                      if (this.node && this.node.isValid) {
                          this.node.destroy();
                      }
                  }, 1);
              }
          }
      
          heartChange(count: number) {
              this.lifeCount += count;
              console.log("扣血了！");
              this.node.emit("heartCountChange");
          }
      
      
          protected onDestroy(): void {
              input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
              input.off(Input.EventType.TOUCH_START, this.onTouchStartDoubleClick, this);
      
              this.unscheduleAllCallbacks();
      
              if (this.collider) {
                  this.collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
              }
          }
      
          onTouchMove(event: EventTouch) {
              // 加强实例检查
              if (!GameManager.instance || this.lifeCount < 1 || GameManager.instance.isPaused) return;
      
              const pos = this.node.position;
      
              let newPos = new Vec3(
                  pos.x + event.getDeltaX(),
                  pos.y + event.getDeltaY(),
                  pos.z
              );
      
              // 限制在动态边界内
              newPos.x = Math.min(Math.max(newPos.x, this.minX), this.maxX);
              newPos.y = Math.min(Math.max(newPos.y, this.minY), this.maxY);
      
              this.node.setPosition(newPos);
          }
      
          onTouchStartDoubleClick() {
              const now = performance.now() / 1000;
      
              if (now - this.lastClickTime <= this.doubleClickThreshold) {
                  console.log("触发了双击事件");
                  this.lastClickTime = 0;
              } else {
                  this.lastClickTime = now;
              }
          }
      
      
          protected update(dt: number): void {
              if (GameManager.instance.isPaused) return; // 新增
      
              switch (this.shootType) {
                  case shootType.oneShoot:
                      this.oneShoot(dt);
                      break;
                  case shootType.multiShoot:
                      this.multiShoot(dt);
                      break;
              }
          }
      
          oneShoot(dt: number) {
              // 添加实例检查
              if (!GameManager.instance) return;
      
              this.shootTimer += dt;
              if (this.shootTimer >= this.shootRate) {
                  this.shootTimer = 0;
      
                  const bullet1 = instantiate(this.bulletPrefab);
                  this.bulletParent.addChild(bullet1);
                  bullet1.setWorldPosition(this.Position1.worldPosition);
              }
          }
      
          multiShoot(dt: number) {
              // 添加实例检查
              if (!GameManager.instance) return;
      
              this.shootTimer += dt;
              if (this.shootTimer >= this.shootRate) {
                  this.shootTimer = 0;
      
                  const bullet2 = instantiate(this.bulletPrefab2);
                  const bullet3 = instantiate(this.bulletPrefab2);
                  this.bulletParent.addChild(bullet2);
                  this.bulletParent.addChild(bullet3);
                  bullet2.setWorldPosition(this.Position2.worldPosition);
                  bullet3.setWorldPosition(this.Position3.worldPosition);
              }
          }
      }
      
  └─ playerController.ts.meta
  └─ reward.ts
      import { _decorator, Component } from 'cc';
      import { rewardType } from './rewardManager';
      import { GameManager } from './gameManager';
      const { ccclass, property } = _decorator;
      
      @ccclass('reward')
      export class reward extends Component {
      
          @property()
          type: rewardType = rewardType.reward1;  // 默认类型（可在 prefab 上设置）
      
          @property()
          speed: number = 150;
      
          update(deltaTime: number) {
              if (!GameManager.instance || GameManager.instance.isPaused) return; // 新增暂停判断
      
              const pos1 = this.node.position;
              this.node.setPosition(pos1.x, pos1.y - this.speed * deltaTime, pos1.z)
      
              const pos2 = this.node.worldPosition;
      
              if (pos2.y < -10) {
                  this.node.destroy();
              }
          }
      }
      
  └─ reward.ts.meta
  └─ rewardManager.ts
      import { _decorator, Component, Prefab, instantiate, view, math, Enum } from 'cc';
      const { ccclass, property } = _decorator;
      
      export enum rewardType {
          reward1,
          reward2
      }
      
      // 注册枚举类型
      Enum(rewardType);
      
      import { GameManager } from './gameManager';
      
      @ccclass('rewardManager')
      export class rewardManager extends Component {
      
          @property({ type: [Prefab] })
          rewardPrefabs: Prefab[] = [];
      
          @property()
          private spawnInterval: number = 15;
      
          private screenWidth: number = 0;
      
          start() {
              const screenSize = view.getVisibleSize();
              this.screenWidth = screenSize.width;
      
              // schedule 使用 wrapper，暂停时不生成奖励
              this.schedule(this.spawnRewardWrapper, this.spawnInterval);
          }
      
          // 包装方法，暂停时不生成奖励
          spawnRewardWrapper() {
              // 添加实例检查
              if (!GameManager.instance || GameManager.instance.isPaused) return;
              this.spawnRandomReward();
          }
      
          // 原始生成奖励方法
          spawnRandomReward() {
              if (this.rewardPrefabs.length === 0) {
                  console.warn("未设置奖励预制体");
                  return;
              }
      
              const randomIndex = math.randomRangeInt(0, this.rewardPrefabs.length);
              const reward = instantiate(this.rewardPrefabs[randomIndex]);
              this.node.addChild(reward);
      
              const spawnX = math.randomRange(-this.screenWidth / 2, this.screenWidth / 2);
              let spawnY = 600;
      
              if (randomIndex === 1) {
                  spawnY = 680;
              }
      
              reward.setPosition(spawnX, spawnY, 0);
          }
      
          protected onDestroy(): void {
              this.unschedule(this.spawnRewardWrapper);
          }
      }
      
  └─ rewardManager.ts.meta
  └─ SceneHierarchyPrinter.ts
      import { _decorator, Component, director, Scene, Node } from 'cc';
      const { ccclass } = _decorator;
      
      @ccclass('SceneHierarchyPrinter')
      export class SceneHierarchyPrinter extends Component {
      
          start() {
              // 获取当前激活场景
              const scene: Scene = director.getScene();
              console.log('当前场景名称:', scene.name);
      
              // 递归打印所有节点
              this.printNodeHierarchy(scene, 0);
          }
      
          private printNodeHierarchy(node: Node, depth: number) {
              const indent = ' '.repeat(depth * 2); // 控制缩进
              console.log(`${indent}- ${node.name}`);
      
              for (const child of node.children) {
                  this.printNodeHierarchy(child, depth + 1);
              }
          }
      }
      
  └─ SceneHierarchyPrinter.ts.meta
  └─ startUI.ts
      import { _decorator, Component, director, Node } from 'cc';
      const { ccclass, property } = _decorator;
      
      @ccclass('startUI')
      export class startUI extends Component {
          start() {
      
          }
      
          update(deltaTime: number) {
              
          }
      
          clickStart() {
              director.loadScene("02-game");
          }
      }
      
      
      
  └─ startUI.ts.meta
  ├─ UI
    └─ bombUI.ts
        import { _decorator, Component, director, Label, Node } from 'cc';
        import { GameManager } from '../gameManager';
        const { ccclass, property } = _decorator;
        
        @ccclass('bombUI')
        export class bombUI extends Component {
        
            @property(Label)
            bombCountDisplay: Label = null;
        
            start() {
                this.registerBombEvents();
            }
        
            private registerBombEvents() {
                // 先移除可能存在的旧监听器
                if (GameManager.instance?.node) {
                    GameManager.instance.node.off("bombCountChange", this.bombCountChange, this);
                    GameManager.instance.node.on("bombCountChange", this.bombCountChange, this);
                }
            }
        
            bombCountChange() {
                // 添加实例检查
                if (GameManager.instance) {
                    this.bombCountDisplay.string = GameManager.instance.getBombCount().toString();
                }
            }
        
            update(deltaTime: number) {
        
            }
        
            protected onDestroy(): void {
                director.targetOff(this); // 清理事件监听
                if (GameManager.instance?.node) {
                    GameManager.instance.node.off("bombCountChange", this.bombCountChange, this);
                }
            }
        }
        
        
        
    └─ bombUI.ts.meta
    └─ gameoverUI.ts
        import { _decorator, Component, Label, Node } from 'cc';
        const { ccclass, property } = _decorator;
        
        @ccclass('gameoverUI')
        export class gameoverUI extends Component {
        
            @property(Label)
            HighestScore: Label = null;
            @property(Label)
            ThisGameScore: Label = null;
        
            displayScore(highestScore: number, thisGameScore: number) {
                this.node.active = true;
                this.HighestScore.string = highestScore.toString();
                this.ThisGameScore.string = thisGameScore.toString();
            }
        }
        
        
        
    └─ gameoverUI.ts.meta
    └─ heartUI.ts
        import { _decorator, Component, director, Label, Node } from 'cc';
        import { player } from '../playerController';
        const { ccclass, property } = _decorator;
        
        @ccclass('heartUI')
        export class heartUI extends Component {
        
            @property(Label)
            heartCountDisplay: Label = null;
        
            @property(Node)
            playerNode: Node = null; // 在编辑器直接拖玩家节点
        
            private playerComp: player = null;
        
            start() {
                if (!this.playerNode) {
                    console.error("heartUI: 没有绑定玩家节点！");
                    return;
                }
        
                this.playerComp = this.playerNode.getComponent(player);
                if (!this.playerComp) {
                    console.error("heartUI: 玩家节点没有 player 组件！");
                    return;
                }
        
                // 原代码: this.playerNode.on("heartCountChange", this.heartCountChange, this);
                if (this.playerNode) {
                    this.playerNode.on("heartCountChange", this.heartCountChange, this);
                } else {
                    director.once('PlayerReady', this.registerHeartEvents, this);
                }
        
                // 初始化显示
                this.heartCountChange();
            }
        
            private registerHeartEvents() {
                if (this.playerNode) {
                    this.playerNode.on("heartCountChange", this.heartCountChange, this);
                }
            }
        
            heartCountChange() {
                if (this.playerComp) {
                    this.heartCountDisplay.string = this.playerComp.lifeCount.toString();
                }
            }
        
            onDestroy() {
                if (this.playerNode && this.playerNode.isValid) {
                    this.playerNode.off("heartCountChange", this.heartCountChange, this);
                }
            }
        }
        
        
        
        
    └─ heartUI.ts.meta
    └─ scoreUI.ts
        import { _decorator, Component, director, Label, Node } from 'cc';
        import { GameManager } from '../gameManager';
        const { ccclass, property } = _decorator;
        
        @ccclass('scoreUI')
        export class scoreUI extends Component {
        
        
            @property()
            score: number = 0;
        
            @property(Label)
            scoreDisplay: Label = null;
        
            start() {
                this.registerScoreEvents();
            }
        
            private registerScoreEvents() {
                // 先移除可能存在的旧监听器
                if (GameManager.instance?.node) {
                    GameManager.instance.node.off("scoreChange", this.scoreChange, this);
                    GameManager.instance.node.on("scoreChange", this.scoreChange, this);
                }
            }
        
            scoreChange() {
                // 添加实例检查
                if (GameManager.instance) {
                    this.scoreDisplay.string = GameManager.instance.getScore().toString();
                }
            }
            update(deltaTime: number) {
        
            }
            protected onDestroy(): void {
                director.targetOff(this); // 清理事件监听
                if (GameManager.instance?.node) {
                    GameManager.instance.node.off("scoreChange", this.scoreChange, this);
                }
            }
        }
        
        
        
    └─ scoreUI.ts.meta
  └─ UI.meta
└─ Scripts.meta
