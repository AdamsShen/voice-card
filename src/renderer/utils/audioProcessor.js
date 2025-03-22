/**
 * 音频处理工具
 * 用于录制、分析声音
 */

// 模拟音色类型
const VOICE_TYPES = {
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

/**
 * 获取对应性别的音色类型
 * @param {string} gender - 性别
 * @returns {Object} - 对应性别的音色类型
 */
const getOppositeGenderVoiceTypes = (gender) => {
  return gender === 'female' ? VOICE_TYPES.male : VOICE_TYPES.female;
};

/**
 * 获取主音色对应的子类型列表
 * @param {string} gender - 性别
 * @param {string} mainVoice - 主音色
 * @returns {Array} - 主音色对应的子类型列表
 */
const getSubtypesForMainVoice = (gender, mainVoice) => {
  return VOICE_TYPES[gender][mainVoice] || ['一般音色'];
};

/**
 * 随机选择一个主音色
 * @param {string} gender - 性别
 * @returns {string} - 随机选择的主音色
 */
const getRandomMainVoice = (gender) => {
  const mainVoiceTypes = Object.keys(VOICE_TYPES[gender]);
  const mainVoiceIndex = Math.floor(Math.random() * mainVoiceTypes.length);
  return mainVoiceTypes[mainVoiceIndex];
};

/**
 * 随机选择一个子音色
 * @param {string} gender - 性别
 * @param {string} mainVoice - 主音色
 * @returns {string} - 随机选择的子音色
 */
const getRandomSubtype = (gender, mainVoice) => {
  const subtypes = getSubtypesForMainVoice(gender, mainVoice);
  
  // 如果子类型只有一个，且是"一般XX音"，直接返回父类型
  if (subtypes.length === 1) {
    return mainVoice;
  }
  
  const subtypeIndex = Math.floor(Math.random() * subtypes.length);
  return subtypes[subtypeIndex];
};

/**
 * 录制音频
 * @param {Function} onDataAvailable - 数据可用时的回调
 * @param {Function} onStop - 录制停止时的回调
 * @returns {Object} - 录制控制器
 */
export const recordAudio = (onDataAvailable, onStop) => {
  let mediaRecorder;
  let audioChunks = [];
  
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
        if (onDataAvailable) onDataAvailable(event.data);
      });
      
      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop());
        
        if (onStop) onStop(audioBlob, audioUrl);
      });
      
      audioChunks = [];
      mediaRecorder.start();
      
      return true;
    } catch (error) {
      console.error('录音失败:', error);
      return false;
    }
  };
  
  const stop = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      return true;
    }
    return false;
  };
  
  return { start, stop };
};

/**
 * 将Blob保存为临时文件
 * @param {Blob} blob - 音频Blob数据
 * @returns {Promise<string>} - 临时文件路径
 */
const saveBlobToTempFile = async (blob) => {
  try {
    const { ipcRenderer } = window.require('electron');
    
    // 确保音频格式是WAV格式
    let audioBlob = blob;
    if (blob.type !== 'audio/wav') {
      console.log('转换音频格式为WAV...', blob.type);
      // 创建一个AudioContext来转换音频格式
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await blob.arrayBuffer();
      
      console.log('解码音频数据...');
      try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // 创建一个离线AudioContext来导出WAV
        const offlineContext = new OfflineAudioContext(
          audioBuffer.numberOfChannels,
          audioBuffer.length,
          audioBuffer.sampleRate
        );
        
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start(0);
        
        console.log('渲染音频...');
        const renderedBuffer = await offlineContext.startRendering();
        
        // 将AudioBuffer转换为WAV格式
        console.log('转换为WAV格式...');
        const wavBlob = audioBufferToWav(renderedBuffer);
        audioBlob = new Blob([wavBlob], { type: 'audio/wav' });
        console.log('WAV转换完成，大小:', audioBlob.size);
      } catch (decodeError) {
        console.error('解码音频失败，尝试直接保存原始数据:', decodeError);
        // 如果解码失败，尝试直接保存原始数据
        audioBlob = blob;
      }
    }
    
    console.log('准备保存音频文件，大小:', audioBlob.size);
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 检查buffer是否为空
    if (buffer.length === 0) {
      throw new Error('音频数据为空');
    }
    
    console.log('发送保存请求到主进程...');
    const tempFilePath = await ipcRenderer.invoke('save-temp-audio', buffer);
    console.log('音频文件已保存:', tempFilePath);
    return tempFilePath;
  } catch (error) {
    console.error('保存临时音频文件时出错:', error);
    throw error;
  }
};

