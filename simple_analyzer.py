#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import shutil
import simple_logger
import simple_config
import simple_ffmpeg
import simple_utils

log = simple_logger.get_logger(__name__)
conf = simple_config.get_config()

def download_audio(url):
    """
    下载音频文件
    
    参数:
        url: 音频文件URL
    
    返回:
        下载的文件路径
    """
    unique_id = simple_utils.generate_unique_id()
    download_path = simple_utils.download_path(unique_id, url)
    
    log.info(f"开始下载音频: {url}")
    simple_utils.download_file(url, download_path)
    log.info(f"音频下载完成: {download_path}")
    
    return download_path

def convert_audio(download_path):
    """
    转换音频为WAV格式
    
    参数:
        download_path: 下载的音频文件路径
    
    返回:
        转换后的WAV文件路径
    """
    unique_id = simple_utils.generate_unique_id()
    wav_path = simple_utils.decode_path(unique_id)
    
    # 确保目录存在
    os.makedirs(os.path.dirname(wav_path), exist_ok=True)
    
    log.info(f"开始转换音频: {download_path} -> {wav_path}")
    try:
        simple_ffmpeg.convert(download_path, wav_path)
        
        # 检查文件是否存在且大小大于0
        if os.path.exists(wav_path) and os.path.getsize(wav_path) > 0:
            log.info(f"音频转换完成: {wav_path}")
            return wav_path
        else:
            log.error(f"音频转换失败: 输出文件不存在或为空")
            raise Exception("音频转换失败: 输出文件不存在或为空")
    except Exception as e:
        log.error(f"音频转换失败: {str(e)}")
        raise
    finally:
        # 清理下载的原始文件
        # simple_utils.delete_file(download_path)
        pass

def analyze_audio(url):
    """
    分析音频文件
    
    参数:
        url: 音频文件URL
    
    返回:
        转换后的WAV文件路径
    """
    try:
        # 下载音频
        download_path = download_audio(url)
        
        # 转换音频
        wav_path = convert_audio(download_path)
        
        return wav_path
    except Exception as e:
        log.error(f"音频分析失败: {str(e)}")
        raise

def analyze_local_file(file_path):
    """
    分析本地音频文件
    
    参数:
        file_path: 本地音频文件路径
    
    返回:
        转换后的WAV文件路径
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")
    
    # 获取文件名和扩展名
    file_name = os.path.basename(file_path)
    
    # 生成唯一ID和目标路径
    unique_id = simple_utils.generate_unique_id()
    wav_path = simple_utils.decode_path(unique_id)
    
    # 确保目录存在
    os.makedirs(os.path.dirname(wav_path), exist_ok=True)
    
    # 如果已经是WAV文件，仍然使用FFmpeg转换以确保格式兼容
    log.info(f"转换音频文件: {file_path} -> {wav_path}")
    return convert_audio(file_path) 