#!/usr/bin/env python
# -*- coding: utf-8 -*-

import logging
import sys
import io
import os

def get_logger(name):
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        
        # 设置环境变量
        if sys.platform == 'win32':
            os.environ['PYTHONIOENCODING'] = 'utf-8'
        
        # 创建控制台处理器，确保使用UTF-8编码
        if sys.platform == 'win32':
            # Windows系统特殊处理
            console_stream = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        else:
            console_stream = sys.stdout
            
        console_handler = logging.StreamHandler(console_stream)
        console_handler.setLevel(logging.INFO)
        
        # 设置日志格式
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(formatter)
        
        # 添加处理器到日志器
        logger.addHandler(console_handler)
    
    return logger 