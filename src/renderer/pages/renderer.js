// 获取DOM元素
const audioDeviceSelect = document.getElementById('audio-device');
const startRecordingBtn = document.getElementById('start-recording');
const stopRecordingBtn = document.getElementById('stop-recording');
const statusMessage = document.getElementById('status-message');
const recordingTime = document.getElementById('recording-time');
const recordingsList = document.getElementById('recordings-list');
const visualizer = document.getElementById('visualizer');
const visualizerCtx = visualizer.getContext('2d');

// 应用状态
let mediaRecorder = null;
let audioStream = null;
let audioChunks = [];
let recordingStartTime = 0;
let recordingTimer = null;
let analyser = null;
let dataArray = null;
let stereomixStream = null;  // 立体声混音流
let microphoneStream = null; // 麦克风流
let currentStream = null;    // 当前使用的流
let audioSources = {};       // 存储不同音频源的ID
let silenceDetectionTimer = null; // 静音检测定时器
let isUsingStereomix = true; // 默认使用立体声混音
let audioContext = null;     // 音频上下文
let audioDestination = null; // 音频目标节点
let stereomixSource = null;  // 立体声混音源节点
let microphoneSource = null; // 麦克风源节点
let isRecording = false;     // 录音状态标志
let stereomixGain = null;    // 立体声混音增益节点
let microphoneGain = null;   // 麦克风增益节点
let isSwitching = false;     // 是否正在切换音频源
let crossfadeDuration = 1.0; // 交叉淡入淡出持续时间(秒)

// 初始化应用
async function initialize() {
  try {
    // 获取音频设备列表
    await loadAudioDevices();
    
    // 设置事件监听器
    startRecordingBtn.addEventListener('click', startRecording);
    stopRecordingBtn.addEventListener('click', stopRecording);
    
    // 调整可视化器大小
    resizeVisualizer();
    window.addEventListener('resize', resizeVisualizer);
    
    // 设置IPC监听器
    const { ipcRenderer } = require('electron');
    ipcRenderer.on('save-recording-reply', (event, result) => {
      if (result.success) {
        statusMessage.textContent = `文件已保存: ${result.filePath}`;
        console.log(`文件已成功保存到: ${result.filePath}`);
      } else {
        statusMessage.textContent = `保存失败: ${result.error}`;
        console.error(`保存失败: ${result.error}`);
      }
    });
    
    statusMessage.textContent = '请选择音频设备并开始录音';
  } catch (error) {
    console.error('初始化失败:', error);
    statusMessage.textContent = `错误: ${error.message}`;
  }
}

// 加载音频设备
async function loadAudioDevices() {
  try {
    // 获取音频设备列表
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log("可用设备:", devices);
    const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
    
    // 清空设备列表
    audioDeviceSelect.innerHTML = '';
    
    // 添加默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '自动选择(推荐)';
    audioDeviceSelect.appendChild(defaultOption);
    
    // 添加音频设备并识别特殊设备
    audioInputDevices.forEach(device => {
      console.log("音频设备:", device);
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `音频设备 (${device.deviceId.substring(0, 8)}...)`;
      audioDeviceSelect.appendChild(option);
      
      // 识别并存储立体声混音设备
      if (device.label.toLowerCase().includes('立体声混音') || 
          device.label.toLowerCase().includes('stereo mix') ||
          device.label.toLowerCase().includes('voicemeeter') ||
          device.label.toLowerCase().includes('what u hear')) {
        audioSources.stereomix = device.deviceId;
      }
      
      // 识别并存储麦克风设备
      if (device.label.toLowerCase().includes('麦克风') || 
          device.label.toLowerCase().includes('microphone') ||
          device.label.toLowerCase().includes('mic')) {
        audioSources.microphone = device.deviceId;
      }
    });
    
    // 如果找到立体声混音，默认选择
    if (audioSources.stereomix) {
      statusMessage.textContent = '已找到立体声混音设备，可以录制耳机声音';
    } else {
      statusMessage.textContent = '未找到立体声混音设备，请手动选择';
    }
  } catch (error) {
    console.error('加载音频设备失败:', error);
    throw new Error('无法获取音频设备列表');
  }
}

// 新增函数：初始化音频处理图（改进版）
async function setupAudioGraph() {
  try {
    // 创建音频上下文
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log("音频上下文创建成功");
    
    // 创建音频目标节点（用于录制）
    audioDestination = audioContext.createMediaStreamDestination();
    console.log("音频目标节点创建成功");
    
    // 创建分析器（用于可视化）
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.connect(audioDestination); // 连接分析器到目标节点
    console.log("分析器节点创建并连接成功");
    
    // 创建增益节点，用于控制音量
    stereomixGain = audioContext.createGain();
    microphoneGain = audioContext.createGain();
    
    // 连接增益节点到分析器
    stereomixGain.connect(analyser);
    microphoneGain.connect(analyser);
    
    // 默认设置：立体声混音开，麦克风关
    stereomixGain.gain.value = 1.0;
    microphoneGain.gain.value = 0.0;
    
    console.log("增益节点创建并连接成功");
    
    // 初始化两个音频流
    await initializeAudioStreams();
    
    // 返回目标节点的流（用于MediaRecorder）
    return audioDestination.stream;
  } catch (error) {
    console.error("设置音频处理图失败:", error);
    throw error;
  }
}

