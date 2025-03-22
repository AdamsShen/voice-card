import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
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
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  position: relative;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: bold;
  text-align: center;
`;

const Content = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const MenuGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  max-width: 800px;
  width: 100%;
`;

const MenuItem = styled.div`
  background-color: white;
  border-radius: 10px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
`;

const MenuIcon = styled.div`
  font-size: 48px;
  margin-bottom: 15px;
  color: #AA80AD;
`;

const MenuTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  color: #333;
`;

const MenuDescription = styled.p`
  margin-top: 10px;
  color: #666;
  font-size: 14px;
`;

const Footer = styled.footer`
  background-color: #f0f0f0;
  padding: 15px;
  text-align: center;
  color: #666;
  font-size: 14px;
`;

const LogoutButtonWrapper = styled.div`
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
`;

/**
 * 主页面组件
 */
const MainPage = () => {
  const navigate = useNavigate();
  console.log(navigate);
  // 菜单项
  const menuItems = [
    {
      icon: '🎙️',
      title: '录制声音',
      description: '录制连麦用户的声音',
      path: '/record'
    },
    {
      icon: '🔍',
      title: '声音分析',
      description: '分析录制的声音特征',
      path: '/analysis'
    },
    {
      icon: '🖼️',
      title: '制作声鉴卡',
      description: '生成用户声音鉴定卡',
      path: '/card-maker'
    },
    {
      icon: '⚙️',
      title: '设置',
      description: '软件设置与帮助',
      path: '/settings'
    }
  ];

  // 处理菜单项点击
  const handleMenuItemClick = (path) => {
    navigate(path);
  };

  return (
    <Container>
      <Header>
        <Title>小浪声鉴卡</Title>
        <LogoutButtonWrapper>
          <LogoutButton />
        </LogoutButtonWrapper>
      </Header>
      
      <Content>
        <MenuGrid>
          {menuItems.map((item, index) => (
            <MenuItem 
              key={index} 
              onClick={() => handleMenuItemClick(item.path)}
            >
              <MenuIcon>{item.icon}</MenuIcon>
              <MenuTitle>{item.title}</MenuTitle>
              <MenuDescription>{item.description}</MenuDescription>
            </MenuItem>
          ))}
        </MenuGrid>
      </Content>
      
      <Footer>
        © {new Date().getFullYear()} 小浪声鉴卡 - 版本 1.0.0
      </Footer>
    </Container>
  );
};

export default MainPage; 