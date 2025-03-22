#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
修复版声音分析脚本
使用更稳定的方法进行声音分析，解决兼容性问题
优化性能和准确性
"""

import sys
import json
import os
import numpy as np
import librosa
import argparse
import time
import traceback
import warnings
import io
import random
import concurrent.futures
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False

# 忽略警告
warnings.filterwarnings("ignore")

# 版本信息
VERSION = "1.0.4"

# 性别判断的频率阈值 - 基于大量研究数据
GENDER_THRESHOLDS = {
    "f0": {  # 基频阈值
        "male_definite": 140,    # 明确男声 (调整)
        "male_likely": 155,      # 可能男声 (调整)
        "ambiguous": 170,        # 模糊区域 (调整)
        "female_likely": 185,    # 可能女声 (调整)
        "female_definite": 205   # 明确女声 (调整)
    },
    "f1": {  # 第一共振峰阈值
        "male_definite": 430,    # 明确男声 (调整)
        "male_likely": 480,      # 可能男声 (调整)
        "female_likely": 530,    # 可能女声 (调整)
        "female_definite": 580   # 明确女声 (调整)
    },
    "centroid": {  # 频谱质心阈值
        "male_definite": 1500,   # 明确男声 (调整)
        "male_likely": 1700,     # 可能男声 (调整)
        "female_likely": 1900,   # 可能女声 (调整)
        "female_definite": 2100  # 明确女声 (调整)
    }
}

# 音色定义 - 与前端保持一致
VOICE_TYPES = {
    "female": {
        "萝莉音": ["软甜娇嗔可爱音", "奶声奶气幼齿音", "元气美少女音", "清甜温婉音", "一般萝莉音"],
        "少萝音": ["甜美童声音", "软糯少女音", "清脆童声音", "一般少萝音"],
        "少女音": ["娇俏可爱学妹音", "可爱小家碧玉音", "山间黄鹂吟鸣音", "天真小迷糊音", "娇声细语音", "一般少女音"],
        "少御音": ["温柔体贴音", "清新脱俗音", "知性优雅音", "一般少御音"],
        "御姐音": ["温婉仙气女神音", "清冷少女音", "朦胧迷醉小鼻音", "腼腆羞涩女教师音", "一般御姐音"],
        "御妈音": ["妖娆性感音", "气息勾魂音", "霸道女总裁音", "销魂迷醉撩人音", "一般御妈音"],
        "大妈音": ["成熟稳重音", "低沉厚重音", "沧桑老年音", "一般大妈音"]
    },
    "male": {
        "正太音": ["稚嫩童声音", "清脆少年音", "活泼阳光音", "一般正太音"],
        "少年音": ["清爽少年音", "青春活力音", "阳光少年音", "一般少年音"],
        "青受音": ["空灵舒服玻璃音", "傲娇正太音", "乖巧气泡音", "慵懒含笑小尾音", "邻家腼腆小男孩音", "一般青受音"],
        "青年音": ["干干净净治愈音", "午后红茶音", "潜质男神音", "气质修养绅士音", "一般青年音"],
        "青攻音": ["成熟稳重音", "低沉磁性音", "温柔体贴音", "一般青攻音"],
        "暖男音": ["温柔宠溺学长音", "低沉磁性叔音", "微微小电流音", "一般暖男音"],
        "青叔音": ["醇厚蜀黍音", "慵懒青年音", "忧郁小烟嗓", "磨叽唠叨说教育", "一般青叔音"],
        "大叔音": ["刚硬老爷儿们音", "久经沙场大将军音", "霸气帝王音", "怪蜀黍音", "一般大叔音"]
    }
}

# 匹配音色映射 - 将一个性别的音色映射到另一个性别的对应音色
VOICE_MAPPING = {
    "female": {
        "萝莉音": "正太音",
        "少萝音": "少年音",
        "少女音": "青受音",
        "少御音": "青年音",
        "御姐音": "青攻音",
        "御妈音": "青叔音",
        "大妈音": "大叔音"
    },
    "male": {
        "正太音": "萝莉音",
        "少年音": "少萝音",
        "青受音": "少女音",
        "青年音": "少御音",
        "青攻音": "御姐音",
        "青叔音": "御妈音",
        "大叔音": "大妈音"
    }
}

def debug_print(message, debug_mode=True):
    """打印调试信息到stderr"""
    if debug_mode:
        print(f"DEBUG: {message}", file=sys.stderr)

def analyze_voice(file_path, debug_mode=True):
    """
    使用librosa分析声音文件
    提取音频特征并进行分类
    增强错误处理和兼容性
    优化性能和准确性
    """
    start_time = time.time()
    debug_print(f"开始分析文件: {file_path}", debug_mode)
    
    # 检查文件是否存在
    if not os.path.exists(file_path):
        debug_print(f"文件不存在: {file_path}", debug_mode)
        raise FileNotFoundError(f"文件不存在: {file_path}")
    
    # 检查文件大小
    file_size = os.path.getsize(file_path)
    debug_print(f"文件大小: {file_size} 字节", debug_mode)
    
    if file_size == 0:
        debug_print("文件为空", debug_mode)
        raise ValueError(f"文件为空: {file_path}")
    
    # 加载音频文件 - 性能优化
    debug_print("加载音频文件...", debug_mode)
    try:
        # 尝试不同的加载方法
        try:
            debug_print("尝试方法1: 使用原始采样率加载...", debug_mode)
            # 性能优化: 只加载前3秒的音频，减少从5秒到3秒
            y, sr = librosa.load(file_path, sr=None, mono=True, duration=3.0)
            debug_print(f"方法1成功: 采样率 = {sr} Hz", debug_mode)
        except Exception as e1:
            debug_print(f"方法1失败: {str(e1)}", debug_mode)
            try:
                debug_print("尝试方法2: 使用固定采样率加载...", debug_mode)
                # 使用较低的采样率以提高性能
                y, sr = librosa.load(file_path, sr=16000, mono=True, duration=5.0)
                debug_print(f"方法2成功: 采样率 = {sr} Hz", debug_mode)
            except Exception as e2:
                debug_print(f"方法2失败: {str(e2)}", debug_mode)
                try:
                    debug_print("尝试方法3: 使用audioread直接加载...", debug_mode)
                    import audioread
                    with audioread.audio_open(file_path) as audio_file:
                        sr_native = audio_file.samplerate
                        n_channels = audio_file.channels
                        s = audio_file.read_data()
                        
                    # 将字节数据转换为numpy数组
                    import array
                    data = array.array('h', s)
                    y = np.array(data, dtype=np.float32) / 32768.0
                    
                    # 如果是立体声，转换为单声道
                    if n_channels > 1:
                        y = y.reshape(-1, n_channels).mean(axis=1)
                    
                    sr = sr_native
                    debug_print(f"方法3成功: 采样率 = {sr} Hz", debug_mode)
                except Exception as e3:
                    debug_print(f"方法3失败: {str(e3)}", debug_mode)
                    
                    # 尝试使用pydub加载
                    if PYDUB_AVAILABLE:
                        try:
                            debug_print("尝试方法4: 使用pydub加载...", debug_mode)
                            # 使用pydub加载音频
                            audio = AudioSegment.from_file(file_path)
                            
                            # 获取采样率和通道数
                            sr = audio.frame_rate
                            n_channels = audio.channels
                            
                            # 将音频数据转换为numpy数组
                            samples = np.array(audio.get_array_of_samples())
                            
                            # 如果是立体声，转换为单声道
                            if n_channels == 2:
                                samples = samples.reshape((-1, 2)).mean(axis=1)
                            
                            # 标准化到[-1, 1]范围
                            y = samples.astype(np.float32) / (2**15 if audio.sample_width == 2 else 2**7)
                            
                            debug_print(f"方法4成功: 采样率 = {sr} Hz", debug_mode)
                        except Exception as e4:
                            debug_print(f"方法4失败: {str(e4)}", debug_mode)
                            debug_print("所有加载方法都失败，无法处理音频文件", debug_mode)
                            raise Exception("无法加载音频文件，请检查文件格式和系统音频库")
                    else:
                        debug_print("pydub不可用，无法尝试方法4", debug_mode)
                        debug_print("所有加载方法都失败，无法处理音频文件", debug_mode)
                        raise Exception("无法加载音频文件，请检查文件格式和系统音频库")
        
        # 如果音频太长，只取中间部分进行分析
        if len(y) > sr * 3:  # 如果超过3秒
            # 取中间3秒的部分
            mid_point = len(y) // 2
            start_idx = mid_point - int(1.5 * sr)
            end_idx = mid_point + int(1.5 * sr)
            y_analysis = y[max(0, start_idx):min(len(y), end_idx)]
            # 释放原始数据
            del y
            # 强制垃圾回收
            import gc
            gc.collect()
            debug_print(f"音频太长，只分析中间 {len(y_analysis)/sr:.2f} 秒", debug_mode)
        else:
            y_analysis = y
            del y
        
        load_time = time.time()
        debug_print(f"音频加载成功，耗时: {load_time - start_time:.2f}秒", debug_mode)
        debug_print(f"采样率: {sr} Hz, 长度: {len(y_analysis)} 样本", debug_mode)
        
        # 检查音频长度
        duration = len(y_analysis) / sr
        debug_print(f"音频时长: {duration:.2f} 秒", debug_mode)
        
        if duration < 1.0:
            debug_print("音频太短，无法分析", debug_mode)
            raise ValueError("音频文件太短，无法分析")
        
        # 提取特征 - 性能优化: 减少计算量
        debug_print("开始提取音频特征...", debug_mode)
        
        # 提取基频 (F0) - 性能优化
        debug_print("提取基频...", debug_mode)
        try:
            # 使用更大的hop_length以提高性能
            hop_length = 1024 * 4  # 增大hop_length以进一步提高性能
            fmin = 65  # 调整最低频率，更符合人声范围
            fmax = 500  # 调整最高频率
            
            # 尝试使用pyin算法
            try:
                # 添加center=False参数以加速计算
                f0, voiced_flag, voiced_probs = librosa.pyin(
                    y_analysis, 
                    fmin=fmin,
                    fmax=fmax,
                    sr=sr,
                    hop_length=hop_length,
                    fill_na=None,
                    center=False
                )
                debug_print("pyin算法提取基频成功", debug_mode)
            except Exception as pyin_error:
                debug_print(f"pyin算法失败: {str(pyin_error)}", debug_mode)
                # 使用简单的自相关方法作为备选
                debug_print("尝试使用自相关方法提取基频...", debug_mode)
                
                # 计算自相关函数
                frame_length = 2048
                hop_length = 1024
                frames = librosa.util.frame(y_analysis, frame_length=frame_length, hop_length=hop_length)
                
                # 初始化f0数组
                f0 = np.zeros(frames.shape[1])
                
                # 对每一帧计算自相关
                for i in range(frames.shape[1]):
                    frame = frames[:, i]
                    # 计算自相关
                    corr = np.correlate(frame, frame, mode='full')
                    corr = corr[len(corr)//2:]
                    
                    # 找到第一个峰值
                    peaks = librosa.util.peak_pick(corr, 3, 3, 3, 3, 0.5, 10)
                    if len(peaks) > 0 and peaks[0] > 0:
                        f0[i] = sr / peaks[0]
                    else:
                        f0[i] = np.nan
                
                voiced_flag = ~np.isnan(f0)
                voiced_probs = np.ones_like(f0)
                voiced_probs[~voiced_flag] = 0
                debug_print("自相关方法提取基频成功", debug_mode)
            
            # 过滤异常值 - 使用四分位距(IQR)方法
            f0_valid = f0[~np.isnan(f0)]
            if len(f0_valid) == 0:
                debug_print("无法检测到基频，可能是噪音", debug_mode)
                f0_mean = 0
                f0_std = 0
            else:
                q1, q3 = np.percentile(f0_valid, [25, 75])
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                f0_filtered = f0_valid[(f0_valid >= lower_bound) & (f0_valid <= upper_bound)]
                
                if len(f0_filtered) == 0:
                    f0_filtered = f0_valid  # 如果过滤后为空，使用原始值
                
                # 使用中位数而不是平均值，对异常值更鲁棒
                f0_mean = np.median(f0_filtered)
                f0_std = np.std(f0_filtered)
                debug_print(f"基频标准差: {f0_std:.2f} Hz (变化程度)", debug_mode)
            
            f0_time = time.time()
            debug_print(f"基频提取完成，耗时: {f0_time - load_time:.2f}秒", debug_mode)
            debug_print(f"平均基频: {f0_mean:.2f} Hz", debug_mode)
        except Exception as f0_error:
            debug_print(f"提取基频时出错: {str(f0_error)}", debug_mode)
            # 如果提取基频失败，设置默认值
            f0_mean = 0
            f0_std = 0
            f0_time = time.time()
        
        # 提取频谱质心 - 性能优化: 使用更大的hop_length
        debug_print("提取频谱质心...", debug_mode)
        try:
            # 在特征提取部分使用并行处理
            def extract_features_parallel(y_analysis, sr, hop_length=1024):
                """并行提取多个特征以提高性能"""
                features = {}
                
                with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                    # 提交频谱质心计算任务
                    cent_future = executor.submit(
                        librosa.feature.spectral_centroid, 
                        y=y_analysis, sr=sr, hop_length=hop_length
                    )
                    
                    # 提交频谱对比度计算任务
                    contrast_future = executor.submit(
                        librosa.feature.spectral_contrast,
                        y=y_analysis, sr=sr, hop_length=hop_length
                    )
                    
                    # 提交频谱带宽计算任务
                    bandwidth_future = executor.submit(
                        librosa.feature.spectral_bandwidth,
                        y=y_analysis, sr=sr, hop_length=hop_length
                    )
                    
                    # 获取结果
                    features['cent'] = cent_future.result()
                    features['contrast'] = contrast_future.result()
                    features['bandwidth'] = bandwidth_future.result()
                
                return features

            # 并行提取频谱特征
            spectral_features = extract_features_parallel(y_analysis, sr, hop_length=1024)
            cent = spectral_features['cent']
            cent_mean = np.mean(cent)
            contrast = spectral_features['contrast']
            contrast_mean = np.mean(contrast)
            bandwidth = spectral_features['bandwidth']
            bandwidth_mean = np.mean(bandwidth)
            
            cent_time = time.time()
            debug_print(f"频谱特征提取完成，耗时: {cent_time - f0_time:.2f}秒", debug_mode)
            debug_print(f"平均频谱质心: {cent_mean:.2f}", debug_mode)
        except Exception as spectral_error:
            debug_print(f"提取频谱特征时出错: {str(spectral_error)}", debug_mode)
            # 如果提取频谱特征失败，设置默认值
            cent_mean = 0
            contrast_mean = 0
            bandwidth_mean = 0
            cent_time = f0_time
        
        # 提取谐波与噪声比 - 性能优化: 使用更简单的方法
        debug_print("提取谐波与噪声比...", debug_mode)
        try:
            # 使用简单的频域方法计算HNR
            debug_print("使用频域方法计算HNR...", debug_mode)
            
            # 计算频谱
            D = np.abs(librosa.stft(y_analysis, hop_length=1024))
            
            # 简单估计谐波和噪声
            harmonic_energy = np.sum(D[:D.shape[0]//4, :])
            noise_energy = np.sum(D[D.shape[0]//4:, :])
            
            hnr = 0 if noise_energy == 0 else 20 * np.log10(harmonic_energy / noise_energy)
            debug_print("频域方法计算HNR成功", debug_mode)
            
            hnr_time = time.time()
            debug_print(f"谐波噪声比提取完成，耗时: {hnr_time - cent_time:.2f}秒", debug_mode)
            debug_print(f"谐波与噪声比: {hnr:.2f} dB", debug_mode)
        except Exception as hnr_error:
            debug_print(f"提取谐波与噪声比时出错: {str(hnr_error)}", debug_mode)
            # 如果提取谐波与噪声比失败，设置默认值
            hnr = 0
            hnr_time = cent_time
        
        # 提取额外的特征 - 性能优化: 使用更大的hop_length
        try:
            # 估算第一共振峰 (F1) - 简化方法
            # 使用频谱包络的峰值作为共振峰的估计
            S = np.abs(librosa.stft(y_analysis, hop_length=1024))
            freqs = librosa.fft_frequencies(sr=sr)
            
            # 计算频谱包络
            env = np.mean(S, axis=1)
            
            # 找到前三个峰值作为共振峰的估计
            peaks = librosa.util.peak_pick(env, 3, 3, 3, 3, 0.5, 10)
            
            # 确保至少有3个峰值
            if len(peaks) >= 3:
                f1 = freqs[peaks[0]]
                f2 = freqs[peaks[1]]
                f3 = freqs[peaks[2]]
            else:
                # 如果找不到足够的峰值，使用默认值
                f1 = 500 if f0_mean > 165 else 400
                f2 = f1 * 2
                f3 = f1 * 3
            
            # 计算高频能量比例
            high_freq_energy = np.sum(S[freqs > 1000])
            total_energy = np.sum(S)
            high_freq_ratio = high_freq_energy / total_energy if total_energy > 0 else 0
            
            debug_print(f"频谱对比度: {contrast_mean:.2f}", debug_mode)
            debug_print(f"频谱带宽: {bandwidth_mean:.2f}", debug_mode)
            debug_print(f"估算第一共振峰 (F1): {f1:.2f} Hz", debug_mode)
            debug_print(f"估算第二共振峰 (F2): {f2:.2f} Hz", debug_mode)
            debug_print(f"估算第三共振峰 (F3): {f3:.2f} Hz", debug_mode)
            debug_print(f"高频能量比例: {high_freq_ratio:.4f}", debug_mode)
        except Exception as extra_error:
            debug_print(f"提取额外特征时出错: {str(extra_error)}", debug_mode)
            # 如果提取额外特征失败，设置默认值
            contrast_mean = 0
            bandwidth_mean = 0
            f1 = 500 if f0_mean > 165 else 400
            f2 = f1 * 2
            f3 = f1 * 3
            high_freq_ratio = 0.2
        
        # 性别判断 - 使用加权投票系统提高准确度
        gender_votes = {
            "male": 0,
            "female": 0
        }
        
        # 1. 基于基频投票 (权重: 6) - 增加权重
        if f0_mean > 0:
            if f0_mean < GENDER_THRESHOLDS["f0"]["male_definite"]:  # 明确的男声
                gender_votes["male"] += 6
            elif f0_mean < GENDER_THRESHOLDS["f0"]["male_likely"]:  # 可能是男声
                gender_votes["male"] += 4
            elif f0_mean < GENDER_THRESHOLDS["f0"]["ambiguous"]:  # 边界情况，偏男声
                gender_votes["male"] += 2
            elif f0_mean > GENDER_THRESHOLDS["f0"]["female_definite"]:  # 明确的女声
                gender_votes["female"] += 6
            elif f0_mean > GENDER_THRESHOLDS["f0"]["female_likely"]:  # 可能是女声
                gender_votes["female"] += 4
            elif f0_mean >= GENDER_THRESHOLDS["f0"]["ambiguous"]:  # 边界情况，偏女声
                gender_votes["female"] += 2
        
        # 2. 基于第一共振峰投票 (权重: 4) - 增加权重
        if f1 < GENDER_THRESHOLDS["f1"]["male_definite"]:  # 明确的男声特征
            gender_votes["male"] += 4
        elif f1 < GENDER_THRESHOLDS["f1"]["male_likely"]:  # 可能是男声特征
            gender_votes["male"] += 3
        elif f1 > GENDER_THRESHOLDS["f1"]["female_definite"]:  # 明确的女声特征
            gender_votes["female"] += 4
        elif f1 > GENDER_THRESHOLDS["f1"]["female_likely"]:  # 可能是女声特征
            gender_votes["female"] += 3
        
        # 3. 基于频谱质心投票 (权重: 3) - 增加权重
        if cent_mean < GENDER_THRESHOLDS["centroid"]["male_definite"]:  # 明确的男声特征
            gender_votes["male"] += 3
        elif cent_mean < GENDER_THRESHOLDS["centroid"]["male_likely"]:  # 可能是男声特征
            gender_votes["male"] += 2
        elif cent_mean > GENDER_THRESHOLDS["centroid"]["female_definite"]:  # 明确的女声特征
            gender_votes["female"] += 3
        elif cent_mean > GENDER_THRESHOLDS["centroid"]["female_likely"]:  # 可能是女声特征
            gender_votes["female"] += 2
        
        # 4. 基于高频能量比例投票 (权重: 2) - 增加权重和精度
        if high_freq_ratio < 0.12:  # 明确男声特征
            gender_votes["male"] += 2
        elif high_freq_ratio < 0.18:  # 可能男声特征
            gender_votes["male"] += 1
        elif high_freq_ratio > 0.28:  # 明确女声特征
            gender_votes["female"] += 2
        elif high_freq_ratio > 0.22:  # 可能女声特征
            gender_votes["female"] += 1
        
        # 5. 基于谐波噪声比投票 (权重: 2) - 增加权重和精度
        if hnr < 8:  # 明确男声特征
            gender_votes["male"] += 2
        elif hnr < 12:  # 可能男声特征
            gender_votes["male"] += 1
        elif hnr > 18:  # 明确女声特征
            gender_votes["female"] += 2
        elif hnr > 14:  # 可能女声特征
            gender_votes["female"] += 1
        
        # 最终性别判断
        if gender_votes["female"] > gender_votes["male"]:
            gender = "female"
            gender_text = "女"
            gender_confidence = min(100, round(gender_votes["female"] / (gender_votes["female"] + gender_votes["male"] + 0.001) * 100))
            debug_print(f"基于投票 (女:{gender_votes['female']}, 男:{gender_votes['male']}) 判断为女声，置信度: {gender_confidence}%", debug_mode)
        else:
            gender = "male"
            gender_text = "男"
            gender_confidence = min(100, round(gender_votes["male"] / (gender_votes["female"] + gender_votes["male"] + 0.001) * 100))
            debug_print(f"基于投票 (女:{gender_votes['female']}, 男:{gender_votes['male']}) 判断为男声，置信度: {gender_confidence}%", debug_mode)
        
        # 根据性别和特征选择主音色
        if gender == "female":
            # 女声主音色分类
            if f0_mean > 250:
                main_voice = "萝莉音"
            elif 220 <= f0_mean <= 250:
                main_voice = "少萝音"
            elif 200 <= f0_mean <= 220:
                main_voice = "少女音"
            elif 190 <= f0_mean <= 210:
                main_voice = "少御音"
            elif 180 <= f0_mean <= 200:
                main_voice = "御姐音"
            elif 170 <= f0_mean <= 190:
                main_voice = "御妈音"
            else:
                main_voice = "大妈音"
        else:
            # 男声主音色分类
            if f0_mean > 150:
                main_voice = "正太音"
            elif 130 <= f0_mean <= 150:
                main_voice = "少年音"
            elif 120 <= f0_mean <= 140:
                main_voice = "青受音"
            elif 115 <= f0_mean <= 135:
                main_voice = "青年音"
            elif 110 <= f0_mean <= 130:
                main_voice = "青攻音"
            elif 100 <= f0_mean <= 120:
                main_voice = "青叔音"
            else:
                main_voice = "大叔音"
        
        debug_print(f"主音色: {main_voice}", debug_mode)
        
        # 计算主音色比例
        main_percentage = 0
        
        # 计算基频的稳定性 - 标准差越小，主音色比例越高
        f0_stability = 1.0 - min(1.0, f0_std / 50.0) if f0_mean > 0 else 0.5
        
        if gender == "female":
            # 女声的主音色比例计算
            if f0_mean > 260:  # 高音区，更明显
                main_percentage = 70 + f0_stability * 10  # 70-80%
            elif f0_mean > 220:
                main_percentage = 65 + f0_stability * 10  # 65-75%
            elif f0_mean > 200:
                main_percentage = 60 + f0_stability * 10  # 60-70%
            elif f0_mean > 180:
                main_percentage = 55 + f0_stability * 10  # 55-65%
            else:
                main_percentage = 50 + f0_stability * 10  # 50-60%
        else:
            # 男声的主音色比例计算
            if f0_mean > 150:  # 高音区，更明显
                main_percentage = 70 + f0_stability * 10  # 70-80%
            elif f0_mean > 130:
                main_percentage = 65 + f0_stability * 10  # 65-75%
            elif f0_mean > 110:
                main_percentage = 60 + f0_stability * 10  # 60-70%
            elif f0_mean > 90:
                main_percentage = 55 + f0_stability * 10  # 55-65%
            else:
                main_percentage = 50 + f0_stability * 10  # 50-60%
        
        # 确保比例在合理范围内
        main_percentage = max(50, min(80, main_percentage))
        main_percentage = round(main_percentage)
        
        debug_print(f"主音色比例: {main_percentage}%", debug_mode)
        
        # 生成辅音色（1-3个）
        secondary_voices = []
        
        # 添加第一个辅音色
        remaining_percentage = 100 - main_percentage
        
        # 根据性别选择可能的辅音色
        voice_types = list(VOICE_TYPES[gender].keys())
        
        # 排除已使用的音色
        available_voices = [v for v in voice_types if v != main_voice]
        
        # 为每个可能的辅音色计算得分
        voice_scores = {}
        
        for voice in available_voices:
            score = 0
            
            # 基于基频评分
            if gender == "female":
                if voice == "萝莉音" and f0_mean > 230:
                    score += 3
                elif voice == "少萝音" and 210 < f0_mean <= 240:
                    score += 3
                elif voice == "少女音" and 190 < f0_mean <= 210:
                    score += 3
                elif voice == "少御音" and 180 < f0_mean <= 200:
                    score += 3
                elif voice == "御姐音" and 170 < f0_mean <= 190:
                    score += 3
                elif voice == "御妈音" and 160 < f0_mean <= 180:
                    score += 3
                elif voice == "大妈音" and f0_mean <= 170:
                    score += 3
            else:
                if voice == "正太音" and f0_mean > 140:
                    score += 3
                elif voice == "少年音" and 120 < f0_mean <= 140:
                    score += 3
                elif voice == "青受音" and 110 < f0_mean <= 130:
                    score += 3
                elif voice == "青年音" and 105 < f0_mean <= 125:
                    score += 3
                elif voice == "青攻音" and 100 < f0_mean <= 120:
                    score += 3
                elif voice == "青叔音" and 90 < f0_mean <= 110:
                    score += 3
                elif voice == "大叔音" and f0_mean <= 100:
                    score += 3
            
            # 基于谐波噪声比评分
            if gender == "female":
                if voice in ["萝莉音", "少女音"] and hnr > 18:
                    score += 2
                elif voice in ["御姐音", "大妈音"] and hnr <= 12:
                    score += 2
            else:
                if voice in ["正太音", "青受音"] and hnr > 12:
                    score += 2
                elif voice in ["青攻音", "大叔音"] and hnr <= 8:
                    score += 2
            
            # 基于频谱质心评分
            if gender == "female":
                if voice in ["萝莉音", "少萝音"] and cent_mean > 2200:
                    score += 2
                elif voice in ["御姐音", "御妈音", "大妈音"] and cent_mean < 1800:
                    score += 2
            else:
                if voice in ["正太音", "少年音"] and cent_mean > 1800:
                    score += 2
                elif voice in ["青叔音", "大叔音"] and cent_mean < 1400:
                    score += 2
            
            voice_scores[voice] = score
        
        # 按分数排序
        sorted_voices = sorted(voice_scores.items(), key=lambda x: x[1], reverse=True)
        
        # 选择得分最高的两个辅音色
        for i, (voice_type, _) in enumerate(sorted_voices[:2]):
            if remaining_percentage <= 10:
                break
                
            # 计算这个辅音色的百分比
            if i == 0:
                # 第一辅音色
                sub_percentage = min(remaining_percentage * 0.7, 30)  # 占剩余的70%，但不超过30%
            else:
                # 第二辅音色
                sub_percentage = remaining_percentage  # 使用所有剩余百分比
                
            sub_percentage = round(sub_percentage)
            
            if sub_percentage > 10:  # 只添加占比>10%的辅音色
                # 为这个辅音色选择一个子类型（字数较多的描述）
                sub_voice_types = VOICE_TYPES[gender][voice_type]
                # 排除"一般XX音"这样的通用描述，优先选择更具体的描述
                specific_types = [t for t in sub_voice_types if not t.startswith("一般")]
                if specific_types:
                    sub_voice_type = random.choice(specific_types)
                else:
                    sub_voice_type = random.choice(sub_voice_types)
                
                secondary_voices.append({
                    "type": sub_voice_type,  # 直接使用子类型作为type
                    "percentage": sub_percentage
                })
                remaining_percentage -= sub_percentage
        
        # 按百分比降序排序辅音色
        secondary_voices.sort(key=lambda x: x["percentage"], reverse=True)
        
        # 计算匹配音色 - 返回异性对应的主音色
        opposite_gender = "male" if gender == "female" else "female"
        matched_voice = VOICE_MAPPING[gender][main_voice]
        debug_print(f"匹配音色: {matched_voice} (异性对应音色)", debug_mode)
        
        # 构建返回结果
        result = {
            "gender": gender_text,
            "genderConfidence": gender_confidence,
            "mainVoice": main_voice,
            "mainPercentage": main_percentage,
            "secondaryVoices": secondary_voices,
            "matchedVoice": matched_voice,  # 直接返回字符串，不是对象
            "features": {
                "f0_mean": float(f0_mean),
                "f0_std": float(f0_std) if f0_mean > 0 else 0,
                "spectral_centroid": float(cent_mean),
                "spectral_contrast": float(contrast_mean),
                "spectral_bandwidth": float(bandwidth_mean),
                "hnr": float(hnr),
                "f1": float(f1),
                "f2": float(f2),
                "f3": float(f3),
                "high_freq_ratio": float(high_freq_ratio),
                "duration": float(duration)
            },
            "version": VERSION,
            "analysisTime": float(time.time() - start_time)
        }
        
        end_time = time.time()
        total_time = end_time - start_time
        debug_print(f"分析完成，总耗时: {total_time:.2f}秒", debug_mode)
        
        return result
    except Exception as e:
        debug_print(f"分析过程中出错: {str(e)}", debug_mode)
        debug_print(f"错误类型: {type(e).__name__}", debug_mode)
        debug_print(f"错误堆栈: {traceback.format_exc()}", debug_mode)
        raise

def main():
    """主函数"""
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='修复版声音分析脚本')
    parser.add_argument('audio_file', nargs='?', help='要分析的音频文件路径')
    parser.add_argument('--version', action='store_true', help='显示版本信息')
    parser.add_argument('--help-more', action='store_true', help='显示更多帮助信息')
    parser.add_argument('--debug', action='store_true', help='启用详细调试输出')
    
    args = parser.parse_args()
    
    debug_print(f"Python版本: {sys.version}", args.debug)
    debug_print(f"命令行参数: {sys.argv}", args.debug)
    debug_print(f"librosa版本: {librosa.__version__}", args.debug)
    debug_print(f"numpy版本: {np.__version__}", args.debug)
    
    # 显示版本信息
    if args.version:
        print(json.dumps({
            "version": VERSION,
            "python": sys.version.split()[0],
            "librosa": librosa.__version__,
            "numpy": np.__version__,
            "pydub": "available" if PYDUB_AVAILABLE else "not available"
        }, ensure_ascii=False))
        sys.exit(0)
    
    # 显示更多帮助信息
    if args.help_more:
        print("""
