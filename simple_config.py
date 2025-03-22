#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys

class Config:
    def __init__(self):
        # 检测是否是PyInstaller打包的环境
        if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
            # PyInstaller打包后的路径
            self.base_dir = sys._MEIPASS
            print(f"运行在PyInstaller打包环境中，基础目录: {self.base_dir}")
        else:
            # 正常运行环境
            self.base_dir = os.path.dirname(os.path.abspath(__file__))
            print(f"运行在正常环境中，基础目录: {self.base_dir}")
        
        # 基本路径配置
        self.temp_dir = os.path.join(self.base_dir, "temp")
        self.model_dir = os.path.join(self.base_dir, "models")
        self.wav_dir = os.path.join(self.temp_dir, "wav")
        self.script_dir = os.path.join(self.temp_dir, "scripts")
        self.csv_path = os.path.join(self.temp_dir, "csv")
        
        # 创建必要的目录
        for dir_path in [self.temp_dir, self.wav_dir, self.script_dir, self.csv_path]:
            if not os.path.exists(dir_path):
                try:
                    os.makedirs(dir_path)
                except Exception as e:
                    print(f"警告: 无法创建目录 {dir_path}: {str(e)}")
                    # 如果在打包环境中无法创建目录，使用临时目录
                    if getattr(sys, 'frozen', False):
                        import tempfile
                        temp_root = tempfile.gettempdir()
                        self.temp_dir = os.path.join(temp_root, "voice-analyzer-temp")
                        self.wav_dir = os.path.join(self.temp_dir, "wav")
                        self.script_dir = os.path.join(self.temp_dir, "scripts")
                        self.csv_path = os.path.join(self.temp_dir, "csv")
                        
                        # 重新尝试创建目录
                        for alt_dir in [self.temp_dir, self.wav_dir, self.script_dir, self.csv_path]:
                            if not os.path.exists(alt_dir):
                                os.makedirs(alt_dir)
                        break
        
        # 打印路径信息，便于调试
        print(f"模型目录: {self.model_dir}")
        print(f"临时目录: {self.temp_dir}")
        print(f"WAV目录: {self.wav_dir}")
        
        # Praat配置 - Windows系统下的默认安装路径
        if os.name == 'nt':  # Windows系统
            # 尝试多个可能的路径 - 优先使用GUI版本
            possible_paths = [
                # 优先检查打包环境中的路径
                os.path.join(self.base_dir, "praat", "Praat.exe"),
                # 然后检查项目目录下的命令行版本
                os.path.join(self.base_dir, "praat", "praatcon.exe"),
                # 然后检查标准安装路径
                r"C:\Program Files\Praat\Praat.exe",     # GUI版本
                r"C:\Program Files\Praat\praatcon.exe",  # 命令行版本
                r"C:\Program Files (x86)\Praat\Praat.exe",
                r"C:\Program Files (x86)\Praat\praatcon.exe",
                r"C:\Praat\Praat.exe",
                r"C:\Praat\praatcon.exe"
            ]
            
            # 检查路径是否存在
            for path in possible_paths:
                if os.path.exists(path):
                    self.praat_path = path
                    print(f"找到Praat路径: {self.praat_path}")
                    break
            else:
                # 如果都不存在，使用默认值
                self.praat_path = os.path.join(self.base_dir, "praat", "Praat.exe")
                print(f"警告: 未找到Praat可执行文件，将使用默认路径: {self.praat_path}")
        else:
            self.praat_path = "praat"  # 非Windows系统
        
        # FFmpeg配置
        self.ffmpeg_path = "ffmpeg"  # 假设ffmpeg已经在PATH中
        
        # 基频范围配置
        self.pitch_min = 80
        self.pitch_max = 500

_config = None

def get_config():
    global _config
    if _config is None:
        _config = Config()
    return _config 