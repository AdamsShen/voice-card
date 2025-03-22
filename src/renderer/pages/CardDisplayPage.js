import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import html2canvas from 'html2canvas';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';

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

const Content = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 15px;
  overflow: hidden; // 防止滚动
`;

// 修改模态框样式，使其适应页面且不需要滚动
const ModalOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 0;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 20px;
  padding: 15px;
  width: 90%;
  max-width: 380px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: auto;
  max-height: 100vh;
  overflow: hidden;
`;

const ModalTitle = styled.h3`
  color: #F2B705;
  font-size: 20px;
  text-align: center;
  margin: 5px 0 8px;
  font-weight: bold;
`;

const CardPreviewContainer = styled.div`
  width: 100%;
  height: auto;
  border-radius: 10px;
  margin: 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const ButtonsRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
  width: 100%;
`;

const ActionButton = styled.button`
  padding: 10px 15px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
`;

const CloseButton = styled(ActionButton)`
  background-color: #666;
  color: white;
  
  &:hover {
    background-color: #555;
  }
`;

const CopyButton = styled(ActionButton)`
  background-color: #4285F4;
  color: white;
  
  &:hover {
    background-color: #3367D6;
  }
`;

const DownloadButton = styled(ActionButton)`
  background-color: #34A853;
  color: white;
  
  &:hover {
    background-color: #2E8B57;
  }
`;

// 声鉴卡样式
const VoiceCard = styled.div`
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 177.78%;
  overflow: hidden;
  background-color: #000;
  border-radius: 10px;
`;

const CardBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url(${props => props.src || ''});
  background-size: cover;
  background-position: center;
  filter: brightness(0.8) contrast(1.1);
`;

const CardOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  margin-top: ${props => props.marginTop || '200px'};
  display: flex;
  flex-direction: column;
  padding: 15px 15px;
  justify-content: space-between;
`;

// 添加卡片内容容器，更好地组织和分配空间
const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
`;

// 调整各部分间距
const CardSection = styled.div`
  margin-bottom: ${props => props.compact ? '25px' : '0'}; // 紧凑型部分使用负边距
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 40%;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(242, 183, 5, 0.5), transparent);
    display: ${props => props.noLine ? 'none' : 'block'};
  }
`;

// 调整标题包装器高度
const SectionTitleWrapper = styled.div`
  position: relative;
  height: 24px; // 减小高度
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  overflow: visible;
`;

// 增大标题字体，使其与内容有明显区别
const SectionTitle = styled.div`
  color: #FFFFFF;
  font-size: 48px; // 增大字体
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
  font-family: MaoKenWangFengYaSong, MaoKenWangFengYaSong;
  letter-spacing: 1px;
  line-height: 1;
  position: absolute;
  white-space: nowrap;
  transform: scale(0.45);
  transform-origin: center center;
  width: 250%;
  margin-bottom: 10px;
  
  &::before, &::after {
    content: '◇';
    margin: 0 6px;
    color: #FFF;
    font-size: 0.5em;
  }
`;

// 调整昵称样式
const CardHolderName = styled.div`
  color: #FFFFFF;
  font-size: 16px;
  text-align: center;
  margin: 2px 0 5px; // 增加底部间距
  text-shadow: 0 0 15px rgba(242, 183, 5, 0.8);
  font-family: 'YOUSHEhaoShenti', serif;
  letter-spacing: 0.5px;
  line-height: 1.1;
`;

// 减小内容字体
const VoiceTypeRow = styled.div`
  color: #FFF;
  font-size: 16px; // 减小字体
  text-align: center;
  margin: 0;
  text-shadow: 0 0 15px rgba(242, 183, 5, 0.8);
  font-family: 'YOUSHEhaoShenti', serif;
  letter-spacing: 0.5px;
  line-height: 1.1;
  margin-top: 3px;
`;

const CommentText = styled.div`
  color: #FFF;
  font-size: 16px;
  text-align: center;
  margin: 0;
  text-shadow: 0 0 15px rgba(242, 183, 5, 0.8);
  padding: 0 10px;
  font-family: 'YOUSHEhaoShenti', serif;
  letter-spacing: 0.5px;
  line-height: 1.2;
`;

// 全局样式
const GlobalStyle = styled.div`
  @font-face {
    font-family: 'YOUSHEhaoShenti';
    src: url('../public/fonts/YOUSHEhaoShenti.ttf') format('truetype');
  }
  
  @font-face {
    font-family: 'MaoKenWangFengYaSong';
    src: url('../public/fonts/MaoKenWangFengYaSong.ttf') format('truetype');
  }
