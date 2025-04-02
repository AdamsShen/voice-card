import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';

// 修改样式组件
const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
  align-items: center;
  justify-content: center;
`;

const Content = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 15px; // 减小内边距
`;

const LoginBox = styled.div`
  background-color: white;
  border-radius: 15px;
  padding: 20px; // 减小内边距
  width: 100%;
  max-width: 500px; // 确保在小窗口中不会太宽
`;

const Title = styled.h1`
  color: #F2B705;
  font-size: 28px; // 适当减小字体大小
  text-align: center;
  margin-bottom: 30px;
`;

const Subtitle = styled.p`
  color: #666;
  margin-bottom: 40px;
  font-size: 14px;
`;

const InputContainer = styled.div`
  position: relative;
  margin-bottom: 30px;
`;

const Input = styled.input`
  width: 100%;
  padding: 15px;
  margin-bottom: 30px;
  border: 1px solid #ddd;
  border-radius: 10px;
  font-size: 18px;
  outline: none;
  transition: border-color 0.3s;
  box-sizing: border-box;

  &:focus {
    border-color: #D4A017;
  }
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 15px;
  top: 15px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  
  &:hover {
    color: #D4A017;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 15px;
  background-color: #D4A017; /* 金黄色 */
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 22px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #C19010;
  }

  &:disabled {
    background-color: #E5C158;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: #DC3545;
  margin-top: 15px;
  font-size: 14px;
`;

const SuccessMessage = styled.p`
  color: #28A745;
  margin-top: 15px;
  font-size: 14px;
`;

const MarkerContainer = styled.div`
  position: absolute;
  width: 60px;
  height: 60px;
  background-color: #1E90FF; /* 蓝色 */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  font-weight: bold;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
  
  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-top: 15px solid #1E90FF;
  }
`;

const TitleMarker = styled(MarkerContainer)`
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
`;

const InputMarker = styled(MarkerContainer)`
  top: 50%;
  left: -30px;
  transform: translateY(-50%);
`;

/**
 * 登录页面组件
 */
const LoginPage = () => {
  const [cardKey, setCardKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  console.log(navigate);

  // 处理卡密输入变化
  const handleCardKeyChange = (e) => {
    setCardKey(e.target.value);
    setError('');
  };

  // 切换密码显示/隐藏
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // 处理登录
  const handleLogin = async () => {
    if (!cardKey) {
      setError('请输入卡密');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('verify-card-key', cardKey);

      if (result.valid) {
        console.log('卡密验证成功，准备跳转到录音页面');
        setSuccess('卡密验证成功，正在进入录音页面');
        console.log(navigate);
        setTimeout(() => {
          navigate('/record');
        }, 1500);
      } else {
        setError('无效的卡密，请重试');
      }
    } catch (error) {
      console.error('验证卡密时出错:', error);
      setError('验证卡密时出错，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理回车键登录
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <Container>
      <LoginBox>
        <Title>ONE声音鉴定(独家版权)</Title>
        <Subtitle>欢迎使用，请先输入登录卡密</Subtitle>
        
        <InputContainer>
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="输入您的卡密"
            value={cardKey}
            onChange={handleCardKeyChange}
            onKeyPress={handleKeyPress}
            maxLength={24}
            disabled={loading}
          />
          <PasswordToggle 
            type="button" 
            onClick={togglePasswordVisibility}
            title={showPassword ? "隐藏密码" : "显示密码"}
          >
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </PasswordToggle>
        </InputContainer>
        
        <Button onClick={handleLogin} disabled={loading}>
          {loading ? '验证中...' : '登录'}
        </Button>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}
      </LoginBox>
    </Container>
  );
};

export default LoginPage; 