/**
 * 将AudioBuffer转换为WAV格式
 * @param {AudioBuffer} buffer - 音频缓冲区
 * @returns {ArrayBuffer} - WAV格式的ArrayBuffer
 */
function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2;
  const sampleRate = buffer.sampleRate;
  
  console.log('WAV转换参数:', {
    通道数: numOfChan,
    采样率: sampleRate,
    长度: buffer.length,
    总字节: length
  });
  
  // 创建WAV文件头
  const dataView = new DataView(new ArrayBuffer(44 + length));
  
  // RIFF标识
  writeString(dataView, 0, 'RIFF');
  // 文件长度
  dataView.setUint32(4, 36 + length, true);
  // WAVE标识
  writeString(dataView, 8, 'WAVE');
  // fmt子块
  writeString(dataView, 12, 'fmt ');
  // 子块1大小
  dataView.setUint32(16, 16, true);
  // 音频格式 (1为PCM)
  dataView.setUint16(20, 1, true);
  // 通道数
  dataView.setUint16(22, numOfChan, true);
  // 采样率
  dataView.setUint32(24, sampleRate, true);
  // 字节率 (采样率 * 通道数 * 每样本字节数)
  dataView.setUint32(28, sampleRate * numOfChan * 2, true);
  // 块对齐 (通道数 * 每样本字节数)
  dataView.setUint16(32, numOfChan * 2, true);
  // 每样本位数
  dataView.setUint16(34, 16, true);
  // data子块
  writeString(dataView, 36, 'data');
  // 数据长度
  dataView.setUint32(40, length, true);
  
  // 写入PCM数据
  let offset = 44;
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    const channelData = buffer.getChannelData(i);
    for (let j = 0; j < channelData.length; j++) {
      // 将浮点数转换为16位整数
      const sample = Math.max(-1, Math.min(1, channelData[j]));
      const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      dataView.setInt16(offset, value, true);
      offset += 2;
    }
  }
  
  console.log('WAV文件头创建完成，总大小:', dataView.buffer.byteLength);
  return dataView.buffer;
}

/**
 * 在DataView中写入字符串
 * @param {DataView} view - DataView对象
 * @param {number} offset - 偏移量
 * @param {string} string - 要写入的字符串
 */
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * 使用Python分析器分析声音
 * @param {string} audioFilePath - 音频文件路径
 * @returns {Promise<Object>} - 分析结果
 */
const analyzeSoundWithPython = async (audioFilePath) => {
  const { ipcRenderer } = window.require('electron');
  const result = await ipcRenderer.invoke('analyze-voice', audioFilePath);
  return result;
};

/**
 * 生成模拟分析结果
 * @returns {Object} - 模拟的声音分析结果
 */
