#!/usr/bin/env python
# -*- coding: utf-8 -*-

import subprocess
import simple_config
import simple_logger
import os
import sys

log = simple_logger.get_logger(__name__)
conf = simple_config.get_config()

# FFmpeg命令模板，将输入音频转换为WAV格式
# 使用更严格的参数确保生成的WAV文件兼容Praat
_command = '%s -v error -vn -y -i "%s" -acodec pcm_s16le -ar 44100 -ac 1 -f wav "%s"'

def get_ffmpeg_path():
    """获取 FFmpeg 可执行文件路径"""
    # 获取当前目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    log.info(f"当前目录: {current_dir}")
    
    # 获取可执行文件目录
    exe_dir = os.path.dirname(sys.executable)
    log.info(f"可执行文件目录: {exe_dir}")
    
    # 定义可能的 FFmpeg 路径
    ffmpeg_paths = [
        # 可执行文件所在目录
        os.path.join(exe_dir, 'ffmpeg', 'ffmpeg.exe'),
        os.path.join(exe_dir, 'ffmpeg.exe'),
        
        # 当前目录
        os.path.join(current_dir, 'ffmpeg', 'ffmpeg.exe'),
        os.path.join(current_dir, 'ffmpeg.exe'),
        
        # 上级目录
        os.path.join(os.path.dirname(current_dir), 'ffmpeg', 'ffmpeg.exe'),
        os.path.join(os.path.dirname(current_dir), 'ffmpeg.exe'),
        
        # 应用程序根目录
        os.path.join(os.path.dirname(os.path.dirname(current_dir)), 'ffmpeg', 'ffmpeg.exe'),
        os.path.join(os.path.dirname(os.path.dirname(current_dir)), 'ffmpeg.exe'),
        
        # 资源目录
        os.path.join(current_dir, 'resources', 'ffmpeg', 'ffmpeg.exe'),
        os.path.join(exe_dir, 'resources', 'ffmpeg', 'ffmpeg.exe'),
    ]
    
    # 检查是否在 PyInstaller 环境中运行
    if hasattr(sys, '_MEIPASS'):
        meipass_dir = sys._MEIPASS
        log.info(f"运行在 PyInstaller 环境中，MEIPASS: {meipass_dir}")
        
        # 添加 PyInstaller 环境中的路径
        pyinstaller_paths = [
            os.path.join(meipass_dir, 'ffmpeg', 'ffmpeg.exe'),
            os.path.join(meipass_dir, 'ffmpeg.exe'),
            os.path.join(meipass_dir, 'resources', 'ffmpeg', 'ffmpeg.exe'),
        ]
        
        # 将 PyInstaller 路径放在最前面
        ffmpeg_paths = pyinstaller_paths + ffmpeg_paths
    
    # 检查所有可能的路径
    for path in ffmpeg_paths:
        log.info(f"检查 FFmpeg 路径: {path}")
        if os.path.exists(path):
            log.info(f"找到 FFmpeg: {path}")
            return path
    
    # 如果找不到，尝试使用系统 PATH 中的 FFmpeg
    log.warning("未找到内置的 FFmpeg，将尝试使用系统 PATH 中的 FFmpeg")
    
    # 尝试在系统 PATH 中查找 ffmpeg.exe
    try:
        # 在 Windows 上使用 where 命令查找 ffmpeg.exe
        if os.name == 'nt':
            result = subprocess.check_output('where ffmpeg', shell=True, stderr=subprocess.PIPE, universal_newlines=True)
            if result:
                ffmpeg_in_path = result.strip().split('\n')[0]
                log.info(f"在系统 PATH 中找到 FFmpeg: {ffmpeg_in_path}")
                return ffmpeg_in_path
    except Exception as e:
        log.warning(f"在系统 PATH 中查找 FFmpeg 失败: {str(e)}")
    
    return 'ffmpeg'

def execute_ffmpeg_command(command):
    """执行 FFmpeg 命令"""
    # 获取 FFmpeg 路径
    ffmpeg_path = get_ffmpeg_path()
    log.info(f"使用 FFmpeg 路径: {ffmpeg_path}")
    
    # 检查 FFmpeg 是否存在
    if ffmpeg_path != 'ffmpeg' and not os.path.exists(ffmpeg_path):
        log.error(f"FFmpeg 可执行文件不存在: {ffmpeg_path}")
        return False
    
    # 替换命令中的 ffmpeg 为实际路径
    if command.startswith('ffmpeg '):
        command = command.replace('ffmpeg ', f'"{ffmpeg_path}" ', 1)
    
    log.info(f"执行FFmpeg命令: {command}")
    
    try:
        # 使用 subprocess.Popen 获取更详细的错误信息
        process = subprocess.Popen(
            command, 
            shell=True, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            universal_newlines=True
        )
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            log.error(f"FFmpeg 执行失败，返回码: {process.returncode}")
            log.error(f"错误输出: {stderr}")
            return False
        
        if stdout:
            log.info(f"FFmpeg 标准输出: {stdout}")
        
        log.info(f"FFmpeg 执行成功")
        return True
    except subprocess.CalledProcessError as e:
        log.error(f"FFmpeg 执行失败，错误: {str(e)}")
        if hasattr(e, 'stderr') and e.stderr:
            log.error(f"错误输出: {e.stderr}")
        return False
    except Exception as e:
        log.error(f"FFmpeg 执行异常，错误: {str(e)}")
        return False

def convert(src, dest):
    """
    使用FFmpeg将音频文件转换为WAV格式
    
    参数:
        src: 源文件路径
        dest: 目标文件路径
    
    返回:
        dest: 目标文件路径
    """
    try:
        # 检查源文件是否存在
        if not os.path.exists(src):
            log.error(f"源文件不存在: {src}")
            raise FileNotFoundError(f"源文件不存在: {src}")
        
        # 确保目标目录存在
        dest_dir = os.path.dirname(dest)
        if not os.path.exists(dest_dir):
            log.info(f"创建目标目录: {dest_dir}")
            os.makedirs(dest_dir, exist_ok=True)
        
        # 构建命令
        cmd = _command % ('ffmpeg', src, dest)
        log.info(f"准备执行FFmpeg命令: {cmd}")
        
        # 使用 execute_ffmpeg_command 执行命令
        success = execute_ffmpeg_command(cmd)
        
        if success:
            log.info(f"音频转换成功: {src} -> {dest}")
            return dest
        else:
            error_msg = f"音频转换失败: {src}"
            log.error(error_msg)
            raise RuntimeError(error_msg)
    except Exception as e:
        log.error(f"音频转换发生异常: {src}, 错误: {str(e)}")
        raise 