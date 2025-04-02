import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import LogoutButton from '../components/LogoutButton';
import CustomAlert from '../components/CustomAlert';
import useAlert from '../hooks/useAlert';

// 样式 - 调整为更紧凑的布局
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
  padding: 10px;
  padding-bottom: 70px; // 为固定按钮留出空间
  overflow-y: auto;
`;

const CardContainer = styled.div`
  background-color: white;
  border-radius: 15px; // 减小圆角
  padding: 15px; // 减小padding
  width: 100%;
  max-width: 600px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
  border: 2px solid #AA80AD;
`;

const CardTitle = styled.h2`
  color: #F2B705;
  font-size: 22px; // 减小字体
  text-align: center;
  margin-bottom: 10px; // 减小margin
`;

const SectionTitle = styled.h3`
  color: #F2B705;
  font-size: 18px; // 减小字体
  text-align: center;
  margin: 15px 0 10px; // 减小margin
`;

const AnalysisResultBox = styled.div`
  background-color: #FFF9C4;
  border-radius: 8px; // 减小圆角
  padding: 12px; // 减小padding
  margin-bottom: 15px; // 减小margin
`;

const ResultRow = styled.div`
  display: flex;
  margin-bottom: 8px; // 减小margin
  align-items: center;
`;

const ResultLabel = styled.div`
  width: 80px; // 减小宽度
  font-weight: bold;
  color: #333;
  font-size: 14px; // 减小字体
`;

const ResultValue = styled.div`
  flex: 1;
  color: #333;
  font-size: 14px; // 减小字体
`;

const InputField = styled.input`
  width: 100%;
  padding: 10px; // 减小padding
  border: 2px solid #F2B705;
  border-radius: 8px; // 减小圆角
  font-size: 14px; // 减小字体
  margin-bottom: 12px; // 减小margin
  
  &::placeholder {
    color: #aaa;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 5px rgba(242, 183, 5, 0.3);
  }
`;

const TextareaField = styled.textarea`
  width: 100%;
  padding: 10px; // 减小padding
  border: 2px solid #F2B705;
  border-radius: 8px; // 减小圆角
  font-size: 14px; // 减小字体
  margin-bottom: 12px; // 减小margin
  resize: none;
  min-height: 80px; // 减小高度
  
  &::placeholder {
    color: #aaa;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 5px rgba(242, 183, 5, 0.3);
  }
`;

const BackgroundSection = styled.div`
  margin-bottom: 15px; // 减小margin
  width: 100%;
`;

const BackgroundLabel = styled.div`
  font-size: 14px; // 减小字体
  color: #666;
  margin-bottom: 5px; // 减小margin
`;

const BackgroundGrid = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 10px; // 减小gap
  padding: 5px 0; // 减小padding
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  
  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    height: 6px; // 减小高度
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px; // 减小圆角
  }
  
  &::-webkit-scrollbar-thumb {
    background: #AA80AD;
    border-radius: 3px; // 减小圆角
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #9370DB;
  }
  
  /* 移除滑动指示 */
  position: relative;
`;

const BackgroundItem = styled.div`
  min-width: 90px; // 减小宽度
  height: 120px; // 减小高度
  border-radius: 8px; // 减小圆角
  overflow: hidden;
  cursor: pointer;
  border: 2px solid ${props => props.selected ? '#F2B705' : 'transparent'};
  transition: transform 0.2s, border-color 0.2s;
  position: relative;
  
  &:hover {
    border-color: #F2B705;
    transform: translateY(-3px); // 减小变换
  }
`;

const BackgroundImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const UploadButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px; // 减小padding
  background-color: #EEEEEE;
  color: #8A2BE2;
  border: none;
  border-radius: 8px; // 减小圆角
  font-size: 14px; // 减小字体
  font-weight: bold;
  cursor: pointer;
  margin-bottom: 12px; // 减小margin
  
  &:hover {
    background-color: #E0E0E0;
  }