// 修改：初始化两种音频流
async function initializeAudioStreams() {
  try {
    // 如果找到了立体声混音设备
    if (audioSources.stereomix) {
      stereomixStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: audioSources.stereomix },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      console.log("立体声混音流初始化成功");
      
      // 创建源节点并连接到增益节点
      if (audioContext) {
        stereomixSource = audioContext.createMediaStreamSource(stereomixStream);
        stereomixSource.connect(stereomixGain);
        console.log("立体声混音源节点创建并连接成功");
      }
    }
    
    // 如果找到了麦克风设备
    if (audioSources.microphone) {
      microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: audioSources.microphone },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log("麦克风流初始化成功");
      
      // 创建源节点并连接到增益节点（但音量设为0）
      if (audioContext) {
        microphoneSource = audioContext.createMediaStreamSource(microphoneStream);
        microphoneSource.connect(microphoneGain);
        console.log("麦克风源节点创建并连接成功（音量为0）");
      }
    }
    
    // 默认使用立体声混音（如果有）
    if (stereomixStream) {
      currentStream = stereomixStream;
      isUsingStereomix = true;
    } else if (microphoneStream) {
      currentStream = microphoneStream;
      isUsingStereomix = false;
      // 如果没有立体声混音但有麦克风，将麦克风增益设为1
      if (microphoneGain) {
        microphoneGain.gain.value = 1.0;
        stereomixGain.gain.value = 0.0;
        console.log("麦克风源节点音量设为1（无立体声混音）");
      }
    }
    
    return currentStream;
  } catch (error) {
    console.error("初始化音频流失败:", error);
    throw error;
  }
}

// 修改：检测立体声混音是否有声音
function startSilenceDetection() {
  if (!audioContext || !stereomixStream) return;
  
  // 创建专用于检测的分析器
  const silenceAnalyser = audioContext.createAnalyser();
  const silenceSource = audioContext.createMediaStreamSource(stereomixStream);
  silenceSource.connect(silenceAnalyser);
  
  silenceAnalyser.fftSize = 256;
  const bufferLength = silenceAnalyser.frequencyBinCount;
  const silenceDataArray = new Uint8Array(bufferLength);
  
  console.log("静音检测初始化成功");
  
  // 用于跟踪静音持续时间的变量
  let silenceDuration = 0;
  let lastSilenceTime = 0;
  
  // 每200毫秒检查一次音量，提高响应速度
  silenceDetectionTimer = setInterval(() => {
    silenceAnalyser.getByteFrequencyData(silenceDataArray);
    
    // 计算平均音量
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += silenceDataArray[i];
    }
    const average = sum / bufferLength;
    
    const now = Date.now();
    
    // 根据音量切换音频源
    if (average < 5) { // 静音阈值
      // 如果正在使用立体声混音并且检测到静音
      if (isUsingStereomix && microphoneStream) {
        // 记录静音持续时间
        if (lastSilenceTime === 0) {
          lastSilenceTime = now;
        } else {
          silenceDuration = now - lastSilenceTime;
        }
        
        // 预先准备激活麦克风，即使未达到切换阈值
        if (silenceDuration > 200 && !isSwitching) {
          // 开始让麦克风预热，但不完全切换
          console.log("检测到可能的静音，预热麦克风");
          // 将麦克风增益调整到较低值，但不为0，以便开始录制
          if (microphoneGain.gain.value === 0) {
            microphoneGain.gain.value = 0.3;
          }
        }
        
        // 静音超过400毫秒才正式切换，避免误判
        if (silenceDuration > 400 && !isSwitching) {
          console.log(`检测到持续静音 ${silenceDuration}ms，切换到麦克风`);
          switchAudioSource(false);
        }
      }
    } else {
      // 重置静音计时器
      lastSilenceTime = 0;
      silenceDuration = 0;
      
      // 有声音，切换到立体声混音
      if (!isUsingStereomix && stereomixStream && !isSwitching) {
        console.log("检测到声音，切换到立体声混音");
        switchAudioSource(true);
      }
    }
  }, 200); // 缩短检测间隔以提高响应速度
}