const generateMockAnalysisResult = () => {
  console.log('开始生成模拟分析结果...');
  
  // 从sessionStorage获取选择的性别，而不是随机生成
  const gender = sessionStorage.getItem('selectedGender') || 'male';
  const genderText = gender === 'female' ? '女' : '男';
  console.log(`使用性别: ${gender} (${genderText})`);
  
  // 随机选择主音色
  const mainVoice = getRandomMainVoice(gender);
  console.log(`随机选择的主音色: ${mainVoice}`);
  
  // 主音色只使用父类型（三个字的）
  const mainPercentage = Math.floor(Math.random() * 30) + 50; // 50-80%
  console.log(`主音色百分比计算: Math.floor(Math.random() * 30) + 50 = ${mainPercentage}%`);
  
  // 生成辅音色（1-3个）
  const secondaryVoices = [];
  const secondaryCount = Math.floor(Math.random() * 3) + 1;
  console.log(`随机生成 ${secondaryCount} 个辅音色`);
  
  let remainingPercentage = 100 - mainPercentage;
  console.log(`剩余百分比: 100 - ${mainPercentage} = ${remainingPercentage}%`);
  
  // 已使用的音色
  const usedMainVoices = [mainVoice];
  
  for (let i = 0; i < secondaryCount; i++) {
    // 找一个未使用的音色
    let secondaryMainVoice;
    do {
      secondaryMainVoice = getRandomMainVoice(gender);
    } while (usedMainVoices.includes(secondaryMainVoice));
    
    usedMainVoices.push(secondaryMainVoice);
    console.log(`辅音色 ${i+1} 选择的主类型: ${secondaryMainVoice}`);
    
    // 为辅音色选择一个子类型（字数较多的）
    let secondarySubtype = getRandomSubtype(gender, secondaryMainVoice);
    console.log(`辅音色 ${i+1} 选择的子类型: ${secondarySubtype}`);
    
    // 如果辅音色子类型是"一般XX音"，重新选择一个非"一般"的子类型
    if (secondarySubtype && secondarySubtype.startsWith('一般')) {
      const subtypes = VOICE_TYPES[gender][secondaryMainVoice].filter(type => !type.startsWith('一般'));
      if (subtypes.length > 0) {
        secondarySubtype = subtypes[Math.floor(Math.random() * subtypes.length)];
        console.log(`辅音色 ${i+1} 重新选择的非"一般"子类型: ${secondarySubtype}`);
      } else {
        // 如果没有非"一般"的子类型，跳过这个辅音色
        console.log(`辅音色 ${i+1} 没有非"一般"的子类型，跳过`);
        continue;
      }
    }
    
    // 计算这个辅音色的百分比
    let percentage;
    if (i === secondaryCount - 1) {
      // 最后一个辅音色使用所有剩余百分比
      percentage = remainingPercentage;
      console.log(`辅音色 ${i+1} 是最后一个，使用所有剩余百分比: ${percentage}%`);
    } else {
      // 其他辅音色随机分配，但确保至少有1%
      const maxAllocation = remainingPercentage * 0.7;
      percentage = Math.max(1, Math.floor(Math.random() * maxAllocation));
      console.log(`辅音色 ${i+1} 百分比计算: Math.max(1, Math.floor(Math.random() * ${maxAllocation})) = ${percentage}%`);
    }
    
    if (percentage >= 1) { // 只添加占比>=1%的辅音色
      secondaryVoices.push({
        type: secondarySubtype, // 使用子类型作为辅音色类型
        mainType: secondaryMainVoice, // 保存主类型以便参考
        percentage
      });
      console.log(`辅音色 ${i+1} 百分比 >= 1%，添加到结果: ${secondarySubtype} (${percentage}%)`);
      
      remainingPercentage -= percentage;
      console.log(`更新剩余百分比: ${remainingPercentage + percentage} - ${percentage} = ${remainingPercentage}%`);
    } else {
      console.log(`辅音色 ${i+1} 百分比 < 1%，不添加到结果`);
    }
    
    if (remainingPercentage < 1) {
      console.log(`剩余百分比 < 1%，停止添加辅音色`);
      break;
    }
  }
  
  // 按百分比降序排序辅音色
  secondaryVoices.sort((a, b) => b.percentage - a.percentage);
  console.log('辅音色按百分比降序排序后:');
  secondaryVoices.forEach((voice, index) => {
    console.log(`  辅音色 ${index+1}: ${voice.type} (${voice.percentage}%)`);
  });
  
  // 为对应性别选择一个匹配音色（只使用主音色，三个字的）
  const oppositeGender = gender === 'female' ? 'male' : 'female';
  const oppositeMainVoice = getRandomMainVoice(oppositeGender);
  console.log(`为 ${oppositeGender} 性别随机选择匹配音色: ${oppositeMainVoice}`);
  
  console.log('生成的模拟分析结果:', {
    gender,
    genderText,
    mainVoice: {
      type: mainVoice, // 只使用主音色（三个字的）
      mainType: mainVoice, // 保存主类型
      percentage: mainPercentage
    },
    secondaryVoices,
    matchedVoice: oppositeMainVoice, // 只使用主音色（三个字的）作为最佳匹配
    isMockData: true
  });
  
  return {
    gender,
    mainVoice: {
      type: mainVoice, // 只使用主音色（三个字的）
      mainType: mainVoice, // 保存主类型
      percentage: mainPercentage
    },
    secondaryVoices,
    matchedVoice: oppositeMainVoice, // 只使用主音色（三个字的）作为最佳匹配
    isMockData: true
  };
};

