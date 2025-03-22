import React, { useEffect } from 'react';
import styled from '@emotion/styled';

// 自定义弹框组件样式
const CustomAlertOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease-out;
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const CustomAlertBox = styled.div`
  background-color: white;
  border-radius: 15px;
  padding: 20px;
  width: 85%;
  max-width: 320px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: slideUp 0.3s ease-out;
  
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const AlertIcon = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: ${props => {
    if (props.type === 'success') return '#34A853';
    if (props.type === 'error') return '#EA4335';
    if (props.type === 'warning') return '#FBBC05';
    return '#4285F4'; // info
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  color: white;
  font-size: 24px;
`;

const AlertTitle = styled.h3`
  color: #333;
  font-size: 18px;
  margin: 0 0 10px 0;
  text-align: center;
`;

const AlertMessage = styled.p`
  color: #666;
  font-size: 14px;
  margin: 0 0 20px 0;
  text-align: center;
  word-break: break-word;
`;

const AlertButton = styled.button`
  padding: 10px 20px;
  background-color: ${props => {
    if (props.type === 'success') return '#34A853';
    if (props.type === 'error') return '#EA4335';
    if (props.type === 'warning') return '#FBBC05';
    return '#4285F4'; // info
  }};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => {
      if (props.type === 'success') return '#2E8B57';
      if (props.type === 'error') return '#D32F2F';
      if (props.type === 'warning') return '#E0A800';
      return '#3367D6'; // info
    }};
  }
`;

/**
 * 自定义弹框组件
 * @param {string} type - 弹框类型: 'success', 'error', 'warning', 'info'
 * @param {string} title - 弹框标题
 * @param {string} message - 弹框消息
 * @param {function} onClose - 关闭弹框的回调函数
 */
const CustomAlert = ({ type = 'info', title, message, onClose }) => {
  // 按ESC键关闭弹框
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  // 根据类型返回图标
  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '!';
      default:
        return 'i';
    }
  };
  
  return (
    <CustomAlertOverlay onClick={onClose}>
      <CustomAlertBox onClick={e => e.stopPropagation()}>
        <AlertIcon type={type}>
          {getIcon()}
        </AlertIcon>
        <AlertTitle>{title}</AlertTitle>
        <AlertMessage>{message}</AlertMessage>
        <AlertButton type={type} onClick={onClose}>
          确定
        </AlertButton>
      </CustomAlertBox>
    </CustomAlertOverlay>
  );
};

export default CustomAlert;