// 修改：切换音频源（使用淡入淡出）
function switchAudioSource(useStereomix) {
  if (useStereomix === isUsingStereomix || !audioContext || isSwitching) return;
  
  console.log(`开始切换音频源: ${useStereomix ? '立体声混音' : '麦克风'}`);
  isSwitching = true;
  
  // 获取当前时间
  const currentTime = audioContext.currentTime;
  
  // 使用淡入淡出效果实现平滑过渡
  if (useStereomix) {
    // 从麦克风切换到立体声混音
    
    // 立体声混音淡入
    stereomixGain.gain.setValueAtTime(stereomixGain.gain.value, currentTime);
    stereomixGain.gain.linearRampToValueAtTime(1.0, currentTime + crossfadeDuration);
    
    // 麦克风淡出
    microphoneGain.gain.setValueAtTime(microphoneGain.gain.value, currentTime);
    microphoneGain.gain.linearRampToValueAtTime(0.0, currentTime + crossfadeDuration);
    
    console.log("立体声混音淡入，麦克风淡出");
  } else {
    // 从立体声混音切换到麦克风
    
    // 麦克风淡入（从预热的0.3开始）
    microphoneGain.gain.setValueAtTime(microphoneGain.gain.value, currentTime);
    microphoneGain.gain.linearRampToValueAtTime(1.0, currentTime + crossfadeDuration);
    
    // 立体声混音淡出
    stereomixGain.gain.setValueAtTime(stereomixGain.gain.value, currentTime);
    stereomixGain.gain.linearRampToValueAtTime(0.0, currentTime + crossfadeDuration);
    
    console.log("麦克风淡入，立体声混音淡出");
  }
  
  // 更新状态
  isUsingStereomix = useStereomix;
  currentStream = useStereomix ? stereomixStream : microphoneStream;
  
  // 切换完成后重置切换标志
  setTimeout(() => {
    isSwitching = false;
    console.log(`切换音频源完成: ${useStereomix ? '立体声混音' : '麦克风'}`);
  }, crossfadeDuration * 1000);
  
  statusMessage.textContent = `已切换到${useStereomix ? '耳机声音' : '麦克风'}录制`;
}

// 修改：设置MediaRecorder函数
function setupMediaRecorder(stream) {
  try {
    mediaRecorder = new MediaRecorder(stream);
    console.log(`MediaRecorder创建成功，使用MIME类型: ${mediaRecorder.mimeType}`);
    
    // 每秒获取一次录音数据（确保切换音频源时不会丢失数据）
    mediaRecorder.start(1000);
    console.log("MediaRecorder开始录制，时间片段: 1000ms");
    
    // 设置数据可用时的处理
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        console.log(`收到音频数据块: ${(event.data.size / 1024).toFixed(2)} KB`);
      }
    };
    
    // 录音结束时的处理
    mediaRecorder.onstop = () => {
      console.log(`录制结束，共收集 ${audioChunks.length} 个音频块`);
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      console.log(`生成音频Blob: ${(audioBlob.size / (1024 * 1024)).toFixed(2)} MB`);
      addRecordingToList(audioBlob);
    };
    
    isRecording = true;
  } catch (error) {
    console.error("创建MediaRecorder失败:", error);
    throw error;
  }
}

// 修改startRecording函数
async function startRecording() {
  try {
    const deviceId = audioDeviceSelect.value;
    
    if (deviceId === '') {
      // 自动模式：设置音频处理图并初始化录制
      console.log("使用自动模式录制");
      
      // 设置音频处理图并获取目标流
      const destinationStream = await setupAudioGraph();
      if (!destinationStream) {
        alert('无法创建音频处理图');
        return;
      }
      
      // 初始化录音器
      audioChunks = [];
      setupMediaRecorder(destinationStream);
      
      // 开始静音检测
      startSilenceDetection();
    } else {
      // 手动选择设备模式
      console.log(`使用手动选择的设备录制: ${deviceId}`);
      
      if (!deviceId) {
        alert('请先选择音频设备');
        return;
      }
      
      // 配置音频约束
      const constraints = {
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      };
      
      // 获取音频流
      audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      currentStream = audioStream;
      
      // 设置音频上下文和分析器
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);
      source.connect(analyser);
      
      // 创建目标节点
      const destination = audioContext.createMediaStreamDestination();
      analyser.connect(destination);
      
      // 配置分析器
      analyser.fftSize = 256;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      // 创建MediaRecorder
      audioChunks = [];
      setupMediaRecorder(destination.stream);
    }
    
    // 开始可视化
    drawVisualizer();
    
    // 更新UI
    recordingStartTime = Date.now();
    recordingTimer = setInterval(updateRecordingTime, 1000);
    
    startRecordingBtn.disabled = true;
    stopRecordingBtn.disabled = false;
    audioDeviceSelect.disabled = true;
    
    statusMessage.textContent = '正在录音...';
  } catch (error) {
    console.error('开始录音失败:', error);
    statusMessage.textContent = `错误: ${error.message}`;
  }
}