修复版声音分析脚本 v1.0.4
======================

这个脚本使用librosa库分析音频文件，提取声音特征并进行分类。
增强了错误处理和兼容性，可以处理更多类型的音频文件。
优化了性能和准确性，提供更详细的音色分析。

使用方法:
  python voice_analyzer_fixed.py [音频文件路径]
  python voice_analyzer_fixed.py --version
  python voice_analyzer_fixed.py --help-more
  python voice_analyzer_fixed.py --debug [音频文件路径]

依赖库:
  - numpy
  - librosa
  - audioread
  - pydub (可选，提供额外的音频加载方法)
  - ffmpeg (系统级依赖)

支持的音频格式:
  - WAV
  - MP3
  - FLAC
  - OGG
  - 其他librosa支持的格式

分析结果:
  脚本会输出JSON格式的分析结果，包含以下信息:
  - 性别判断 (男/女)
  - 主音色类型及其百分比
  - 辅音色列表（最多3个，按百分比降序排序）
    - 每个辅音色包含类型、子类型和百分比
    - 只包含百分比大于10%的辅音色
  - 匹配音色（综合评分最高的音色类型）
  - 音频特征数据

返回格式示例:
{
  "gender": "女",
  "genderConfidence": 85,
  "mainVoice": "少女音",
  "mainPercentage": 65,
  "secondaryVoices": [
    {"type": "萝莉音", "subType": "软甜娇嗔可爱音", "percentage": 20},
    {"type": "御姐音", "subType": "温婉仙气女神音", "percentage": 15}
  ],
  "matchedVoice": "少女音",
  "features": {
    "f0_mean": 220.5,
    "f0_std": 20.3,
    "spectral_centroid": 2500.3,
    "spectral_contrast": 22.5,
    "spectral_bandwidth": 1800.2,
    "hnr": 12.8,
    "f1": 550.2,
    "f2": 1700.5,
    "f3": 2500.8,
    "high_freq_ratio": 0.35,
    "duration": 15.2
  },
  "version": "1.0.4",
  "analysisTime": 1.2
}
        """)
        sys.exit(0)
    
    # 检查是否提供了音频文件
    if not args.audio_file:
        print(json.dumps({'error': '需要提供音频文件路径'}), file=sys.stderr)
        sys.exit(1)
    
    audio_file = args.audio_file
    debug_print(f"音频文件: {audio_file}", args.debug)
    
    try:
        result = analyze_voice(audio_file, args.debug)
        # 修改这里：确保使用UTF-8编码输出，并设置ensure_ascii=False
        json_result = json.dumps(result, ensure_ascii=False)
        
        # 解决PyInstaller打包后的编码问题
        if hasattr(sys.stdout, 'buffer'):
            # 直接写入二进制数据，避免编码问题
            sys.stdout.buffer.write(json_result.encode('utf-8'))
            sys.stdout.buffer.write(b'\n')
        else:
            # 兼容模式
            print(json_result)
        
        sys.exit(0)
    except Exception as e:
        debug_print(f"分析过程中出错: {str(e)}", args.debug)
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()