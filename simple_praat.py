#!/usr/bin/env python
# -*- coding: utf-8 -*-

import subprocess
import traceback
import os
import sys
import pandas as pd
import simple_logger
import simple_config
from simple_utils import delete_file

log = simple_logger.get_logger(__name__)
conf = simple_config.get_config()

# Praat脚本模板，用于提取音频的基频特征
# 使用最简单的脚本格式，避免路径问题
_praat_script = u"""
Read from file: "{wav_file}"
soundID = selected("Sound")
soundName$ = selected$("Sound")
To Pitch: 0.0, {pitch_min}, {pitch_max}
pitchID = selected("Pitch")
numberOfFrames = Get number of frames
resultLine$ = ""
for i to numberOfFrames
    time = Get time from frame number: i
    pitch = Get value at time: time, "Hertz", "Linear"
    if pitch <> undefined
        appendFileLine: "{csv_path}", pitch
    endif
endfor
echo "{csv_path}"
"""

class Praat:
    def __init__(self, script_path, wav_path, voice_name, voice_suffix, csv_output_path):
        """
        初始化Praat对象
        
        参数:
            script_path: Praat脚本保存路径
            wav_path: WAV文件路径
            voice_name: 声音文件名（不含扩展名）
            voice_suffix: 声音文件扩展名
            csv_output_path: CSV输出路径
        """
        self._script_path = script_path
        self._voice_name = voice_name
        self._voice_suffix = voice_suffix
        self._wav_dir = wav_path
        self._csv_path = csv_output_path

    def praat(self, return_pandas_df=True):
        """
        执行Praat分析
        
        参数:
            return_pandas_df: 是否返回Pandas DataFrame对象
        
        返回:
            如果return_pandas_df为True，返回包含基频数据的DataFrame
            否则返回原始字符串
        """
        try:
            # 确保路径使用正斜杠，Praat在Windows下也需要使用正斜杠
            full_wav_path = self._wav_dir
            
            # 检查音频文件是否存在
            if not os.path.exists(full_wav_path):
                raise FileNotFoundError(f"音频文件不存在: {full_wav_path}")
            
            # 获取文件名（不含扩展名）
            voice_name = os.path.splitext(os.path.basename(full_wav_path))[0]
            
            # 创建CSV文件路径
            csv_file = os.path.join(self._csv_path, f"{voice_name}.csv")
            
            log.info(f"处理音频文件: {full_wav_path}")
            
            # 将完整的WAV文件路径转换为Praat可接受的格式
            wav_file_path = full_wav_path.replace('\\', '/')
            csv_file_path = csv_file.replace('\\', '/')
            
            # 确保目录存在
            os.makedirs(os.path.dirname(self._script_path), exist_ok=True)
            os.makedirs(self._csv_path, exist_ok=True)
            
            # 删除可能存在的旧CSV文件
            if os.path.exists(csv_file):
                os.remove(csv_file)
            
            # 生成Praat脚本
            with open(self._script_path, mode='w', encoding='utf-8') as file:
                script_content = _praat_script.format(
                    wav_file=wav_file_path,
                    csv_path=csv_file_path,
                    pitch_max=conf.pitch_max,
                    pitch_min=conf.pitch_min
                )
                file.write(script_content)
            
            # 检查脚本文件是否存在
            if not os.path.exists(self._script_path):
                raise FileNotFoundError(f"脚本文件不存在: {self._script_path}")
            
            # 执行Praat命令 - 根据可执行文件名称调整命令行参数
            praat_path = conf.praat_path
            
            # 检查Praat可执行文件是否存在
            if not os.path.exists(praat_path):
                log.warning(f"Praat可执行文件不存在: {praat_path}")
                
                # 如果在PyInstaller环境中，尝试从资源目录加载
                if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
                    # 尝试其他可能的路径
                    alternative_paths = [
                        os.path.join(sys._MEIPASS, 'praat', 'Praat.exe'),
                        os.path.join(sys._MEIPASS, 'Praat.exe'),
                        os.path.join(os.path.dirname(sys.executable), 'praat', 'Praat.exe'),
                        os.path.join(os.path.dirname(sys.executable), 'Praat.exe')
                    ]
                    
                    for alt_path in alternative_paths:
                        log.info(f"尝试替代Praat路径: {alt_path}")
                        if os.path.exists(alt_path):
                            praat_path = alt_path
                            log.info(f"找到Praat可执行文件: {praat_path}")
                            break
                    else:
                        log.error("无法找到Praat可执行文件，分析将失败")
            
            log.info(f"使用Praat路径: {praat_path}")
            cmd = f'"{praat_path}" --run "{self._script_path}"'
            
            log.info(f"执行Praat命令: {cmd}")
            
            result = subprocess.check_output(cmd, shell=True)
            
            # 检查CSV文件是否生成
            if not os.path.exists(csv_file):
                log.error(f"CSV文件未生成: {csv_file}")
                # 创建一个空的DataFrame
                return pd.DataFrame(columns=['pitch'])
            
            # 解析结果
            if return_pandas_df:
                df = pd.read_csv(csv_file, names=['pitch'])
                return df
            else:
                with open(csv_file, 'r') as f:
                    data = f.read()
                return data
        except Exception as e:
            log.error(f"Praat分析失败: {traceback.format_exc()}")
            # 创建一个空的DataFrame作为备用
            if return_pandas_df:
                return pd.DataFrame(columns=['pitch'])
            else:
                return ""
        finally:
            # 清理临时文件
            try:
                if 'csv_file' in locals() and os.path.exists(csv_file):
                    delete_file(csv_file)
                delete_file(self._script_path)
            except:
                pass

    @staticmethod
    def parse_output(result):
        """解析Praat输出为DataFrame"""
        try:
            filename = result.decode('utf-8').replace('"', '').replace('\n', '')
            if os.path.exists(filename):
                df = pd.read_csv(filename, names=['pitch'])
                delete_file(filename)
                return df
            else:
                log.error(f"CSV文件不存在: {filename}")
                # 返回空的DataFrame
                return pd.DataFrame(columns=['pitch'])
        except Exception as e:
            log.error(f"解析输出失败: {str(e)}")
            return pd.DataFrame(columns=['pitch'])

    @staticmethod
    def _parse_output(result):
        """从CSV文件读取基频数据"""
        try:
            if isinstance(result, str):
                df = pd.read_csv(result, names=['pitch'])
            else:
                # 如果是StringIO对象
                df = pd.read_csv(result, names=['pitch'])
            return df
        except Exception as e:
            log.error(f"解析CSV失败: {str(e)}")
            return pd.DataFrame(columns=['pitch'])

    @staticmethod
    def parse_output_raw_string(result):
        """解析Praat输出为原始字符串"""
        try:
            filename = result.decode('utf-8').replace('"', '').replace('\n', '')
            if os.path.exists(filename):
                with open(filename, 'r') as f:
                    data = f.read()
                delete_file(filename)
                return data
            else:
                log.error(f"CSV文件不存在: {filename}")
                return ""
        except Exception as e:
            log.error(f"解析原始字符串失败: {str(e)}")
            return "" 