// 修改stopRecording函数
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    console.log("停止录音");
    mediaRecorder.stop();
    isRecording = false;
    
    // 停止所有音频流
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      console.log("停止手动选择的音频流");
    }
    if (stereomixStream) {
      stereomixStream.getTracks().forEach(track => track.stop());
      console.log("停止立体声混音流");
    }
    if (microphoneStream) {
      microphoneStream.getTracks().forEach(track => track.stop());
      console.log("停止麦克风流");
    }
    
    // 关闭音频上下文
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().then(() => {
        console.log("音频上下文已关闭");
      });
    }
    
    // 清除定时器
    clearInterval(recordingTimer);
    if (silenceDetectionTimer) {
      clearInterval(silenceDetectionTimer);
      silenceDetectionTimer = null;
      console.log("静音检测定时器已清除");
    }
    
    // 重置状态
    audioStream = null;
    stereomixStream = null;
    microphoneStream = null;
    currentStream = null;
    stereomixSource = null;
    microphoneSource = null;
    stereomixGain = null;
    microphoneGain = null;
    audioDestination = null;
    audioContext = null;
    isSwitching = false;
    
    // 更新UI
    startRecordingBtn.disabled = false;
    stopRecordingBtn.disabled = true;
    audioDeviceSelect.disabled = false;
    
    statusMessage.textContent = '录音已完成';
  }
}

// 更新录音时间显示
function updateRecordingTime() {
  const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  recordingTime.textContent = `${minutes}:${seconds}`;
}

// 添加录音到列表
function addRecordingToList(blob) {
  // 创建音频URL
  const audioURL = URL.createObjectURL(blob);
  
  // 创建录音项
  const recordingItem = document.createElement('div');
  recordingItem.className = 'recording-item';
  
  // 创建录音时间标签
  const timestamp = new Date().toLocaleTimeString();
  const recordingLabel = document.createElement('div');
  recordingLabel.textContent = `录音 - ${timestamp} (${(blob.size / (1024 * 1024)).toFixed(2)} MB)`;
  
  // 创建音频元素
  const audio = document.createElement('audio');
  audio.src = audioURL;
  audio.controls = true;
  
  // 创建控制按钮
  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'recording-controls';
  
  // 保存按钮
  const saveBtn = document.createElement('button');
  saveBtn.textContent = '保存';
  saveBtn.addEventListener('click', () => {
    // 将Blob转换为ArrayBuffer
    const reader = new FileReader();
    reader.readAsArrayBuffer(blob);
    reader.onload = () => {
      // 通过IPC发送保存请求
      const { ipcRenderer } = require('electron');
      ipcRenderer.send('save-recording', reader.result);
    };
  });
  
  // 删除按钮
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '删除';
  deleteBtn.addEventListener('click', () => {
    recordingsList.removeChild(recordingItem);
    URL.revokeObjectURL(audioURL);
  });
  
  // 组装UI
  controlsDiv.appendChild(saveBtn);
  controlsDiv.appendChild(deleteBtn);
  
  recordingItem.appendChild(recordingLabel);
  recordingItem.appendChild(audio);
  recordingItem.appendChild(controlsDiv);
  
  // 添加到列表
  recordingsList.appendChild(recordingItem);
  
  // 重置录音时间显示
  recordingTime.textContent = '00:00';
}

// 绘制可视化效果
function drawVisualizer() {
  if (!analyser) return;
  
  requestAnimationFrame(drawVisualizer);
  
  // 获取频率数据
  analyser.getByteFrequencyData(dataArray);
  
  // 清除画布
  visualizerCtx.clearRect(0, 0, visualizer.width, visualizer.height);
  visualizerCtx.fillStyle = '#2a2a2a';
  visualizerCtx.fillRect(0, 0, visualizer.width, visualizer.height);
  
  // 计算条形宽度
  const barWidth = (visualizer.width / dataArray.length) * 2.5;
  let barHeight;
  let x = 0;
  
  // 绘制频谱
  for (let i = 0; i < dataArray.length; i++) {
    barHeight = dataArray[i] / 2;
    
    // 根据频率创建渐变色
    const hue = (i / dataArray.length) * 360;
    visualizerCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    
    visualizerCtx.fillRect(x, visualizer.height - barHeight, barWidth, barHeight);
    
    x += barWidth + 1;
  }
}

// 调整可视化器大小
function resizeVisualizer() {
  visualizer.width = visualizer.offsetWidth;
  visualizer.height = visualizer.offsetHeight;
}

// 初始化应用
document.addEventListener('DOMContentLoaded', initialize);