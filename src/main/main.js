const { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { spawn } = require('child_process');
const os = require('os');
const { parseSecureKey } = require('./generate_secure_key');
// 在主进程文件中添加
const { desktopCapturer } = require('electron');

// 初始化存储
const store = new Store();

// 保存主窗口引用
let mainWindow;

/**
 * 清除Electron缓存
 */
function clearElectronCache() {
  if (mainWindow && mainWindow.webContents) {
    console.log('清除Electron缓存...');
    mainWindow.webContents.session.clearCache();
    mainWindow.webContents.session.clearStorageData({
      storages: ['appcache', 'cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
    });
  }
}

/**
 * 创建主窗口
 */
function createWindow() {
  // 清除存储的激活信息，确保每次启动都需要重新登录
  store.delete('activation');
  
  const iconPath = process.platform === 'win32' 
    ? path.join(__dirname, '../../build/icon.ico')
    : process.platform === 'darwin'
      ? path.join(__dirname, '../../build/icon.icns')
      : path.join(__dirname, '../../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 600,
    height: 650,
    minWidth: 600,
    minHeight: 650,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      devTools: true
    },
    title: '声音鉴定卡',
    autoHideMenuBar: true,
    menuBarVisible: false,
    maximizable: false, // 禁用最大化功能
    fullscreenable: false, // 禁用全屏功能
    resizable: false, // 仍然允许调整大小
    icon: iconPath,
  });

  // 加载应用的入口文件
  // 在开发环境中，可以加载本地服务器
  // 在生产环境中，加载打包后的index.html
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  // 清除缓存
  clearElectronCache();

  // 移除菜单栏
  mainWindow.setMenu(null);
  
  // 获取环境变量，如果未设置则默认为 'production'
  const nodeEnv = process.env.NODE_ENV || 'production';
  console.log('当前环境:', nodeEnv);
  
  // 打开开发者工具（开发环境）
  if (nodeEnv === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  // 创建窗口后添加事件监听器
  mainWindow.on('maximize', () => {
    // 如果窗口被最大化，立即恢复原来的大小
    mainWindow.unmaximize();
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  // 设置空菜单
  Menu.setApplicationMenu(null);
  
  createWindow();

  app.on('activate', () => {
    // 在macOS上，当点击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 在macOS上，除非用户用Cmd + Q确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活。
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 添加获取音色类型的处理程序
ipcMain.handle('get-voice-types', async () => {
  try {
    // 返回音色类型数据
    return {
      female: {
        '萝莉音': ['娇俏傲娇学妹音', '元气美少女音', '清甜温婉音'],
        '少萝音': ['软甜娇嗔可爱音', '奶声奶气幼齿音', '阳光元气小可爱音', '草莓泡芙小天使音'],
        '少女音': ['娇俏可爱学妹音', '可爱小家碧玉音', '山间黄鹂吟鸣音', '天真小迷糊音', '娇声细语音'],
        '少御音': ['傲娇甜美酥麻音', '温柔女神音', '温婉柔弱黛玉音', '吞云吐雾音'],
        '软妹音': ['前桌三好乖乖女', '邻家傲娇青梅音', '清脆婉转小尾音'],
        '御姐音': ['温婉仙气女神音', '清冷少女音', '朦胧迷醉小鼻音', '腼腆羞涩女教师音'],
        '御妈音': ['聪慧娴雅淑女音', '霸气大姐大音', '温柔治愈人妻音', '妇女之友专属闺蜜音'],
        '女王音': ['妖娆性感音', '气息勾魂音', '霸道女总裁音', '销魂迷醉撩人音']
      },
      male: {
        '正太音': ['可爱拖拉音', '傲娇少年音', '木讷呆萌音', '变声期小鼻音'],
        '少年音': ['阳光爽朗学弟音', '温柔邻家哥哥音', '稚气未脱正太音'],
        '青受音': ['空灵舒服玻璃音', '傲娇正太音', '乖巧气泡音', '慵懒含笑小尾音', '邻家腼腆小男孩音'],
        '青年音': ['干干净净治愈音', '午后红茶音', '潜质男神音', '气质修养绅士音'],
        '公子音': ['风度翩翩皇子音', '意气风发君子音', '贵气闷骚音', '文弱书生音'],
        '暖男音': ['温柔宠溺学长音', '低沉磁性叔音', '微微小电流音'],
        '青叔音': ['醇厚蜀黍音', '慵懒青年音', '忧郁小烟嗓', '磨叽唠叨说教育'],
        '大叔音': ['刚硬老爷儿们音', '久经沙场大将军音', '霸气帝王音', '怪蜀黍音']
      }
    };
  } catch (error) {
    console.error('获取音色类型时出错:', error);
    return null;
  }
});

// 验证卡密
ipcMain.handle('verify-card-key', (event, cardKey) => {
  // 检查卡密格式
  if (!cardKey || cardKey.length !== 24) {
    return { valid: false, reason: 'invalid_format' };
  }
  
  // 解析卡密中的时间信息
  const keyInfo = parseSecureKey(cardKey);
  console.log(keyInfo);
  // 如果解析失败，返回无效
  if (!keyInfo) {
    return { valid: false, reason: 'invalid_key' };
  }
  
  // 检查卡密是否过期
  if (!keyInfo.isValid) {
    return { valid: false, reason: 'expired' };
  }
  
  // 卡密有效，存储激活信息
  store.set('activation', {
    time: keyInfo.generatedAt,
    key: cardKey,
    expires_at: keyInfo.expiresAt
  });
  
  return {
    valid: true,
    activationTime: keyInfo.generatedAt,
    expiresAt: keyInfo.expiresAt
  };
});

// 检查卡密是否过期
ipcMain.handle('check-card-expiry', () => {
  const activation = store.get('activation');
  if (!activation) return { valid: false };
  
  const currentTime = Date.now();
  const expiresAt = activation.expires_at;
  
  return {
    valid: currentTime < expiresAt,
    remainingTime: expiresAt - currentTime
  };
});

// 添加 IPC 处理程序来获取桌面音频源
ipcMain.handle('get-desktop-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'], 
      thumbnailSize: { width: 1, height: 1 } 
    });
    return sources;
  } catch (error) {
    console.error('获取桌面音频源时出错:', error);
    return [];
  }
});

// 清除激活信息（登出）
ipcMain.handle('clear-activation', () => {
  try {
    store.delete('activation');
    return { success: true };
  } catch (error) {
    console.error('清除激活信息时出错:', error);
    return { success: false, error: error.message };
  }
});

// 保存背景图
ipcMain.handle('save-background', async (event, imageData) => {
  try {
    // 获取已保存的背景图列表
    let backgrounds = store.get('backgrounds') || [];
    
    // 限制最多5张自定义背景图
    if (backgrounds.length >= 5) {
      return { success: false, message: '最多只能保存5张背景图' };
    }
    
    // 生成唯一ID
    const id = Date.now().toString();
    
    // 保存图片数据
    backgrounds.push({
      id,
      data: imageData
    });
    
    store.set('backgrounds', backgrounds);
    
    return { success: true, id };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 获取背景图列表
ipcMain.handle('get-backgrounds', () => {
  return store.get('backgrounds') || [];
});

// 删除背景图
ipcMain.handle('delete-background', (event, id) => {
  try {
    let backgrounds = store.get('backgrounds') || [];
    backgrounds = backgrounds.filter(bg => bg.id !== id);
    store.set('backgrounds', backgrounds);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// 保存声鉴卡图片
ipcMain.handle('save-voice-card', async (event, imageData) => {
  try {
    // 打开保存对话框
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '保存声鉴卡',
      defaultPath: path.join(app.getPath('pictures'), `声鉴卡_${new Date().getTime()}.png`),
      filters: [
        { name: 'Images', extensions: ['png'] }
      ]
    });
    
    if (canceled) {
      return { success: false, message: '已取消保存' };
    }
    
    // 将Base64数据转换为Buffer
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 写入文件
    fs.writeFileSync(filePath, buffer);
    
    return { success: true, filePath };
  } catch (error) {
    console.error('保存声鉴卡时出错:', error);
    return { success: false, message: '保存声鉴卡时出错' };
  }
});

// 复制图片到剪贴板
ipcMain.handle('copy-image-to-clipboard', (event, imageData) => {
  try {
    // 将Base64数据转换为NativeImage
    const image = nativeImage.createFromDataURL(imageData);
    
    // 复制到剪贴板
    clipboard.writeImage(image);
    
    return { success: true };
  } catch (error) {
    console.error('复制图片到剪贴板时出错:', error);
    return { success: false, message: '复制图片到剪贴板时出错' };
  }
});

// 保存临时音频文件
ipcMain.handle('save-temp-audio', async (event, buffer) => {
  try {
    const tempDir = path.join(os.tmpdir(), 'voice-card');
    
    // 确保临时目录存在
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 创建唯一文件名
    const timestamp = new Date().getTime();
    const tempFilePath = path.join(tempDir, `audio_${timestamp}.wav`);
    
    // 写入文件
    fs.writeFileSync(tempFilePath, buffer);
    
    return tempFilePath;
  } catch (error) {
    console.error('保存临时音频文件时出错:', error);
    throw error;
  }
});

// 分析声音
ipcMain.handle('analyze-voice', async (event, audioFilePath, gender) => {
  return new Promise((resolve) => {
    try {
      console.log('开始分析声音，音频文件路径:', audioFilePath);
      console.log('指定性别:', gender); // 0为男性，1为女性，null为自动判断
      
      // 检查音频文件是否存在
      if (!fs.existsSync(audioFilePath)) {
        console.error('音频文件不存在:', audioFilePath);
        return resolve({ error: '音频文件不存在' });
      }
      
      // 获取文件信息
      const stats = fs.statSync(audioFilePath);
      console.log('音频文件大小:', stats.size, '字节');
      
      if (stats.size === 0) {
        console.error('音频文件为空');
        return resolve({ error: '音频文件为空' });
      }
      
      // 获取可执行文件路径
      const executablePath = getExecutablePath('simple_voice_analyzer');
      console.log('使用可执行文件路径:', executablePath);
      
      // 检查可执行文件是否存在
      if (!fs.existsSync(executablePath)) {
        console.error('找不到声音分析可执行文件:', executablePath);
        return resolve({ error: '找不到声音分析可执行文件，请确保应用安装正确' });
      }
      
      // 构建命令行参数
      const args = ['-f', audioFilePath, '-j'];
      
      // 如果指定了性别，添加性别参数
      if (gender !== null && gender !== undefined) {
        args.push('-g', gender);
      }
      
      console.log('执行命令:', executablePath, args.join(' '));
      
      // 执行可执行文件，指定编码为UTF-8
      const analyzerProcess = spawn(executablePath, args, {
        env: { 
          ...process.env, 
          PYTHONIOENCODING: 'utf-8',
          PYTHONLEGACYWINDOWSSTDIO: '1', // 添加此环境变量解决Windows下的编码问题
          PYTHONUTF8: '1' // 强制Python使用UTF-8编码
        }
      });
      
      let stdoutData = Buffer.from([]);
      let stderrData = '';
      
      analyzerProcess.stdout.on('data', (data) => {
        // 将输出作为Buffer处理，避免编码问题
        stdoutData = Buffer.concat([stdoutData, data]);
        try {
          console.log('分析器输出(原始):', data.toString('utf-8'));
        } catch (e) {
          console.log('分析器输出(无法解码):', data);
        }
      });
      
      analyzerProcess.stderr.on('data', (data) => {
        try {
          const dataStr = data.toString('utf-8');
          stderrData += dataStr;
          console.log('分析器错误输出:', dataStr);
        } catch (e) {
          console.log('分析器错误输出(无法解码):', data);
        }
      });
      
      analyzerProcess.on('close', (code) => {
        console.log('分析器执行完成，退出码:', code);
        
        if (code === 0) {
          try {
            // 将Buffer转换为UTF-8字符串，然后解析JSON
            const outputStr = stdoutData.toString('utf-8').trim();
            console.log('完整标准输出(UTF-8):', outputStr);
            
            // 检查是否有调试版本的JSON（不使用ASCII转义）
            const debugJsonMatch = outputStr.match(/DEBUG_JSON_UTF8:(\{[\s\S]*\})/);
            if (debugJsonMatch) {
              console.log('找到调试版本的JSON输出');
              const debugJsonStr = debugJsonMatch[1];
              try {
                const result = JSON.parse(debugJsonStr);
                console.log('成功解析调试版本的JSON:', result);
                resolve(result);
                return;
              } catch (debugJsonError) {
                console.warn('解析调试版本JSON失败，尝试标准JSON:', debugJsonError);
                // 继续尝试标准JSON
              }
            }
            
            // 尝试从输出中提取JSON部分
            const jsonMatch = outputStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const jsonStr = jsonMatch[0];
              console.log('提取的JSON字符串:', jsonStr);
              
              // 尝试解析JSON结果
              const result = JSON.parse(jsonStr);
              console.log('解析后的结果:', result);
              
              // 检查结果中的字段是否包含乱码
              if (result.main && result.main.name && typeof result.main.name === 'string' && 
                  (result.main.name.includes('\\u') || result.main.name.includes('\\'))) {
                console.log('检测到结果中包含Unicode转义序列，进行解码');
                
                // 递归解码所有字符串字段中的Unicode转义序列
                const decodeUnicode = (obj) => {
                  if (!obj) return obj;
                  
                  if (typeof obj === 'string') {
                    // 解码Unicode转义序列
                    return JSON.parse(`"${obj.replace(/"/g, '\\"')}"`);
                  }
                  
                  if (Array.isArray(obj)) {
                    return obj.map(item => decodeUnicode(item));
                  }
                  
                  if (typeof obj === 'object') {
                    const decoded = {};
                    for (const key in obj) {
                      decoded[key] = decodeUnicode(obj[key]);
                    }
                    return decoded;
                  }
                  
                  return obj;
                };
                
                // 解码结果
                const decodedResult = decodeUnicode(result);
                console.log('解码后的结果:', decodedResult);
                resolve(decodedResult);
              } else {
                resolve(result);
              }
            } else {
              console.error('无法从输出中提取JSON');
              resolve({ 
                error: '解析分析器输出失败，无法提取JSON', 
                stdout: outputStr,
                stderr: stderrData
              });
            }
          } catch (error) {
            console.error('解析分析器输出失败:', error);
            console.error('原始输出:', stdoutData.toString('utf-8'));
            resolve({ 
              error: '解析分析器输出失败', 
              details: stdoutData.toString('utf-8'),
              stderr: stderrData,
              parseError: error.message
            });
          }
        } else {
          // 分析错误类型
          let errorMessage = '执行声音分析失败';
          
          if (stderrData.includes('FileNotFoundError')) {
            errorMessage = '找不到音频文件';
          } else if (stderrData.includes('PermissionError')) {
            errorMessage = '权限不足，无法访问音频文件';
          } else if (stderrData.includes('ValueError: Audio file is too short')) {
            errorMessage = '音频文件太短，无法分析';
          } else if (stderrData.includes('Audio format not supported')) {
            errorMessage = '音频格式不支持，请使用WAV格式';
          } else if (stderrData.includes('ffmpeg is not recognized')) {
            errorMessage = '找不到FFmpeg，请确保FFmpeg已正确安装或包含在应用中';
          } else if (stderrData.includes('ffmpeg')) {
            errorMessage = 'FFmpeg执行错误，请确保FFmpeg已正确安装';
          }
          
          console.error('分析失败:', errorMessage);
          resolve({ 
            error: errorMessage, 
            exitCode: code,
            stderr: stderrData,
            stdout: stdoutData.toString('utf-8')
          });
        }
      });
      
      analyzerProcess.on('error', (error) => {
        console.error('启动分析器进程失败:', error);
        resolve({ error: `启动分析器进程失败: ${error.message}` });
      });
      
    } catch (error) {
      console.error('分析声音时出错:', error);
      resolve({ error: `分析声音时出错: ${error.message}` });
    }
  });
});

// 添加一个辅助函数来获取可执行文件路径
function getExecutablePath(scriptName = 'voice_analyzer') {
  // 获取环境变量，如果未设置则默认为 'production'
  const nodeEnv = process.env.NODE_ENV || 'production';
  console.log(`获取可执行文件路径，环境: ${nodeEnv}, 脚本名: ${scriptName}`);
  
  if (nodeEnv === 'development') {
    // 开发环境下的路径
    const devPath = path.join(__dirname, `../../dist/${scriptName}.exe`);
    console.log('开发环境路径:', devPath);
    return devPath;
  } else {
    // 生产环境下的路径
    const prodPath = path.join(process.resourcesPath, `bin/${scriptName}.exe`);
    console.log('生产环境路径:', prodPath);
    return prodPath;
  }
} 