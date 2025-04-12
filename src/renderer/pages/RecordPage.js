import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import WaveSurfer from 'wavesurfer.js';
import { recordAudio } from '../utils/audioProcessor';
import LogoutButton from '../components/LogoutButton';

// 添加全局变量，用于音频处理和切换
let audioSources = {}; // 存储不同音频源的ID
let stereomixStream = null; // 立体声混音流
let microphoneStream = null; // 麦克风流
let currentStream = null; // 当前使用的流
let isUsingStereomix = true; // 默认使用立体声混音
let audioContext = null; // 音频上下文
let audioDestination = null; // 音频目标节点
let stereomixSource = null; // 立体声混音源节点
let microphoneSource = null; // 麦克风源节点
let stereomixGain = null; // 立体声混音增益节点
let microphoneGain = null; // 麦克风增益节点
let isSwitching = false; // 是否正在切换音频源
let crossfadeDuration = 1.0; // 交叉淡入淡出持续时间(秒)
let silenceDetectionTimer = null; // 静音检测定时器
let mediaRecorder = null; // 媒体录制器
let audioChunks = []; // 音频数据块数组

// 样式
const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
`;

const Header = styled.header`
  background-color: #AA80AD;
  color: white;
  padding: 10px 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  position: relative;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 18px;
`;


const LogoutButtonWrapper = styled.div`
  position: absolute;
  right: 15px;
`;

const Content = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 15px;
  overflow-y: auto;
`;

const RecordingContainer = styled.div`
  background-color: white;
  border-radius: 15px;
  padding: 20px;
  width: 100%;
  max-width: 550px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
  text-align: center;
  border: 2px solid #AA80AD;
`;

const RecordingTitle = styled.h2`
  color: #F2B705;
  font-size: 28px;
  margin-bottom: 20px;
`;

const NoticeBox = styled.div`
  background-color: #FFF9C4;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 30px;
  text-align: center;
`;

const NoticeText = styled.p`
  color: #F2B705;
  font-size: 18px;
  margin: 0;
  font-weight: bold;
`;

const NoticeSubText = styled.p`
  color: #6495ED;
  font-size: 14px;
  margin: 5px 0 0 0;
`;

// 添加设备选择下拉框样式
const DeviceSelector = styled.div`
  width: 100%;
  margin-bottom: 20px;
`;

const DeviceSelect = styled.select`
  width: 100%;
  padding: 10px;
  border: 2px solid #AA80AD;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  background-color: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #F2B705;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const DeviceLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
`;

const CircleButton = styled.button`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: #F2B705;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px auto;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ButtonIcon = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: transparent;
  border: 3px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PauseIcon = styled.div`
  width: 20px;
  height: 20px;
  position: relative;
  
  &:before, &:after {
    content: '';
    position: absolute;
    width: 6px;
    height: 20px;
    background-color: white;
    border-radius: 3px;
  }
  
  &:before {
    left: 4px;
  }
  
  &:after {
    right: 4px;
  }
`;

const PlayIcon = styled.div`
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 10px 0 10px 18px;
  border-color: transparent transparent transparent white;
  margin-left: 4px;
`;

// 修改 RecordIcon 组件，使用 emoji 图标
const RecordIcon = styled.div`
  font-size: 28px; // 调整大小
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
`;


const Timer = styled.div`
  font-size: 24px;
  font-weight: bold;
  margin: 20px 0;
  color: #333;
`;

const WaveformContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 15px;
  margin: 30px 0;
  height: 100px;
  align-items: center;
  background-color: rgba(242, 183, 5, 0.05);
  border-radius: 15px;
  padding: 20px;
  border: 1px dashed #F2B705;
`;

const WaveBar = styled.div`
  width: 12px;
  height: ${props => props.height || '20px'};
  background-color: #F2B705;
  border-radius: 6px;
  box-shadow: 0 0 5px rgba(242, 183, 5, 0.5);
  transition: height 0.1s ease-in-out;
`;

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 30px;
`;

const ActionButton = styled.button`
  padding: 15px;
  border: none;
  border-radius: 10px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
  width: 100%;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ReRecordButton = styled(ActionButton)`
  background-color: #F2B705;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #E0A800;
  }
`;

const AnalyzeButton = styled(ActionButton)`
  background-color: #8A2BE2;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #7A1CD1;
  }
`;

const ErrorMessage = styled.p`
  color: #DC3545;
  margin-top: 15px;
  font-size: 16px;
  font-weight: bold;
`;

