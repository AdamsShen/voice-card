import { useState } from 'react';

/**
 * 自定义 Hook 用于管理弹框状态
 * @returns {Object} 弹框状态和控制函数
 */
const useAlert = () => {
  const [alertInfo, setAlertInfo] = useState({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });
  
  // 显示弹框
  const showAlert = (type, title, message) => {
    setAlertInfo({
      show: true,
      type,
      title,
      message
    });
  };
  
  // 关闭弹框
  const closeAlert = () => {
    setAlertInfo(prev => ({ ...prev, show: false }));
  };
  
  // 简化的弹框函数
  const alert = (message, title = '提示') => {
    showAlert('info', title, message);
  };
  
  // 成功弹框
  const success = (message, title = '成功') => {
    showAlert('success', title, message);
  };
  
  // 错误弹框
  const error = (message, title = '错误') => {
    showAlert('error', title, message);
  };
  
  // 警告弹框
  const warning = (message, title = '警告') => {
    showAlert('warning', title, message);
  };
  
  return {
    alertInfo,
    showAlert,
    closeAlert,
    alert,
    success,
    error,
    warning
  };
};

export default useAlert;