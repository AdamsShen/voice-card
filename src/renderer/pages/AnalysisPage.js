import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { analyzeVoice } from '../utils/audioProcessor';
import LogoutButton from '../components/LogoutButton';

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
  padding: 15px 20px;
  display: flex;
  justify-content: center; // 修改为居中对齐
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  position: relative; // 添加相对定位
`;

const Title = styled.h1`
  margin: 0;
  font-size: 20px;
`;

const LogoutButtonWrapper = styled.div`
  position: absolute; // 使用绝对定位
  right: 15px; // 放在右侧
`;

const Content = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const AnalysisContainer = styled.div`
  background-color: white;
  border-radius: 10px;
  padding: 30px;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 40px 0;
`;

const Spinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #AA80AD;
  width: 40px;
  height: 40px;
  margin: 0 auto 20px;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ResultSection = styled.div`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h2`
  color: #333;
  font-size: 20px;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
`;

const GenderResult = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px 0;
  gap: 30px;
`;

const GenderIcon = styled.div`
  font-size: 48px;
  color: ${props => props.gender === 'female' ? '#FF9700' : '#8888BB'};
`;

const GenderText = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: #333;
`;

const VoiceTypeContainer = styled.div`
  margin-top: 20px;
`;

const VoiceTypeItem = styled.div`
  margin-bottom: 15px;
`;

const VoiceTypeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
`;

const VoiceTypeName = styled.span`
  font-weight: ${props => props.isMain ? 'bold' : 'normal'};
  color: ${props => props.isMain ? '#AA80AD' : '#333'};
  font-size: ${props => props.isMain ? '18px' : '16px'};
`;

const VoiceTypePercentage = styled.span`
  font-weight: ${props => props.isMain ? 'bold' : 'normal'};
  color: ${props => props.isMain ? '#AA80AD' : '#333'};
`;

const ProgressBar = styled.div`
  height: 10px;
  background-color: #f0f0f0;
  border-radius: 5px;
  overflow: hidden;
`;

const Progress = styled.div`
  height: 100%;
  width: ${props => props.percentage}%;
  background-color: ${props => props.isMain ? '#AA80AD' : '#8888BB'};
  border-radius: 5px;
`;

const ButtonsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 30px;
`;

const SecondaryButton = styled.button`
  padding: 12px 25px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #8888BB;
  color: white;
  
  &:hover {
    background-color: #AA80AD;
  }
`;

/**
 * 分析页面组件
 */
const AnalysisPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 处理重新录制
  const handleReRecord = () => {
    navigate('/record');
  };
  
  // 加载并分析录音
  useEffect(() => {
    const analyzeRecording = async () => {
      try {
        // 从sessionStorage获取录音URL
        const audioUrl = sessionStorage.getItem('recordedAudio');
        
        if (!audioUrl) {
          setError('未找到录音数据，请先录制声音');
          setLoading(false);
          return;
        }
        
        // 将URL转换为Blob
        const response = await fetch(audioUrl);
        const audioBlob = await response.blob();
        
        // 分析声音
        const result = await analyzeVoice(audioBlob);
        
        // 存储分析结果到sessionStorage
        sessionStorage.setItem('analysisResult', JSON.stringify(result));
        
        // 分析完成后跳转到制作声鉴卡页面
        navigate('/card-maker');
      } catch (error) {
        console.error('分析声音时出错:', error);
        setError('分析声音时出错，请重试');
        setLoading(false);
      }
    };
    
    analyzeRecording();
  }, [navigate]);
  
  return (
    <Container>
      <Header>
        <Title>声音分析</Title>
        <LogoutButtonWrapper>
          <LogoutButton />
        </LogoutButtonWrapper>
      </Header>
      
      <Content>
        <AnalysisContainer>
          {loading ? (
            <LoadingContainer>
              <Spinner />
              <p>正在分析声音，请稍候...</p>
            </LoadingContainer>
          ) : error ? (
            <div>
              <p style={{ color: '#DC3545', textAlign: 'center' }}>{error}</p>
              <ButtonsContainer>
                <SecondaryButton onClick={handleReRecord}>
                  重新录制
                </SecondaryButton>
              </ButtonsContainer>
            </div>
          ) : null}
        </AnalysisContainer>
      </Content>
    </Container>
  );
};

export default AnalysisPage; 