/**
 * 格式化Python分析结果
 * @param {Object} pythonResult - Python分析结果
 * @returns {Object} - 格式化后的分析结果
 */
const formatPythonResult = (pythonResult) => {
  console.log('开始格式化Python分析结果:', pythonResult);
  
  // 从sessionStorage获取选择的性别
  const selectedGender = sessionStorage.getItem('selectedGender') || 'male';
  const gender = selectedGender; // 使用用户选择的性别
  console.log(`使用用户选择的性别: ${gender}`);
  
  // 处理simple_voice_analyzer.py的输出格式
  // 主音色
  console.log(`处理主音色数据: ID=${pythonResult.main.id}, 名称=${pythonResult.main.name}, 得分=${pythonResult.main.score}`);
  const mainVoice = {
    type: pythonResult.main.name, // 使用name作为类型
    mainType: pythonResult.main.id, // 使用id作为主类型
    percentage: Math.round(pythonResult.main.score) // 使用score作为百分比
  };
  console.log(`主音色百分比计算: Math.round(${pythonResult.main.score}) = ${mainVoice.percentage}%`);
  
  // 辅音色
  let secondaryVoices = [];
  
  // 处理辅音色数组
  if (pythonResult.sub && Array.isArray(pythonResult.sub)) {
    console.log(`处理 ${pythonResult.sub.length} 个辅音色数据:`);
    secondaryVoices = pythonResult.sub.map((voice, index) => {
      console.log(`辅音色 ${index+1}: ID=${voice.id}, 名称=${voice.name}, 得分=${voice.score}`);
      const percentage = Math.round(voice.score);
      console.log(`辅音色 ${index+1} 百分比计算: Math.round(${voice.score}) = ${percentage}%`);
      return {
        type: voice.name, // 使用name作为类型
        mainType: voice.id, // 使用id作为主类型
        percentage // 使用score作为百分比
      };
    });
  } else {
    console.log('没有辅音色数据或数据格式不正确');
  }
  
  // 确保只显示百分比大于等于1%的辅音色，并按百分比降序排序
  const filteredVoices = secondaryVoices.filter(voice => voice.percentage >= 1);
  console.log(`过滤后的辅音色数量: ${filteredVoices.length} (只保留百分比 >= 1% 的辅音色)`);
  
  const sortedVoices = filteredVoices.sort((a, b) => b.percentage - a.percentage);
  console.log('辅音色按百分比降序排序后:');
  sortedVoices.forEach((voice, index) => {
    console.log(`  辅音色 ${index+1}: ${voice.type} (${voice.percentage}%)`);
  });
  
  secondaryVoices = sortedVoices;
  
  // 匹配音色
  let matchedVoice = pythonResult.opposite_match ? pythonResult.opposite_match.name : null;
  console.log(`Python返回的匹配音色: ${matchedVoice || '无'}`);
  
  // 如果没有返回匹配音色，则为对应性别随机选择一个主音色
  if (!matchedVoice) {
    const oppositeGender = gender === 'female' ? 'male' : 'female';
    matchedVoice = getRandomMainVoice(oppositeGender);
    console.log(`未找到匹配音色，为 ${oppositeGender} 性别随机选择: ${matchedVoice}`);
  }
  
  const result = {
    gender,
    mainVoice,
    secondaryVoices,
    matchedVoice,
    isMockData: false
  };
  
  console.log('格式化后的最终结果:', result);
  return result;
};