const Message = styled.p`
  color: #666;
  margin-top: 15px;
  font-size: 16px;
`;

// 添加动画样式
const GlobalStyle = styled.div`
  @keyframes waveAnimation {
    0% {
      height: 10px;
      opacity: 0.7;
    }
    50% {
      height: 60px;
      opacity: 1;
    }
    100% {
      height: 10px;
      opacity: 0.7;
    }
  }
`;

// 添加性别选择相关样式
const GenderSelector = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
`;

const GenderOption = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  opacity: ${props => props.selected ? 1 : 0.5};
  transition: all 0.3s;
  
  &:hover {
    opacity: 0.8;
  }
`;

const GenderIcon = styled.div`
  font-size: 32px;
  margin-bottom: 5px;
  color: ${props => props.gender === 'male' ? '#8888BB' : '#FF9700'};
`;

const GenderLabel = styled.div`
  font-size: 14px;
  font-weight: ${props => props.selected ? 'bold' : 'normal'};
  color: ${props => props.selected ? '#AA80AD' : '#666'};
`;

/**
 * 录音页面组件
 */
const RecordPage = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedGender, setSelectedGender] = useState('male');
  
  // 添加设备相关状态
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  
  // 添加音量检测相关状态
  const [audioVolume, setAudioVolume] = useState(0);
  const [waveHeights, setWaveHeights] = useState([15, 25, 35, 45, 35, 25, 15]);
  const [isActive, setIsActive] = useState(false);
  
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(new Audio());
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // 在组件加载时从 sessionStorage 中获取之前选择的性别
  // 并加载音频设备
  useEffect(() => {
    const savedGender = sessionStorage.getItem('selectedGender');
    if (savedGender) {
      setSelectedGender(savedGender);
    }
    
    // 加载音频设备
    loadAudioDevices();
    
    return () => {
      // 确保组件卸载时清理资源
      stopVolumeDetection();
      stopSilenceDetection();
      clearInterval(timerRef.current);
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
      
      // 关闭所有音频流
      if (stereomixStream) {
        stereomixStream.getTracks().forEach(track => track.stop());
      }
      if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => track.stop());
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(err => console.error('关闭音频上下文时出错:', err));
      }
    };
  }, []);
  
  // 初始化WaveSurfer
  useEffect(() => {
    if (waveformRef.current && !audioUrl) {
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#D4A017',
        progressColor: '#AA80AD',
        cursorColor: 'transparent',
        barWidth: 4,
        barRadius: 3,
        responsive: true,
        height: 60,
        barGap: 3,
        normalize: true,
      });
      
      // 清理函数
      return () => {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
        }
      };
    }
  }, [audioUrl]);
  
  // 加载音频到WaveSurfer
  useEffect(() => {
    if (audioUrl && wavesurferRef.current) {
      wavesurferRef.current.load(audioUrl);
    }
  }, [audioUrl]);
  
  // 处理音频播放结束
  useEffect(() => {
    const handleAudioEnded = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
      clearInterval(timerRef.current);
    };
    
    audioRef.current.addEventListener('ended', handleAudioEnded);
    
    return () => {
      audioRef.current.removeEventListener('ended', handleAudioEnded);
    };
  }, []);
  
  // 加载音频设备
  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      // 获取所有音频设备（包括输入和输出设备）
      const audioDevices = devices.filter(device => 
        device.kind === 'audioinput' || device.kind === 'audiooutput'
      );
      
      // 保存所有音频设备到状态
      setAudioDevices(audioDevices);
      
      // 识别并存储音频设备
      audioDevices.forEach(device => {
        if (device.kind === 'audioinput' && (
            device.label.toLowerCase().includes('立体声混音') || 
            device.label.toLowerCase().includes('stereo mix') ||
            device.label.toLowerCase().includes('voicemeeter') ||
            device.label.toLowerCase().includes('what u hear'))) {
          audioSources.stereomix = device.deviceId;
          console.log("找到立体声混音设备:", device.label);
          // 默认选择立体声混音设备
          if (!selectedDevice) {
            setSelectedDevice(device.deviceId);
          }
        }
        
        if (device.kind === 'audioinput' && (
            device.label.toLowerCase().includes('麦克风') || 
            device.label.toLowerCase().includes('microphone') ||
            device.label.toLowerCase().includes('mic'))) {
          audioSources.microphone = device.deviceId;
          console.log("找到麦克风设备:", device.label);
          // 如果没有立体声混音设备，默认选择第一个麦克风
          if (!audioSources.stereomix && !selectedDevice) {
            setSelectedDevice(device.deviceId);
          }
        }
      });
      
      if (audioSources.stereomix) {
        console.log('已找到立体声混音设备，可以录制耳机声音');
      } else {
        console.log('未找到立体声混音设备，将只使用麦克风录音');
      }
    } catch (error) {
      console.error('加载音频设备失败:', error);
      setError('无法获取音频设备列表');
    }
  };
  
  // 修改设备选择处理函数
  const handleDeviceChange = (event) => {
    const deviceId = event.target.value;
    setSelectedDevice(deviceId);
    console.log('选择音频设备:', deviceId);
  };
  
  // 修改初始化音频流函数
  const initializeAudioStreams = async () => {
    try {
      if (!selectedDevice) {
        console.log("未选择录音设备");
        return null;
      }

      // 根据选择的设备ID获取音频流
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: selectedDevice },
          // 如果是立体声混音设备，关闭音频处理
          ...(selectedDevice === audioSources.stereomix ? {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          } : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          })
        }
      });
      
      console.log("音频流初始化成功");
      
      // 创建源节点并连接到增益节点
      if (audioContext) {
        const sourceNode = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.0;
        sourceNode.connect(gainNode);
        gainNode.connect(analyserRef.current);
        console.log("音频节点创建并连接成功");
      }
      
      return stream;
    } catch (error) {
      console.error("初始化音频流失败:", error);
      return null;
    }
  };
  
  // 设置音频处理图
  const setupAudioGraph = async () => {
    try {
      // 创建音频上下文
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log("音频上下文创建成功");
      
      // 创建音频目标节点（用于录制）
      audioDestination = audioContext.createMediaStreamDestination();
      console.log("音频目标节点创建成功");
      
      // 创建分析器（用于可视化）
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.connect(audioDestination);
      console.log("分析器节点创建并连接成功");
      
      // 初始化选中设备的音频流
      const stream = await initializeAudioStreams();
      if (!stream) {
        throw new Error("无法获取音频设备");
      }
      
      // 返回目标节点的流（用于MediaRecorder）
      return audioDestination.stream;
    } catch (error) {
      console.error("设置音频处理图失败:", error);
      setError('音频处理初始化失败: ' + error.message);
      return null;
    }
  };
  
  // 检测立体声混音是否有声音
  const startSilenceDetection = () => {
    // 确保必要的条件都满足才启动静音检测
    if (!audioContext || !stereomixStream || !microphoneStream) {
      console.log("无法启动静音检测 - 缺少必要组件");
      return;
    }
    
    try {
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
    } catch (error) {
      console.error("启动静音检测失败:", error);
      // 静音检测失败不会阻止录音，只是记录错误
    }
  };
  
  // 停止静音检测
  const stopSilenceDetection = () => {
    if (silenceDetectionTimer) {
      clearInterval(silenceDetectionTimer);
      silenceDetectionTimer = null;
      console.log("静音检测定时器已清除");
    }
  };
  
  // 切换音频源（使用淡入淡出）
  const switchAudioSource = (useStereomix) => {
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
  };
  
  // 设置MediaRecorder
  const setupMediaRecorder = (stream) => {
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
        
        // 创建音频URL并设置到状态中
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);
        audioRef.current.src = url;
        audioRef.current.currentTime = 0;
        
        // 在设置audioUrl后立即将录音数据存储到sessionStorage
        sessionStorage.setItem('recordedAudio', url);
        
        setMessage('录音已完成，可以播放或分析');
      };
      
      return true;
    } catch (error) {
      console.error("创建MediaRecorder失败:", error);
      setError('创建录音器失败: ' + error.message);
      return false;
    }
  };
  
  // 音量检测函数
  const startVolumeDetection = (stream) => {
    try {
      // 保存流引用，以便后续清理
      audioStreamRef.current = stream;
      
      // 创建音频上下文和分析器
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      // 连接音频源到分析器
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // 开始音量检测循环
      detectVolume();
    } catch (error) {
      console.error('启动音量检测时出错:', error);
    }
  };
  
  const detectVolume = () => {
    if (!analyserRef.current) return;
    
    // 创建数据数组
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    // 获取频域数据
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // 计算平均音量
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    
    // 更新音量状态
    setAudioVolume(average);
    
    // 判断是否有声音输入（音量阈值设为10）
    const hasSound = average > 10;
    setIsActive(hasSound);
    
    // 根据音量生成波形高度
    if (hasSound) {
      // 将音量值（0-255）映射到高度范围（15-55px）
      const minHeight = 15;
      const maxHeight = 55;
      const volumeScale = (maxHeight - minHeight) / 255;
      
      // 生成7个不同高度的波形条
      const heights = [
        minHeight + average * volumeScale * 0.5,
        minHeight + average * volumeScale * 0.7,
        minHeight + average * volumeScale * 0.9,
        minHeight + average * volumeScale,
        minHeight + average * volumeScale * 0.9,
        minHeight + average * volumeScale * 0.7,
        minHeight + average * volumeScale * 0.5
      ];
      
      setWaveHeights(heights);
    } else {
      // 无声音输入时使用默认高度
      setWaveHeights([15, 25, 35, 45, 35, 25, 15]);
    }
    
    // 继续循环
    animationFrameRef.current = requestAnimationFrame(detectVolume);
  };
  
  const stopVolumeDetection = () => {
    // 停止动画帧
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // 关闭音频上下文
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(err => console.error('关闭音频上下文时出错:', err));
      audioContextRef.current = null;
    }
    
    // 清理分析器
    analyserRef.current = null;
    
    // 停止所有音轨
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    // 重置音量状态
    setAudioVolume(0);
    setIsActive(false);
    setWaveHeights([15, 25, 35, 45, 35, 25, 15]);
  };
  
  // 停止播放
  const stopPlayback = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      clearInterval(timerRef.current);
    }
  };
  
  // 选择性别
  const handleGenderSelect = (gender) => {
    setSelectedGender(gender);
    // 立即保存选择的性别到 sessionStorage
    sessionStorage.setItem('selectedGender', gender);
  };
  
  // 开始录音 - 修改为使用新的音频处理逻辑
  const startRecording = async () => {
    // 如果正在播放，先停止播放
    stopPlayback();
    
    setMessage('');
    setError('');
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
    setPlaybackTime(0); // 重置播放时间为0
    
    // 清除之前的分析结果缓存
    sessionStorage.removeItem('analysisResult');
    sessionStorage.removeItem('analyzedAudioUrl');
    // 保存选择的性别
    sessionStorage.setItem('selectedGender', selectedGender);
    
    // 先设置为录音状态，这样按钮会立即变为暂停图标
    setIsRecording(true);
    
    try {
      // 重置音频数据块数组
      audioChunks = [];
      // 检查是否存在立体声混音设备
      const hasStereoMix = !!audioSources.stereomix;

      // 设置音频处理图并获取目标流
      const destinationStream = await setupAudioGraph();
      if (!destinationStream) {
        // 如果音频处理图设置失败，尝试使用普通麦克风作为备选方案
        console.log("尝试使用默认麦克风录音作为备选方案");
        try {
          // 获取默认的麦克风流
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } 
          });
          
          // 使用默认麦克风流直接设置MediaRecorder
          audioStreamRef.current = fallbackStream;
          const success = setupMediaRecorder(fallbackStream);
          if (!success) {
            throw new Error("无法创建录音器");
          }
          
          console.log("使用默认麦克风录音成功");
          
          // 启动音量检测（用于可视化）
          startVolumeDetection(fallbackStream);
          // 如果没有立体声混音设备，提示用户
          if (!hasStereoMix) {
            setError('未获取到立体声混音设备，无法录制耳机声音');
            // 5秒后清除错误提示
            setTimeout(() => {
              setError('');
            }, 5000);
          }
        } catch (fallbackError) {
          console.error("备选录音方案也失败:", fallbackError);
          setIsRecording(false);
          setError('无法访问任何音频设备，请检查权限设置');
          return;
        }
      } else {
        // 使用音频处理图设置MediaRecorder
        const success = setupMediaRecorder(destinationStream);
        if (!success) {
          setIsRecording(false);
          return;
        }
        
        // 开始静音检测，自动在立体声混音和麦克风之间切换
        // 只有当两种设备都可用时才启动静音检测
        if (stereomixStream && microphoneStream) {
          console.log("两种音频设备都可用，启动静音检测");
          startSilenceDetection();
        } else if (stereomixStream) {
          console.log("只有立体声混音设备可用，无法进行自动切换");
        } else if (microphoneStream) {
          console.log("只有麦克风设备可用，无法进行自动切换");
          // 如果没有立体声混音设备，提示用户
          setError('未获取到立体声混音设备，无法录制耳机声音');
          // 5秒后清除错误提示
          setTimeout(() => {
            setError('');
          }, 5000);
        }
          
        // 启动音量检测（用于可视化）
        startVolumeDetection(destinationStream);
      }
      
        // 开始计时
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      
    } catch (error) {
      console.error('启动录音时出错:', error);
      setIsRecording(false);
      setError('无法访问音频设备，请检查权限设置: ' + error.message);
      stopVolumeDetection();
      stopSilenceDetection();
    }
  };
  
  // 停止录音 - 修改为使用新的录音逻辑
  const stopRecording = () => {
      if (recordingTime < 5) {
        // 如果录音时间小于5秒，只显示提示，不停止录音
        setError('录音时间不能少于5秒');
        
        // 3秒后自动清除错误提示
        setTimeout(() => {
          setError('');
        }, 3000);
        
        return; // 不执行后续停止录音的代码
      }
      
      // 录音时间大于等于5秒，正常停止录音
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      console.log("停止录音");
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      
      // 停止静音检测
      stopSilenceDetection();
      
      // 停止音量检测
      stopVolumeDetection();
    }
  };
  
  // 播放录音
  const playRecording = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        // 如果正在播放，则暂停
        audioRef.current.pause();
        setIsPlaying(false);
        clearInterval(timerRef.current);
      } else {
        // 如果已经播放完毕（currentTime 等于 duration 或非常接近），则从头开始播放
        if (audioRef.current.ended || 
            Math.abs(audioRef.current.currentTime - audioRef.current.duration) < 0.5) {
          audioRef.current.currentTime = 0;
          setPlaybackTime(0); // 重置播放时间显示为0
        }
        // 否则从当前位置继续播放
        audioRef.current.play();
        setIsPlaying(true);
        setPlaybackTime(Math.floor(audioRef.current.currentTime));
        // 开始计时
        timerRef.current = setInterval(() => {
          setPlaybackTime(Math.floor(audioRef.current.currentTime));
        }, 1000);
      }
    }
  };
  
  // 分析声音
  const analyzeVoice = () => {
    // 如果正在播放，先停止播放
    stopPlayback();
    
    if (audioBlob && recordingTime >= 5) {
      // 保存选择的性别到 sessionStorage，确保声鉴卡制作页面可以获取
      sessionStorage.setItem('selectedGender', selectedGender);
      
      // 录音数据已经在stopRecording函数中存储到sessionStorage
      navigate('/analysis');
    } else {
      setError('录音时间不能少于5秒');
    }
  };
  
  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // 渲染波形图
  const renderWaveform = () => {
    if (isRecording) {
      // 录音中显示动态波形，根据音量状态决定是否激活动画
      return (
        <WaveformContainer>
          {waveHeights.map((height, index) => (
            <WaveBar 
              key={index}
              height={`${height}px`}
              style={{
                animation: isActive ? 
                  `waveAnimation ${0.7 + index * 0.1}s infinite alternate` : 
                  'none',
                animationDelay: `${index * 0.1}s`
              }}
            />
          ))}
        </WaveformContainer>
      );
    } else if (audioUrl) {
      // 录音完成后显示波形图
      return (
        <div ref={waveformRef} style={{ width: '100%', marginTop: '20px', marginBottom: '20px' }}></div>
      );
    } else {
      // 初始状态显示静态波形
      return (
        <WaveformContainer>
          <WaveBar height="15px" />
          <WaveBar height="25px" />
          <WaveBar height="35px" />
          <WaveBar height="45px" />
          <WaveBar height="35px" />
          <WaveBar height="25px" />
          <WaveBar height="15px" />
        </WaveformContainer>
      );
    }
  };
  
  // 渲染主按钮
  const renderMainButton = () => {
    if (isRecording) {
      // 录音中 - 显示暂停按钮
      return (
        <CircleButton onClick={stopRecording}>
          <ButtonIcon>
            <PauseIcon />
          </ButtonIcon>
        </CircleButton>
      );
    } else if (audioUrl) {
      // 录音完成 - 显示播放/暂停按钮
      return (
        <CircleButton onClick={playRecording}>
          <ButtonIcon>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </ButtonIcon>
        </CircleButton>
      );
    } else {
      // 初始状态 - 显示麦克风 emoji 图标
      return (
        <CircleButton onClick={startRecording}>
          <ButtonIcon>
            <RecordIcon>🎙️</RecordIcon>
          </ButtonIcon>
        </CircleButton>
      );
    }
  };
  
  // 渲染时间显示
  const renderTimeDisplay = () => {
    if (isRecording) {
      return `${recordingTime} s`;
    } else if (audioUrl && isPlaying) {
      return `${formatTime(playbackTime)} / ${formatTime(recordingTime)}`;
    } else if (audioUrl) {
      return `${formatTime(playbackTime)} / ${formatTime(recordingTime)}`;
    } else {
      return null;
    }
  };
  
  // 渲染通知文本
  const renderNoticeText = () => {
    if (isRecording) {
      return (
        <>
          <NoticeText>请先录制一段声音</NoticeText>
          <NoticeSubText>时间不能少于 5 s</NoticeSubText>
        </>
      );
    } else if (audioUrl) {
      if (recordingTime < 5) {
        return (
          <>
            <NoticeText>请先录制一段声音</NoticeText>
            <NoticeSubText style={{ color: '#DC3545' }}>录音时间不能少于 5 s</NoticeSubText>
          </>
        );
      } else {
        return (
          <>
            <NoticeText>请先录制一段声音</NoticeText>
            <NoticeSubText>时间不能少于 5 s</NoticeSubText>
          </>
        );
      }
    } else {
      return (
        <>
          <NoticeText>请先选择性别并录制声音</NoticeText>
          <NoticeSubText>时间不能少于 5 s</NoticeSubText>
        </>
      );
    }
  };
  
  return (
    <Container>
      <GlobalStyle />
      <Header>
        <Title>声音录制</Title>
        
        <LogoutButtonWrapper>
          <LogoutButton onLogout={() => {
            if (isPlaying) {
              stopPlayback();
            }
          }} />
        </LogoutButtonWrapper>
      </Header>
      
      <Content>
        <RecordingContainer>
          <RecordingTitle>ONE声音鉴定(独家版权)</RecordingTitle>
          
          <NoticeBox>
            {renderNoticeText()}
          </NoticeBox>
          
          {/* 添加设备选择下拉框 */}
          <DeviceSelector>
            <DeviceLabel>选择录音设备：</DeviceLabel>
            <DeviceSelect 
              value={selectedDevice}
              onChange={handleDeviceChange}
              disabled={isRecording}
            >
              <option value="">请选择录音设备</option>
              <optgroup label="输入设备">
                {audioDevices
                  .filter(device => device.kind === 'audioinput')
                  .map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `输入设备 ${device.deviceId}`}
                    </option>
                  ))
                }
              </optgroup>
              <optgroup label="输出设备">
                {audioDevices
                  .filter(device => device.kind === 'audiooutput')
                  .map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `输出设备 ${device.deviceId}`}
                    </option>
                  ))
                }
              </optgroup>
            </DeviceSelect>
          </DeviceSelector>
          
          {/* 性别选择器 */}
          <GenderSelector>
            <GenderOption 
              selected={selectedGender === 'male'} 
              onClick={() => handleGenderSelect('male')}
              style={{ opacity: isRecording ? 0.7 : 1 }}
            >
              <GenderIcon gender="male">♂</GenderIcon>
              <GenderLabel selected={selectedGender === 'male'}>男生</GenderLabel>
            </GenderOption>
            
            <GenderOption 
              selected={selectedGender === 'female'} 
              onClick={() => handleGenderSelect('female')}
              style={{ opacity: isRecording ? 0.7 : 1 }}
            >
              <GenderIcon gender="female">♀</GenderIcon>
              <GenderLabel selected={selectedGender === 'female'}>女生</GenderLabel>
            </GenderOption>
          </GenderSelector>
          
          {renderMainButton()}
          
          <Timer>
            {renderTimeDisplay()}
          </Timer>
          
          {renderWaveform()}
          
          {audioUrl && recordingTime >= 5 && (
            <ButtonsContainer>
              <ReRecordButton onClick={async () => {
                // 停止播放（如果正在播放）
                stopPlayback();
                
                // 重置所有状态
                setMessage('');
                setError('');
                setAudioUrl(null);
                setAudioBlob(null);
                setRecordingTime(0);
                setPlaybackTime(0);
                
                // 清除之前的分析结果缓存
                sessionStorage.removeItem('analysisResult');
                sessionStorage.removeItem('analyzedAudioUrl');
                
                // 重新加载音频设备列表
                await loadAudioDevices();
                
                console.log('重置录音状态，请选择设备开始新的录音');
              }}>
                重新录音
              </ReRecordButton>
              
              <AnalyzeButton onClick={analyzeVoice}>
                分析声音
              </AnalyzeButton>
            </ButtonsContainer>
          )}
          
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </RecordingContainer>
      </Content>
    </Container>
  );
};

export default RecordPage; 