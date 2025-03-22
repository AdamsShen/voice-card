import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Global, css } from '@emotion/react';

// 导入页面组件
import LoginPage from './pages/LoginPage';
import RecordPage from './pages/RecordPage';
import AnalysisPage from './pages/AnalysisPage';
import CardMakerPage from './pages/CardMakerPage';
import CardDisplayPage from './pages/CardDisplayPage';

// 全局样式
const globalStyles = css`
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    overflow-x: hidden; // 防止水平滚动条
  }

  button {
    cursor: pointer;
  }

  /* 响应式设计规则 */
  @media (max-width: 600px) {
    h1 {
      font-size: 1.5rem;
    }
    h2 {
      font-size: 1.3rem;
    }
    h3 {
      font-size: 1.1rem;
    }
    p, input, button, textarea {
      font-size: 0.9rem;
    }
    .container {
      padding: 10px;
    }
  }
`;

// 受保护的路由组件
const ProtectedRoute = ({ children }) => {
  // 检查卡密是否有效
  const checkCardValidity = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('check-card-expiry');
      return result.valid;
    } catch (error) {
      console.error('验证卡密时出错:', error);
      return false;
    }
  };

  const [isValid, setIsValid] = React.useState(null);

  React.useEffect(() => {
    const validate = async () => {
      const valid = await checkCardValidity();
      setIsValid(valid);
    };
    validate();
  }, []);

  if (isValid === null) {
    // 加载中
    return <div>加载中...</div>;
  }

  return isValid ? children : <Navigate to="/login" />;
};

// 应用组件
const App = () => {
  return (
    <>
      <Global styles={globalStyles} />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <RecordPage />
            </ProtectedRoute>
          } />
          <Route path="/record" element={
            <ProtectedRoute>
              <RecordPage />
            </ProtectedRoute>
          } />
          <Route path="/analysis" element={
            <ProtectedRoute>
              <AnalysisPage />
            </ProtectedRoute>
          } />
          <Route path="/card-maker" element={
            <ProtectedRoute>
              <CardMakerPage />
            </ProtectedRoute>
          } />
          <Route path="/card-display" element={
            <ProtectedRoute>
              <CardDisplayPage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </>
  );
};

// 渲染应用
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />); 