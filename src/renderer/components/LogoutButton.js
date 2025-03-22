import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';

const StyledButton = styled.button`
  background-color: transparent;
  color: white;
  border: 1px solid white;
  border-radius: 5px;
  padding: 8px 15px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

/**
 * 通用登出按钮组件
 */
const LogoutButton = ({ onLogout }) => {
  const navigate = useNavigate();
  // 处理登出
  const handleLogout = async () => {
    try {
      // 如果提供了onLogout回调，先执行它
      if (typeof onLogout === 'function') {
        onLogout();
      }

      const { ipcRenderer } = window.require('electron');
      // 清除激活信息
      await ipcRenderer.invoke('clear-activation');
      // 跳转到登录页面
      navigate('/login');
    } catch (error) {
      console.error('登出时出错:', error);
      // 即使出错也尝试跳转到登录页面
      navigate('/login');
    }
  };

  return (
    <StyledButton onClick={handleLogout}>
      登出
    </StyledButton>
  );
};

export default LogoutButton; 