# 小浪声鉴卡应用

一个基于Electron的桌面应用程序，用于录制和分析声音，生成个性化的声鉴卡。

## 功能特点

- 智能录音功能：自动在立体声混音(耳机声音)和麦克风之间切换
- 实时音量检测和可视化
- 声音分析引擎
- 个性化声鉴卡生成

## 技术栈

- Electron
- React
- Emotion (CSS-in-JS)
- Web Audio API
- WaveSurfer.js

## 开发环境设置

### 安装依赖

```bash
npm install
```

### 运行开发服务器

```bash
npm run dev
```

### 构建应用

```bash
npm run build
```

## 使用说明

1. 启动应用后，选择您的性别
2. 点击录音按钮开始录制声音
3. 录制时间不少于5秒
4. 点击停止按钮结束录制
5. 点击"分析声音"按钮进行分析
6. 等待分析完成后查看您的声鉴卡

## 声音录制说明

应用会自动检测并优先使用立体声混音设备(用于录制耳机中的声音)。当立体声混音中没有声音时，会自动切换到麦克风录制。整个过程无需用户手动切换，确保录制的音频连续且完整。

## 项目结构

```
voice-card/
├── src/                  # 源代码目录
│   ├── main/             # Electron主进程代码
│   └── renderer/         # 渲染进程代码（React应用）
│       ├── components/   # React组件
│       ├── pages/        # 页面组件
│       ├── utils/        # 工具函数
│       └── styles/       # 样式文件
├── build/                # 构建输出目录
├── public/               # 静态资源
└── package.json          # 项目配置
```

## 使用说明

1. **登录**：输入24位卡密进行登录
2. **录制声音**：在录音页面点击"开始录音"按钮录制声音（至少10秒）
3. **分析声音**：录制完成后点击"分析声音"按钮进行声音分析
4. **制作声鉴卡**：填写用户信息，选择背景图，点击"生成声鉴卡"按钮
5. **保存/复制声鉴卡**：生成声鉴卡后可以下载或复制到剪贴板

### 参数说明

- `-m, --minutes <分钟>`：设置卡密有效期（分钟），默认为43200（30天）
- `-c, --count <数量>`：生成卡密的数量，默认为1
- `-o, --output <文件>`：将生成的卡密保存到指定文件
- `-v, --verify <卡密>`：验证指定的卡密
- `-h, --help`：显示帮助信息

## 注意事项

- 录音时间必须≥10秒
- 用户昵称限制≤15字
- 声音评价限制≤25字
- 最多可上传5张自定义背景图

## 许可证

[MIT](LICENSE)

# Voice Card 应用

这是一个用于录制、分析和创建声音卡片的应用程序。

## 功能特点

- 录制声音并可视化波形
- 分析声音特征（性别、音色类型）
- 创建个性化声音卡片
- 支持专业音频分析

## 安装与运行

### 基本安装

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建应用
npm run build:webpack && npm run build
```

### Python 分析功能

应用使用Python进行声音分析，提供两种分析模式：

1. **高级模式**：使用 librosa 库进行声音分析（推荐）
2. **专业模式**：使用 parselmouth 库进行声音分析（可选）

#### Python 环境设置

要使用声音分析功能，请按照以下步骤安装所需的Python库：

```bash
# 安装基本分析所需的库
pip install numpy librosa

# 安装专业分析所需的库（可选）
pip install praat-parselmouth
```

> **注意**：如果安装 parselmouth 遇到问题，可以跳过，应用会使用 librosa 进行分析。

#### 常见问题

1. **Python 命令找不到**
   
   应用会尝试使用 `python3`、`python` 或 `py` 命令。确保其中至少一个可用。

2. **分析失败**

   如果分析失败，应用会自动使用模拟数据。查看应用日志以获取详细错误信息。

3. **依赖库安装问题**

   - 如果安装 parselmouth 时出现 `use_2to3 is invalid` 错误，可以跳过安装，使用 librosa 进行分析。
   - 确保已正确安装 librosa 和 numpy 库。

## 开发者信息

### 文件结构

- `src/main/` - Electron 主进程代码
- `src/renderer/` - 渲染进程代码（React 应用）
- `src/*.py` - Python 分析脚本

### 分析脚本

- `voice_analyzer_advanced.py` - 高级版分析脚本，使用 librosa 库
- `voice_analyzer.py` - 专业版分析脚本，使用 parselmouth 库（可选）

## 许可证

[MIT](LICENSE) 