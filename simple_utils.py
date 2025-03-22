#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import uuid
import requests
import simple_logger
import simple_config

log = simple_logger.get_logger(__name__)
conf = simple_config.get_config()

def download_file(url, save_path):
    """下载文件到指定路径"""
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        log.info(f"文件下载成功: {url} -> {save_path}")
        return save_path
    except Exception as e:
        log.error(f"文件下载失败: {url}, 错误: {str(e)}")
        raise

def delete_file(file_path):
    """删除文件"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            log.info(f"文件删除成功: {file_path}")
    except Exception as e:
        log.error(f"文件删除失败: {file_path}, 错误: {str(e)}")

def generate_unique_id():
    """生成唯一ID"""
    return str(uuid.uuid4())

def download_path(unique_id, url):
    """生成下载文件的路径"""
    file_ext = os.path.splitext(url.split('?')[0])[-1]
    if not file_ext:
        file_ext = '.mp3'  # 默认扩展名
    return os.path.join(conf.temp_dir, f"{unique_id}{file_ext}")

def decode_path(unique_id):
    """生成解码后文件的路径"""
    return os.path.join(conf.wav_dir, f"{unique_id}.wav")

def script_path(unique_id):
    """生成Praat脚本的路径"""
    return os.path.join(conf.script_dir, f"{unique_id}.praat")

def csv_path(unique_id):
    """生成CSV文件的路径"""
    return os.path.join(conf.csv_path, f"{unique_id}.csv") 