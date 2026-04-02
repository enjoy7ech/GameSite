/**
 * TinyFlow Story Manifest V10.3 Type Definitions
 * 用于约束和规范 story.json 的手动构造。
 */

export interface StoryManifest {
  meta: ManifestMeta;
  story: StoryNode[];
}

export interface ManifestMeta {
  name: string;
  version: string;
}

export interface StoryNode {
  id: string;
  display: DisplayFrame[];
  triggers?: TriggerRequirement[];
  priority?: number;
  result?: Action[]; //当前剧情完成后，执行的action
}

/**
 * 核心驱动单元：分镜帧
 */
export interface DisplayFrame {
  screen: ScreenState | null;
  dialog: DialogState | null;
  choice: StoryChoice[] | null;
  result?: Action[]; //当前分镜完成后，执行的action
}

export interface ScreenState {
  pic: string;   // 背景原画 ID (例如: "bg_station_day")
  text: string; // 场景中央悬浮文案 (空字符串则不显示)
  item?: string; // (可选) 关键物件叠加层 (例如: "sketches_folder"), 在 UI 层之下展示
}

export interface DialogState {
  char: string; // 角色 ID (用于调用立绘和头像, 例如: "shin")
  text: string; // 对话文本 (包含名字前缀, 例如: "终于到了")
  pic: string; // 角色立绘 ID (例如: "shin")
}

export interface StoryChoice {
  label: string;  // 按钮显示的文字
  target: string; // 选择后跳转的 Node ID
  result: Action[];
}

export interface TriggerRequirement {
  type: "location" | "time_range" | "logic" | "variable";
  value: any;
}

// 对当前游戏的状态产生的影响，dispatch action
export interface Action {
  func: string; //js函数名，在state.js中定义
  params: any[]; //js函数参数
}