/**
 * 分析声音
 * @param {Blob} audioBlob - 音频Blob数据
 * @returns {Promise<Object>} - 分析结果
 */
export const analyzeVoice = async (audioBlob) => {
  try {
    console.log('开始分析声音...');
    
    // 检查音频Blob
    if (!audioBlob || audioBlob.size === 0) {
      console.error('音频数据为空');
      throw new Error('音频数据为空');
    }
    
    console.log('音频数据类型:', audioBlob.type, '大小:', audioBlob.size);
    
    // 保存为临时文件
    console.log('保存音频为临时文件...');
    const audioFilePath = await saveBlobToTempFile(audioBlob);
    
    // 从sessionStorage获取选择的性别
    const selectedGender = sessionStorage.getItem('selectedGender');
    // 转换性别格式：male -> 0, female -> 1
    const genderParam = selectedGender === 'female' ? 1 : 0;
    
    // 使用Python分析
    console.log('调用Python分析，性别参数:', genderParam);
    const { ipcRenderer } = window.require('electron');
    const result = await ipcRenderer.invoke('analyze-voice', audioFilePath, genderParam);
    
    // 检查是否有错误
    if (result.error) {
      console.error('Python分析失败:', result.error);
      
      // 记录更详细的错误信息
      if (result.stderr) {
        console.error('Python错误输出:', result.stderr);
      }
      
      if (result.stdout) {
        console.log('Python标准输出:', result.stdout);
        // 尝试解析标准输出，可能包含有效的JSON
        try {
          const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const jsonStr = jsonMatch[0];
            console.log('尝试解析可能的JSON输出:', jsonStr);
            const parsedResult = JSON.parse(jsonStr);
            console.log('成功解析JSON:', parsedResult);
            return formatPythonResult(parsedResult);
          }
        } catch (parseError) {
          console.error('尝试解析标准输出失败:', parseError);
        }
      }
      
      console.log('使用模拟数据...');
      
      // 如果Python分析失败，使用模拟数据
      const mockResult = generateMockAnalysisResult();
      console.log('生成的模拟数据:', mockResult);
      
      // 添加错误信息到结果中
      mockResult.analysisError = result.error;
      mockResult.isMockData = true;
      
      if (result.stderr) {
        mockResult.pythonStderr = result.stderr;
      }
      
      if (result.stdout) {
        mockResult.pythonStdout = result.stdout;
      }
      
      // 如果是缺少库的错误，提供更明确的提示
      if (result.error.includes('缺少Python模块')) {
        mockResult.userMessage = '声音分析需要安装Python库。请参考README中的说明安装librosa库。';
      }
      
      return mockResult;
    }
    
    console.log('Python分析成功:', result);
    
    // 检查结果是否为有效的JSON对象
    if (typeof result !== 'object' || result === null) {
      console.error('Python返回的结果不是有效的对象:', result);
      const mockResult = generateMockAnalysisResult();
      mockResult.analysisError = '分析器返回的结果格式无效';
      mockResult.isMockData = true;
      mockResult.rawResult = result;
      return mockResult;
    }
    
    // 检查结果是否包含必要的字段
    if (!result.main) {
      console.error('Python返回的结果缺少main字段:', result);
      const mockResult = generateMockAnalysisResult();
      mockResult.analysisError = '分析器返回的结果缺少必要字段';
      mockResult.isMockData = true;
      mockResult.rawResult = result;
      return mockResult;
    }
    
    return formatPythonResult(result);
  } catch (error) {
    console.error('分析声音时出错:', error);
    
    // 出错时返回模拟数据
    console.log('出错，使用模拟数据...');
    const mockResult = generateMockAnalysisResult();
    mockResult.analysisError = error.message;
    mockResult.isMockData = true;
    mockResult.userMessage = '声音分析出错，使用了模拟数据。请确保已安装Python和librosa库。';
    
    return mockResult;
  }
}; 