`;

// 添加下拉菜单相关样式
const VoiceTypeContainer = styled.div`
  position: relative;
  width: 100%;
`;

const VoiceTypeDropdownTrigger = styled.div`
  cursor: pointer;
  position: relative;
  width: 100%;
  
  &:hover .dropdown-content {
    display: block;
  }
`;

const DropdownContent = styled.div`
  display: none;
  position: absolute;
  background-color: rgba(0, 0, 0, 0.8);
  min-width: 160px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.5);
  z-index: 1;
  border-radius: 5px;
  left: 50%;
  transform: translateX(-50%);
  top: 100%;
  
  &::-webkit-scrollbar {
    width: 5px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(242, 183, 5, 0.5);
    border-radius: 5px;
  }
`;

const DropdownItem = styled.div`
  color: #FFF;
  padding: 8px 12px;
  text-align: center;
  text-decoration: none;
  display: block;
  font-size: 14px;
  cursor: pointer;
  
  &:hover {
    background-color: rgba(242, 183, 5, 0.2);
  }
  
  &.selected {
    background-color: rgba(242, 183, 5, 0.3);
    font-weight: bold;
  }
`;

/**
 * 声鉴卡展示页面组件
 */
const CardDisplayPage = () => {
  const navigate = useNavigate();
  const { alertInfo, showAlert, closeAlert, error, success } = useAlert();
  const [cardData, setCardData] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState('');
  const cardRef = useRef(null);
  
  // 添加音色选择状态
  const [voiceOptions, setVoiceOptions] = useState({
    female: {},
    male: {}
  });
  
  // 加载声鉴卡数据
  useEffect(() => {
    const cardDataJson = sessionStorage.getItem('cardData');
    if (cardDataJson) {
      const data = JSON.parse(cardDataJson);
      setCardData(data);
      console.log(data);
      // 加载背景图
      loadBackgroundImage(data.backgroundId);
      
      // 加载音色选项
      loadVoiceOptions();
    } else {
      // 如果没有数据，返回到制作页面
      navigate('/card-maker');
    }
  }, [navigate]);
  
  // 加载音色选项
  const loadVoiceOptions = () => {
    // 如果无法从后端获取，使用硬编码的备用选项
    const fallbackOptions = {
      female: {
        mainVoices: ['萝莉音', '少萝音', '少女音', '少御音', '软妹音', '御姐音', '御妈音', '女王音'],
        subVoices: {
          '萝莉音': ['娇俏傲娇学妹音', '元气美少女音', '清甜温婉音'],
          '少萝音': ['软甜娇嗔可爱音', '奶声奶气幼齿音', '阳光元气小可爱音', '草莓泡芙小天使音'],
          '少女音': ['娇俏可爱学妹音', '可爱小家碧玉音', '山间黄鹂吟鸣音', '天真小迷糊音', '娇声细语音'],
          '少御音': ['傲娇甜美酥麻音', '温柔女神音', '温婉柔弱黛玉音', '吞云吐雾音'],
          '软妹音': ['前桌三好乖乖女', '邻家傲娇青梅音', '清脆婉转小尾音'],
          '御姐音': ['温婉仙气女神音', '清冷少女音', '朦胧迷醉小鼻音', '腼腆羞涩女教师音'],
          '御妈音': ['聪慧娴雅淑女音', '霸气大姐大音', '温柔治愈人妻音', '妇女之友专属闺蜜音'],
          '女王音': ['妖娆性感音', '气息勾魂音', '霸道女总裁音', '销魂迷醉撩人音']
        }
      },
      male: {
        mainVoices: ['正太音', '少年音', '青受音', '青年音', '公子音', '暖男音', '青叔音', '大叔音'],
        subVoices: {
          '正太音': ['可爱拖拉音', '傲娇少年音', '木讷呆萌音', '变声期小鼻音'],
          '少年音': ['阳光爽朗学弟音', '温柔邻家哥哥音', '稚气未脱正太音'],
          '青受音': ['空灵舒服玻璃音', '傲娇正太音', '乖巧气泡音', '慵懒含笑小尾音', '邻家腼腆小男孩音'],
          '青年音': ['干干净净治愈音', '午后红茶音', '潜质男神音', '气质修养绅士音'],
          '公子音': ['风度翩翩皇子音', '意气风发君子音', '贵气闷骚音', '文弱书生音'],
          '暖男音': ['温柔宠溺学长音', '低沉磁性叔音', '微微小电流音'],
          '青叔音': ['醇厚蜀黍音', '慵懒青年音', '忧郁小烟嗓', '磨叽唠叨说教育'],
          '大叔音': ['刚硬老爷儿们音', '久经沙场大将军音', '霸气帝王音', '怪蜀黍音']
        }
      }
    };
    
    try {
      // 从audioProcessor.js中获取VOICE_TYPES
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('get-voice-types').then(voiceTypes => {
        if (voiceTypes) {
          setVoiceOptions(voiceTypes);
        } else {
          // 如果无法从主进程获取，使用硬编码的备用选项
          setVoiceOptions(fallbackOptions);
        }
      }).catch(err => {
        console.error('获取音色类型失败:', err);
        // 使用硬编码的备用选项
        setVoiceOptions(fallbackOptions);
      });
    } catch (error) {
      console.error('加载音色选项时出错:', error);
      // 使用硬编码的备用选项
      setVoiceOptions(fallbackOptions);
    }
  };
  
  // 加载背景图
  const loadBackgroundImage = async (backgroundId) => {
    try {
      if (!backgroundId) return;
      
      const { ipcRenderer } = window.require('electron');
      const backgrounds = await ipcRenderer.invoke('get-backgrounds');
      
      // 查找选中的背景图
      const selectedBg = backgrounds.find(bg => bg.id === backgroundId);
      console.log(selectedBg);
      if (selectedBg) {
        setBackgroundImage(selectedBg.data);
      } else {
        // 如果找不到选中的背景图，使用默认背景
        setBackgroundImage('../icon/default.png');
      }
    } catch (error) {
      console.error('加载背景图时出错:', error);
      // 使用默认背景
      setBackgroundImage('../icon/default.png');
    }
  };
  
  // 关闭模态框
  const handleCloseModal = () => {
    // 关闭模态框后直接返回到制作页面
    navigate('/card-maker');
  };
  
  // 复制图片 - 使用自定义弹框
  const handleCopyImage = async () => {
    try {
      if (!cardRef.current) return;
      
      // 使用html2canvas将卡片转换为图片
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
      });
      
      // 将canvas转换为Blob
      canvas.toBlob(async (blob) => {
        try {
          // 获取数据URL
          const dataUrl = canvas.toDataURL('image/png');
          
          // 使用Electron的clipboard API
          const { ipcRenderer } = window.require('electron');
          await ipcRenderer.invoke('copy-image-to-clipboard', dataUrl);
          
          // 使用自定义弹框替代alert
          showAlert('success', '复制成功', '图片已复制到剪贴板');
        } catch (error) {
          console.error('复制图片时出错:', error);
          // 使用自定义弹框替代alert
          showAlert('error', '复制失败', '复制图片失败，请重试');
        }
      }, 'image/png');
    } catch (error) {
      console.error('生成图片时出错:', error);
      // 使用自定义弹框替代alert
      showAlert('error', '生成失败', '生成图片失败，请重试');
    }
  };
  
  // 下载图片 - 使用自定义弹框
  const handleDownloadImage = async () => {
    try {
      if (!cardRef.current) return;
      
      // 使用html2canvas将卡片转换为图片
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
      });
      
      // 将canvas转换为数据URL
      const dataUrl = canvas.toDataURL('image/png');
      
      // 使用Electron的dialog API保存文件
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('save-voice-card', dataUrl);
      
      if (result.success) {
        // 使用自定义弹框替代alert
        showAlert('success', '保存成功', `图片已保存至: ${result.filePath}`);
      } else {
        // 使用自定义弹框替代alert
        showAlert('error', '保存失败', result.message || '保存图片失败');
      }
    } catch (error) {
      console.error('保存图片时出错:', error);
      // 使用自定义弹框替代alert
      showAlert('error', '保存失败', '保存图片失败，请重试');
    }
  };
  
  // 更新主音色 - 修改为只使用父类型（三个字的）
  const updateMainVoice = (mainType, subType) => {
    if (!cardData || !cardData.analysisResult) return;
    
    const updatedCardData = {
      ...cardData,
      analysisResult: {
        ...cardData.analysisResult,
        mainVoice: {
          ...cardData.analysisResult.mainVoice,
          type: mainType, // 使用父类型（三个字的）
          mainType: mainType
        }
      }
    };
    
    setCardData(updatedCardData);
    sessionStorage.setItem('cardData', JSON.stringify(updatedCardData));
  };
  
  // 更新辅音色
  const updateSecondaryVoice = (index, mainType, subType) => {
    if (!cardData || !cardData.analysisResult || !cardData.analysisResult.secondaryVoices) return;
    
    const updatedSecondaryVoices = [...cardData.analysisResult.secondaryVoices];
    
    if (index >= 0 && index < updatedSecondaryVoices.length) {
      updatedSecondaryVoices[index] = {
        ...updatedSecondaryVoices[index],
        type: subType,
        mainType: mainType
      };
      
      const updatedCardData = {
        ...cardData,
        analysisResult: {
          ...cardData.analysisResult,
          secondaryVoices: updatedSecondaryVoices
        }
      };
      
      setCardData(updatedCardData);
      sessionStorage.setItem('cardData', JSON.stringify(updatedCardData));
    }
  };
  
  // 更新匹配音色
  const updateMatchedVoice = (voiceType) => {
    if (!cardData) return;
    
    const updatedCardData = {
      ...cardData,
      analysisResult: {
        ...cardData.analysisResult,
        matchedVoice: voiceType
      }
    };
    
    setCardData(updatedCardData);
    sessionStorage.setItem('cardData', JSON.stringify(updatedCardData));
  };
  
  // 获取当前性别的音色选项
  const getCurrentGenderVoiceOptions = () => {
    if (!cardData || !cardData.analysisResult) return {};
    const gender = cardData.analysisResult.gender;
    return voiceOptions[gender] || {};
  };
  
  // 获取对应性别的音色选项（用于最佳匹配）
  const getOppositeGenderVoiceOptions = () => {
    if (!cardData || !cardData.analysisResult) return {};
    const gender = cardData.analysisResult.gender;
    const oppositeGender = gender === 'female' ? 'male' : 'female';
    return voiceOptions[oppositeGender] || {};
  };
  
  // 渲染主音色下拉菜单
  const renderMainVoiceDropdown = () => {
    const currentOptions = getCurrentGenderVoiceOptions();
    const mainVoiceType = cardData?.analysisResult?.mainVoice?.type || '';
    const mainVoiceMainType = cardData?.analysisResult?.mainVoice?.mainType || '';
    
    return (
      <VoiceTypeContainer>
        <VoiceTypeDropdownTrigger>
          <VoiceTypeRow>
            {mainVoiceType}－{cardData?.analysisResult?.mainVoice?.percentage}%
          </VoiceTypeRow>
          
          <DropdownContent className="dropdown-content">
            {Object.entries(currentOptions).map(([mainType, subTypes]) => (
              <React.Fragment key={mainType}>
                {/* 主类型作为标题 */}
                <DropdownItem 
                  className={mainType === mainVoiceMainType && mainType === mainVoiceType ? 'selected' : ''}
                  onClick={() => updateMainVoice(mainType, mainType)}
                >
                  {mainType}
                </DropdownItem>
              </React.Fragment>
            ))}
          </DropdownContent>
        </VoiceTypeDropdownTrigger>
      </VoiceTypeContainer>
    );
  };
  
  // 渲染辅音色下拉菜单
  const renderSecondaryVoiceDropdown = (voice, index) => {
    const currentOptions = getCurrentGenderVoiceOptions();
    
    return (
      <VoiceTypeContainer key={index}>
        <VoiceTypeDropdownTrigger>
          <VoiceTypeRow>
            {voice.type}－{voice.percentage}%
          </VoiceTypeRow>
          
          <DropdownContent className="dropdown-content">
            {Object.entries(currentOptions).map(([mainType, subTypes]) => (
              <React.Fragment key={mainType}>                
                {/* 子类型列表 */}
                {subTypes.map(subType => (
                  subType.startsWith('一般') ? null : (
                    <DropdownItem 
                      key={subType}
                      className={subType === voice.type ? 'selected' : ''}
                      onClick={() => updateSecondaryVoice(index, mainType, subType)}
                      style={{ paddingLeft: '20px', fontSize: '13px' }}
                    >
                      {subType}
                    </DropdownItem>
                  )
                ))}
              </React.Fragment>
            ))}
            {/* 添加一个空白元素，确保底部有足够的滚动空间 */}
            <div style={{ height: '65px', visibility: 'hidden' }}></div>
          </DropdownContent>
        </VoiceTypeDropdownTrigger>
      </VoiceTypeContainer>
    );
  };
  
  // 渲染匹配音色下拉菜单
  const renderMatchedVoiceDropdown = () => {
    const oppositeOptions = getOppositeGenderVoiceOptions();
    const matchedVoice = cardData?.analysisResult?.matchedVoice || '';
    
    return (
      <VoiceTypeContainer>
        <VoiceTypeDropdownTrigger>
          <VoiceTypeRow style={{ color: '#FFF' }}>
            {matchedVoice}
          </VoiceTypeRow>
          
          <DropdownContent className="dropdown-content">
            {Object.entries(oppositeOptions).map(([mainType, subTypes]) => (
              <React.Fragment key={mainType}>
                {/* 主类型作为标题 */}
                <DropdownItem 
                  className={mainType === matchedVoice ? 'selected' : ''}
                  onClick={() => updateMatchedVoice(mainType)}
                >
                  {mainType}
                </DropdownItem>
              </React.Fragment>
            ))}
            {/* 添加一个空白元素，确保底部有足够的滚动空间 */}
            <div style={{ height: '110px', visibility: 'hidden' }}></div>
          </DropdownContent>
        </VoiceTypeDropdownTrigger>
      </VoiceTypeContainer>
    );
  };
  
  // 添加一个函数来计算 CardOverlay 的 margin-top
  const calculateOverlayMargin = () => {
    if (!cardData || !cardData.analysisResult || !cardData.analysisResult.secondaryVoices) {
      return '180px'; // 默认值，没有辅音色时
    }
    
    const secondaryVoicesCount = cardData.analysisResult.secondaryVoices.length;
    return '180px';
  };
  
  // 渲染辅音色文本
  const renderSecondaryVoices = () => {
    if (!cardData || !cardData.analysisResult || !cardData.analysisResult.secondaryVoices || cardData.analysisResult.secondaryVoices.length === 0) {
      return (
        <VoiceTypeRow>无</VoiceTypeRow>
      );
    }
    
    // 限制最多显示3个辅音色，防止内容过多
    return cardData.analysisResult.secondaryVoices
      .slice(0, 3)
      .map((voice, index) => renderSecondaryVoiceDropdown(voice, index));
  };
  
  // 处理评价文本，如果太长则截断
  const formatComment = (comment) => {
    if (!comment) return '声音评价';
    if (comment.length > 30) {
      return comment.substring(0, 30) + '...';
    }
    return comment;
  };
  
  if (!cardData) {
    return <div>加载中...</div>;
  }
  
  return (
    <Container>
      <GlobalStyle />
      <Header>
        <Title>声鉴卡展示</Title>
      </Header>
      
      <Content>
        <ModalOverlay>
          <ModalContent>
            <CardPreviewContainer>
              <VoiceCard ref={cardRef}>
                <CardBackground src={backgroundImage} />
                <CardOverlay style={{ marginTop: calculateOverlayMargin() }}>
                  <CardContent>
                    <CardSection compact>
                      <SectionTitleWrapper>
                        <SectionTitle>持卡人</SectionTitle>
                      </SectionTitleWrapper>
                      <CardHolderName>{cardData.nickname || '用户昵称'}</CardHolderName>
                    </CardSection>
                    
                    <CardSection compact>
                      <SectionTitleWrapper>
                        <SectionTitle>主音色</SectionTitle>
                      </SectionTitleWrapper>
                      {renderMainVoiceDropdown()}
                    </CardSection>
                    
                    <CardSection compact>
                      <SectionTitleWrapper>
                        <SectionTitle>辅音色</SectionTitle>
                      </SectionTitleWrapper>
                      {renderSecondaryVoices()}
                    </CardSection>
                    
                    <CardSection compact>
                      <SectionTitleWrapper>
                        <SectionTitle>最佳匹配</SectionTitle>
                      </SectionTitleWrapper>
                      {renderMatchedVoiceDropdown()}
                    </CardSection>
                    
                    <CardSection compact>
                      <SectionTitleWrapper>
                        <SectionTitle>声音评价</SectionTitle>
                      </SectionTitleWrapper>
                      <CommentText>{formatComment(cardData.comment)}</CommentText>
                    </CardSection>
                  </CardContent>
                </CardOverlay>
              </VoiceCard>
            </CardPreviewContainer>
            
            <ButtonsRow>
              <CloseButton onClick={handleCloseModal}>
                关闭窗口
              </CloseButton>
              
              <CopyButton onClick={handleCopyImage}>
                复制图片
              </CopyButton>
              
              <DownloadButton onClick={handleDownloadImage}>
                下载图片
              </DownloadButton>
            </ButtonsRow>
          </ModalContent>
        </ModalOverlay>
        
        {/* 添加自定义弹框 */}
        {alertInfo.show && (
          <CustomAlert
          type={alertInfo.type}
          title={alertInfo.title}
          message={alertInfo.message}
          onClose={closeAlert}
        />
        )}
      </Content>
    </Container>
  );
};

export default CardDisplayPage;