`;

const UploadIcon = styled.span`
  color: #8A2BE2;
  font-size: 18px; // 减小字体
  margin-right: 8px; // 减小margin
`;

// 修改 ButtonsContainer 样式，使其固定在底部
const ButtonsContainer = styled.div`
  display: flex;
  gap: 10px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #f5f5f5;
  padding: 10px 15px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
  justify-content: center;
`;

// 修改按钮样式，使两个按钮大小一致
const GenerateButton = styled.button`
  flex: 1;
  max-width: 300px; // 限制最大宽度
  padding: 12px 15px;
  background-color: #F2B705;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  
  &:hover {
    background-color: #E0A800;
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const ReRecordButton = styled.button`
  flex: 1;
  max-width: 300px; // 限制最大宽度
  padding: 12px 15px;
  background-color: #666;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  
  &:hover {
    background-color: #555;
  }
`;

// 添加滚动控制按钮样式
const ScrollControls = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px; // 减小gap
  margin-top: 3px; // 减小margin
`;

const ScrollButton = styled.button`
  background-color: #AA80AD;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px; // 减小尺寸
  height: 24px; // 减小尺寸
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 12px; // 减小字体
  
  &:hover {
    background-color: #9370DB;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

// 添加右键菜单样式
const ContextMenu = styled.div`
  position: fixed;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  padding: 3px 0; // 减小padding
  z-index: 1000;
`;

const ContextMenuItem = styled.div`
  padding: 6px 12px; // 减小padding
  cursor: pointer;
  font-size: 12px; // 减小字体
  color: #333;
  
  &:hover {
    background-color: #f5f5f5;
  }
`;

const DefaultBadge = styled.div`
  position: absolute;
  top: 3px; // 减小位置
  right: 3px; // 减小位置
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 10px; // 减小字体
  padding: 1px 4px; // 减小padding
  border-radius: 3px; // 减小圆角
  z-index: 10;
  pointer-events: none;
`;

/**
 * 声鉴卡制作页面组件
 */
const CardMakerPage = () => {
  const navigate = useNavigate();
  const { alertInfo, showAlert, closeAlert, error, success } = useAlert();
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');
  const [comment, setComment] = useState('');
  const [backgrounds, setBackgrounds] = useState([]);
  const [selectedBackground, setSelectedBackground] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 添加右键菜单状态
  const [contextMenu, setContextMenu] = useState(null);
  const [rightClickedBackground, setRightClickedBackground] = useState(null);
  
  const fileInputRef = useRef(null);
  
  // 添加一个状态来跟踪背景图片容器的滚动位置
  const [isScrollEnd, setIsScrollEnd] = useState(false);
  const [isScrollStart, setIsScrollStart] = useState(true);
  const backgroundGridRef = useRef(null);
  
  // 监听滚动事件
  const handleScroll = () => {
    if (backgroundGridRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = backgroundGridRef.current;
      // 更新滚动位置状态
      setIsScrollStart(scrollLeft <= 10);
      setIsScrollEnd(scrollLeft + clientWidth >= scrollWidth - 20);
    }
  };
  
  // 加载分析结果和背景图
  useEffect(() => {
    // 从sessionStorage获取分析结果
    const resultJson = sessionStorage.getItem('analysisResult');
    if (resultJson) {
      const result = JSON.parse(resultJson);
      setAnalysisResult(result);
      // 使用用户在录音页面选择的性别
      const selectedGender = sessionStorage.getItem('selectedGender') || 'male';
      setGender(selectedGender);
    } else {
      // 分析结果为空
      setAnalysisResult(null);
      setGender('male');
    }
    
    // 加载背景图
    loadBackgrounds();
  }, []);
  
  // 加载背景图
  const loadBackgrounds = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const backgrounds = await ipcRenderer.invoke('get-backgrounds');
      
      // 添加默认背景 - 使用项目中的图片
      const defaultBackgrounds = [
        {
          id: 'default-1',
          data: '../icon/default.png', // 更改为指定的图片路径
          isDefault: true
        }
      ];
      
      setBackgrounds([...defaultBackgrounds, ...backgrounds]);
      
      // 默认选择第一个背景
      if (defaultBackgrounds.length > 0) {
        setSelectedBackground(defaultBackgrounds[0]);
      }
    } catch (error) {
      console.error('加载背景图时出错:', error);
    }
  };
  
  // 处理上传背景图
  const handleUploadBackground = () => {
    fileInputRef.current.click();
  };
  
  // 处理文件选择
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // 读取文件为DataURL
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target.result;
        
        // 保存背景图
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('save-background', imageData);
        
        if (result.success) {
          // 重新加载背景图
          loadBackgrounds();
        } else {
          error(result.message || '上传背景图失败');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('上传背景图时出错:', error);
      error('上传背景图时出错');
    }
    
    // 清空文件输入，以便可以再次选择同一文件
    e.target.value = null;
  };
  
  // 处理选择背景图
  const handleSelectBackground = (background) => {
    setSelectedBackground(background);
  };
  
  // 生成声鉴卡
  const generateCard = () => {
    setIsGenerating(true);
    
    // 模拟生成过程
    setTimeout(() => {
      // 保存声鉴卡信息到sessionStorage
      const cardData = {
        nickname,
        gender,
        comment,
        backgroundId: selectedBackground?.id,
        analysisResult
      };
      console.log(JSON.stringify(cardData));
      sessionStorage.setItem('cardData', JSON.stringify(cardData));
      
      // 导航到声鉴卡展示页面
      navigate('/card-display');
      
      setIsGenerating(false);
    }, 1000);
  };
  
  // 重新录音
  const reRecord = () => {
    navigate('/record');
  };
  
  // 添加滚动控制函数
  const scrollLeft = () => {
    if (backgroundGridRef.current) {
      backgroundGridRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };
  
  const scrollRight = () => {
    if (backgroundGridRef.current) {
      backgroundGridRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };
  
  // 在组件挂载后初始化滚动状态
  useEffect(() => {
    if (backgroundGridRef.current) {
      handleScroll();
    }
  }, [backgrounds]); // 当背景图片列表变化时重新检查
  
  // 处理右键点击背景图
  const handleContextMenu = (e, background) => {
    e.preventDefault();
    
    // 如果是默认背景，不显示右键菜单
    if (background.isDefault) return;
    
    setRightClickedBackground(background);
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
  };
  
  // 关闭右键菜单
  const closeContextMenu = () => {
    setContextMenu(null);
    setRightClickedBackground(null);
  };
  
  // 删除背景图
  const deleteBackground = async () => {
    if (!rightClickedBackground || rightClickedBackground.isDefault) return;
    
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('delete-background', rightClickedBackground.id);
      
      if (result.success) {
        // 如果删除的是当前选中的背景，重置选中状态
        if (selectedBackground && selectedBackground.id === rightClickedBackground.id) {
          // 选择第一个可用的背景
          const firstAvailable = backgrounds.find(bg => bg.id !== rightClickedBackground.id);
          setSelectedBackground(firstAvailable || null);
        }
        
        // 重新加载背景图
        loadBackgrounds();
      } else {
        error(result.message || '删除背景图失败');
      }
    } catch (error) {
      console.error('删除背景图时出错:', error);
      error('删除背景图时出错');
    }
    
    // 关闭右键菜单
    closeContextMenu();
  };
  
  // 点击页面任意位置关闭右键菜单
  useEffect(() => {
    const handleClickOutside = () => {
      closeContextMenu();
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  
  return (
    <Container>
      <Header>
        <Title>制作声鉴卡</Title>
        
        <LogoutButtonWrapper>
          <LogoutButton />
        </LogoutButtonWrapper>
      </Header>
      
      <Content>
        <CardContainer>
          <CardTitle>ONE声音鉴定(独家版权)</CardTitle>
          
          {analysisResult ? (
            <>
              <SectionTitle>声音分析结果</SectionTitle>
              
              <AnalysisResultBox>
                <ResultRow>
                  <ResultLabel>性别</ResultLabel>
                  <ResultValue>
                    {gender === 'female' ? '女生 ♀' : '男生 ♂'}
                  </ResultValue>
                </ResultRow>
                
                <ResultRow>
                  <ResultLabel>主音色</ResultLabel>
                  <ResultValue>{analysisResult?.mainVoice?.type} {analysisResult?.mainVoice?.percentage}%</ResultValue>
                </ResultRow>
                
                {analysisResult?.secondaryVoices?.map((voice, index) => (
                  <ResultRow key={index}>
                    <ResultLabel>{index === 0 ? '辅音色' : ''}</ResultLabel>
                    <ResultValue>{voice.type} {voice.percentage}%</ResultValue>
                  </ResultRow>
                ))}
                
                <ResultRow>
                  <ResultLabel>最佳匹配</ResultLabel>
                  <ResultValue style={{ color: '#FF6B8B', fontWeight: 'bold' }}>{analysisResult?.matchedVoice}</ResultValue>
                </ResultRow>
              </AnalysisResultBox>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px', color: '#666' }}>
              <p>请先完成声音分析</p>
            </div>
          )}
          
          <SectionTitle>制作声鉴卡</SectionTitle>
          
          <InputField 
            placeholder="输入昵称" 
            value={nickname} 
            onChange={(e) => setNickname(e.target.value)}
            maxLength={15}
          />
          
          <TextareaField 
            placeholder="输入声音评价" 
            value={comment} 
            onChange={(e) => setComment(e.target.value)}
            maxLength={50}
          />
          
          <BackgroundSection>
            <BackgroundLabel>选择背景图 (推荐 720 × 1280 px)</BackgroundLabel>
            <BackgroundGrid 
              ref={backgroundGridRef}
              onScroll={handleScroll}
            >
              {backgrounds.map((bg) => (
                <BackgroundItem
                  key={bg.id}
                  selected={selectedBackground && selectedBackground.id === bg.id}
                  onClick={() => handleSelectBackground(bg)}
                  onContextMenu={(e) => handleContextMenu(e, bg)}
                >
                  <BackgroundImage src={bg.data} alt="背景图" />
                  {bg.isDefault && (
                    <DefaultBadge>默认</DefaultBadge>
                  )}
                </BackgroundItem>
              ))}
            </BackgroundGrid>
            
            {backgrounds.length > 5 && (
              <ScrollControls>
                <ScrollButton onClick={scrollLeft} disabled={isScrollStart}>
                  ←
                </ScrollButton>
                <ScrollButton onClick={scrollRight} disabled={isScrollEnd}>
                  →
                </ScrollButton>
              </ScrollControls>
            )}
            
            <UploadButton onClick={handleUploadBackground}>
              <UploadIcon>↑</UploadIcon>
              上传背景图 (最多5张)
            </UploadButton>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileChange}
            />
          </BackgroundSection>
        </CardContainer>
      </Content>
      
      {/* 固定在底部的按钮 */}
      <ButtonsContainer>
        <GenerateButton 
          onClick={generateCard}
          disabled={isGenerating || !nickname || !selectedBackground || !analysisResult}
        >
          {isGenerating ? '生成中...' : '生成声鉴卡'}
        </GenerateButton>
        
        <ReRecordButton onClick={reRecord}>
          重新录音
        </ReRecordButton>
      </ButtonsContainer>
      
      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu style={{ top: contextMenu.y, left: contextMenu.x }}>
          <ContextMenuItem onClick={deleteBackground}>
            删除背景图
          </ContextMenuItem>
        </ContextMenu>
      )}
      {/* 添加自定义弹框 */}
      {alertInfo.show && (
        <CustomAlert
          type={alertInfo.type}
          title={alertInfo.title}
          message={alertInfo.message}
          onClose={closeAlert}
        />
      )}
    </Container>
  );
};

export default CardMakerPage;