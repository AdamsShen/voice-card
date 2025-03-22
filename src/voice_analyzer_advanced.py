#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
高级声音分析脚本
使用librosa库进行声音分析，不依赖parselmouth
"""

import sys
import json
import os
import numpy as np
import librosa
import argparse
import random
import time

# 版本信息
VERSION = "1.0.0"

def debug_print(message):
    """打印调试信息到stderr"""
    print(f"DEBUG: {message}", file=sys.stderr)

def analyze_voice(file_path):
    """
    使用librosa分析声音文件
    提取音频特征并进行分类
    """
    start_time = time.time()
    debug_print(f"开始分析文件: {file_path}")
    
    # 检查文件是否存在
    if not os.path.exists(file_path):
        debug_print(f"文件不存在: {file_path}")
        raise FileNotFoundError(f"文件不存在: {file_path}")
    
    # 检查文件大小
    file_size = os.path.getsize(file_path)
    debug_print(f"文件大小: {file_size} 字节")
    
    if file_size == 0:
        debug_print("文件为空")
        raise ValueError(f"文件为空: {file_path}")
    
    # 加载音频文件 - 平衡点1: 使用较高的采样率，但限制音频长度
    debug_print("加载音频文件...")
    try:
        # 使用22050Hz的采样率，这是librosa的默认值，对于人声分析足够了
        # 分析前30秒的音频，这应该足够捕捉到声音特征
        y, sr = librosa.load(file_path, sr=22050, duration=30.0, mono=True)
        load_time = time.time()
        debug_print(f"音频加载成功，耗时: {load_time - start_time:.2f}秒")
        debug_print(f"采样率: {sr} Hz, 长度: {len(y)} 样本")
        
        # 检查音频长度
        duration = librosa.get_duration(y=y, sr=sr)
        debug_print(f"音频时长: {duration:.2f} 秒")
        
        if duration < 1.0:
            debug_print("音频太短，无法分析")
            raise ValueError("音频文件太短，无法分析")
        
        # 提取特征 - 平衡点2: 使用适中的参数提取特征
        debug_print("提取音频特征...")
        
        # 提取基频 (F0) - 平衡点3: 使用更准确的参数
        debug_print("提取基频...")
        # 使用适中的帧率来平衡准确性和速度
        hop_length = 256  # 默认值，提供更好的时间分辨率
        fmin = 50  # 最低频率，覆盖更广的男声范围
        fmax = 600  # 最高频率，覆盖更广的女声范围
        
        # 使用pyin算法提取基频，这是一个较为准确的算法
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y, 
            fmin=fmin,
            fmax=fmax,
            sr=sr,
            hop_length=hop_length,
            fill_na=None  # 不填充NaN值，保持原始结果
        )
        
        # 过滤掉NaN值
        f0_valid = f0[~np.isnan(f0)]
        if len(f0_valid) == 0:
            debug_print("无法检测到基频，可能是噪音")
            f0_mean = 0
        else:
            # 使用中位数而不是平均值，对异常值更鲁棒
            f0_mean = np.median(f0_valid)
            f0_std = np.std(f0_valid)
            debug_print(f"基频标准差: {f0_std:.2f} Hz (变化程度)")
        
        f0_time = time.time()
        debug_print(f"基频提取完成，耗时: {f0_time - load_time:.2f}秒")
        debug_print(f"平均基频: {f0_mean:.2f} Hz")
        
        # 提取频谱质心 - 平衡点4: 使用默认参数提高准确性
        debug_print("提取频谱质心...")
        cent = librosa.feature.spectral_centroid(y=y, sr=sr)
        cent_mean = np.mean(cent)
        cent_time = time.time()
        debug_print(f"频谱质心提取完成，耗时: {cent_time - f0_time:.2f}秒")
        debug_print(f"平均频谱质心: {cent_mean:.2f}")
        
        # 提取谐波与噪声比 - 平衡点5: 使用更准确的HPSS分离
        debug_print("提取谐波与噪声比...")
        y_harmonic, y_percussive = librosa.effects.hpss(y)
        harmonic_mean = np.mean(np.abs(y_harmonic))
        percussive_mean = np.mean(np.abs(y_percussive))
        hnr = 0 if percussive_mean == 0 else 20 * np.log10(harmonic_mean / percussive_mean)
        
        hnr_time = time.time()
        debug_print(f"谐波噪声比提取完成，耗时: {hnr_time - cent_time:.2f}秒")
        debug_print(f"谐波与噪声比: {hnr:.2f} dB")
        
        # 平衡点6: 添加额外的特征提取，提高分类准确性
        # 提取频谱对比度
        contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
        contrast_mean = np.mean(contrast)
        
        # 提取频谱带宽
        bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
        bandwidth_mean = np.mean(bandwidth)
        
        debug_print(f"频谱对比度: {contrast_mean:.2f}")
        debug_print(f"频谱带宽: {bandwidth_mean:.2f}")
        
        # 基于特征进行分类
        debug_print("基于特征进行分类...")
        
        # 基于基频判断性别 (一般男声<165Hz，女声>165Hz)
        # 平衡点7: 使用更复杂的性别判断逻辑
        gender_score = 0
        
        # 基于基频评分
        if f0_mean > 0:
            if f0_mean < 140:  # 明显的男声
                gender_score -= 2
            elif f0_mean < 165:  # 可能是男声
                gender_score -= 1
            elif f0_mean > 200:  # 明显的女声
                gender_score += 2
            elif f0_mean >= 165:  # 可能是女声
                gender_score += 1
        
        # 基于频谱质心评分
        if cent_mean < 1800:  # 男声特征
            gender_score -= 1
        elif cent_mean > 2200:  # 女声特征
            gender_score += 1
        
        # 基于频谱对比度评分
        if contrast_mean < 20:  # 男声特征
            gender_score -= 0.5
        elif contrast_mean > 25:  # 女声特征
            gender_score += 0.5
        
        # 最终性别判断
        if gender_score > 0:
            gender = "女"
            debug_print(f"基于综合评分 {gender_score} 判断为女声")
        else:
            gender = "男"
            debug_print(f"基于综合评分 {gender_score} 判断为男声")
        
        # 根据性别和特征选择音色类型
        male_voices = ['正太音', '少年音', '青受音', '青年音', '青攻音', '青叔音', '大叔音']
        female_voices = ['萝莉音', '少萝音', '少女音', '少御音', '御姐音', '御妈音', '大妈音']
        
        # 平衡点8: 使用更复杂的音色分类逻辑
        if gender == "女":
            # 女声分类 - 使用更精细的基频范围
            if f0_mean > 280:  # 非常高音区
                main_voice = female_voices[0]  # 萝莉音
            elif f0_mean > 240:  # 高音区
                main_voice = female_voices[0] if bandwidth_mean > 2000 else female_voices[1]  # 萝莉音或少萝音
            elif f0_mean > 210:  # 中高音区
                main_voice = female_voices[1]  # 少萝音
            elif f0_mean > 190:  # 中音区
                main_voice = female_voices[2]  # 少女音
            elif f0_mean > 175:  # 中低音区
                main_voice = female_voices[3]  # 少御音
            else:  # 低音区
                main_voice = female_voices[4]  # 御姐音
            
            # 根据谐波噪声比和频谱对比度选择辅音色
            if hnr > 15 and contrast_mean > 25:  # 声音清亮且对比度高
                sub_voice = female_voices[2]  # 少女音
            elif hnr > 12:  # 声音较清亮
                sub_voice = female_voices[1] if f0_mean > 200 else female_voices[3]  # 根据音高选择
            else:  # 声音沙哑
                sub_voice = female_voices[4]  # 御姐音
            
            # 确保主辅音色不同
            if sub_voice == main_voice:
                sub_voice = female_voices[5]  # 御妈音
        else:
            # 男声分类 - 使用更精细的基频范围
            if f0_mean > 160:  # 非常高音区
                main_voice = male_voices[0]  # 正太音
            elif f0_mean > 140:  # 高音区
                main_voice = male_voices[0] if bandwidth_mean > 1800 else male_voices[1]  # 正太音或少年音
            elif f0_mean > 120:  # 中高音区
                main_voice = male_voices[1]  # 少年音
            elif f0_mean > 100:  # 中音区
                main_voice = male_voices[3]  # 青年音
            elif f0_mean > 85:  # 中低音区
                main_voice = male_voices[5]  # 青叔音
            else:  # 低音区
                main_voice = male_voices[6]  # 大叔音
            
            # 根据谐波噪声比和频谱对比度选择辅音色
            if hnr > 12 and contrast_mean > 20:  # 声音清亮且对比度高
                sub_voice = male_voices[2]  # 青受音
            elif hnr > 8:  # 声音较清亮
                sub_voice = male_voices[1] if f0_mean > 110 else male_voices[3]  # 根据音高选择
            else:  # 声音沙哑
                sub_voice = male_voices[4]  # 青攻音
            
            # 确保主辅音色不同
            if sub_voice == main_voice:
                sub_voice = male_voices[3]  # 青年音
        
        classification_time = time.time()
        debug_print(f"音色分类完成，耗时: {classification_time - hnr_time:.2f}秒")
        debug_print(f"分析结果 - 性别: {gender}, 主音色: {main_voice}, 辅音色: {sub_voice}")
        
        # 计算主音色和辅音色的比例
        # 平衡点9: 使用更精细的比例计算
        # 基于特征计算主音色比例，范围在50-80%之间
        main_percentage = 0
        
        # 计算基频的稳定性 - 标准差越小，主音色比例越高
        f0_stability = 1.0 - min(1.0, f0_std / 50.0) if f0_mean > 0 else 0.5
        
        if gender == "女":
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
        
        # 生成多个辅音色（最多3个）
        secondary_voices = []
        
        # 添加第一个辅音色（已经确定的sub_voice）
        remaining_percentage = 100 - main_percentage
        first_sub_percentage = min(remaining_percentage * 0.7, 30)  # 第一辅音色占剩余的70%，但不超过30%
        first_sub_percentage = round(first_sub_percentage)
        
        if first_sub_percentage > 10:  # 只添加占比>10%的辅音色
            secondary_voices.append({
                "type": sub_voice,
                "percentage": first_sub_percentage
            })
            remaining_percentage -= first_sub_percentage
        
        # 根据性别选择可能的辅音色
        voice_types = female_voices if gender == "女" else male_voices
        
        # 排除已使用的音色
        available_voices = [v for v in voice_types if v != main_voice and v != sub_voice]
        
        # 平衡点10: 更智能地选择额外的辅音色
        # 根据频谱特征选择额外的辅音色，而不是随机选择
        available_voices_scores = {}
        
        for voice in available_voices:
            score = 0
            
            # 基于基频评分
            if gender == "女":
                if voice in ["萝莉音", "少萝音"] and f0_mean > 220:
                    score += 3
                elif voice in ["少女音"] and 190 < f0_mean <= 220:
                    score += 3
                elif voice in ["少御音"] and 175 < f0_mean <= 190:
                    score += 3
                elif voice in ["御姐音", "御妈音"] and f0_mean <= 175:
                    score += 3
            else:
                if voice in ["正太音", "少年音"] and f0_mean > 130:
                    score += 3
                elif voice in ["青年音", "青受音"] and 100 < f0_mean <= 130:
                    score += 3
                elif voice in ["青叔音", "青攻音"] and 85 < f0_mean <= 100:
                    score += 3
                elif voice in ["大叔音"] and f0_mean <= 85:
                    score += 3
            
            # 基于谐波噪声比评分
            if gender == "女":
                if voice in ["少女音", "萝莉音"] and hnr > 15:
                    score += 2
                elif voice in ["御姐音", "大妈音"] and hnr <= 15:
                    score += 2
            else:
                if voice in ["青受音", "正太音"] and hnr > 10:
                    score += 2
                elif voice in ["青攻音", "大叔音"] and hnr <= 10:
                    score += 2
            
            available_voices_scores[voice] = score
        
        # 按分数排序
        sorted_voices = sorted(available_voices_scores.items(), key=lambda x: x[1], reverse=True)
        
        # 选择得分最高的两个辅音色
        for i, (voice_type, _) in enumerate(sorted_voices[:2]):
            if remaining_percentage <= 10:
                break
                
            # 计算这个辅音色的百分比
            if i == 0 and remaining_percentage > 20:
                # 第二辅音色
                sub_percentage = min(remaining_percentage * 0.6, 20)  # 占剩余的60%，但不超过20%
            else:
                # 第三辅音色
                sub_percentage = remaining_percentage  # 使用所有剩余百分比
                
            sub_percentage = round(sub_percentage)
            
            if sub_percentage > 10:  # 只添加占比>10%的辅音色
                secondary_voices.append({
                    "type": voice_type,
                    "percentage": sub_percentage
                })
                remaining_percentage -= sub_percentage
        
        # 按百分比降序排序辅音色
        secondary_voices.sort(key=lambda x: x["percentage"], reverse=True)
        
        percentage_time = time.time()
        debug_print(f"音色比例计算完成，耗时: {percentage_time - classification_time:.2f}秒")
        debug_print(f"音色比例 - 主音色: {main_voice} {main_percentage}%, 辅音色: {secondary_voices}")
        
        # 计算匹配音色 - 平衡点11: 使用更全面的评分系统
        # 匹配音色是基于声音特征综合评分最高的音色
        match_scores = {}
        
        # 为所有可能的音色计算匹配分数
        all_voices = female_voices if gender == "女" else male_voices
        
        for voice in all_voices:
            score = 0
            
            # 基于基频计算分数 - 更精细的范围
            if gender == "女":
                if voice == "萝莉音" and f0_mean > 260:
                    score += 5
                elif voice == "萝莉音" and 240 < f0_mean <= 260:
                    score += 4
                elif voice == "少萝音" and 220 < f0_mean <= 240:
                    score += 5
                elif voice == "少萝音" and 210 < f0_mean <= 220:
                    score += 4
                elif voice == "少女音" and 200 < f0_mean <= 210:
                    score += 5
                elif voice == "少女音" and 190 < f0_mean <= 200:
                    score += 4
                elif voice == "少御音" and 180 < f0_mean <= 190:
                    score += 5
                elif voice == "少御音" and 175 < f0_mean <= 180:
                    score += 4
                elif voice == "御姐音" and f0_mean <= 175:
                    score += 5
            else:
                if voice == "正太音" and f0_mean > 160:
                    score += 5
                elif voice == "正太音" and 150 < f0_mean <= 160:
                    score += 4
                elif voice == "少年音" and 140 < f0_mean <= 150:
                    score += 5
                elif voice == "少年音" and 130 < f0_mean <= 140:
                    score += 4
                elif voice == "青年音" and 120 < f0_mean <= 130:
                    score += 5
                elif voice == "青年音" and 110 < f0_mean <= 120:
                    score += 4
                elif voice == "青叔音" and 100 < f0_mean <= 110:
                    score += 5
                elif voice == "青叔音" and 90 < f0_mean <= 100:
                    score += 4
                elif voice == "大叔音" and f0_mean <= 90:
                    score += 5
            
            # 基于谐波噪声比计算分数 - 更精细的评分
            if gender == "女":
                if voice in ["少女音", "萝莉音"] and hnr > 18:
                    score += 3
                elif voice in ["少女音", "萝莉音"] and 15 < hnr <= 18:
                    score += 2
                elif voice in ["御姐音", "大妈音"] and hnr < 12:
                    score += 3
                elif voice in ["御姐音", "大妈音"] and 12 <= hnr <= 15:
                    score += 2
            else:
                if voice in ["青受音", "正太音"] and hnr > 12:
                    score += 3
                elif voice in ["青受音", "正太音"] and 10 < hnr <= 12:
                    score += 2
                elif voice in ["青攻音", "大叔音"] and hnr < 8:
                    score += 3
                elif voice in ["青攻音", "大叔音"] and 8 <= hnr <= 10:
                    score += 2
            
            # 基于频谱对比度计算分数
            if gender == "女":
                if voice in ["萝莉音", "少女音"] and contrast_mean > 25:
                    score += 2
                elif voice in ["御姐音", "御妈音"] and contrast_mean < 20:
                    score += 2
            else:
                if voice in ["正太音", "青受音"] and contrast_mean > 20:
                    score += 2
                elif voice in ["大叔音", "青攻音"] and contrast_mean < 15:
                    score += 2
            
            # 如果是主音色，加分
            if voice == main_voice:
                score += 3
            
            # 如果是辅音色之一，也加分
            for sec_voice in secondary_voices:
                if voice == sec_voice["type"]:
                    score += sec_voice["percentage"] / 15  # 辅音色百分比越高，加分越多
            
            match_scores[voice] = score
        
        # 找出得分最高的音色作为匹配音色
        matched_voice = max(match_scores.items(), key=lambda x: x[1])[0]
        
        matching_time = time.time()
        debug_print(f"匹配音色计算完成，耗时: {matching_time - percentage_time:.2f}秒")
        debug_print(f"匹配音色: {matched_voice}, 分数: {match_scores}")
        
        # 构建返回结果
        result = {
            "gender": gender,
            "mainVoice": main_voice,
            "mainPercentage": main_percentage,
            "secondaryVoices": secondary_voices,
            "matchedVoice": matched_voice,  # 添加匹配音色
            "features": {
                "f0_mean": float(f0_mean),
                "f0_std": float(f0_std) if f0_mean > 0 else 0,
                "spectral_centroid": float(cent_mean),
                "spectral_contrast": float(contrast_mean),
                "spectral_bandwidth": float(bandwidth_mean),
                "hnr": float(hnr),
                "duration": float(duration)
            }
        }
        
        end_time = time.time()
        total_time = end_time - start_time
        debug_print(f"分析完成，总耗时: {total_time:.2f}秒")
        
        return result
    except Exception as e:
        debug_print(f"librosa分析失败: {str(e)}")
        raise

def main():
    """主函数"""
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='高级声音分析脚本')
    parser.add_argument('audio_file', nargs='?', help='要分析的音频文件路径')
    parser.add_argument('--version', action='store_true', help='显示版本信息')
    parser.add_argument('--help-more', action='store_true', help='显示更多帮助信息')
    
    args = parser.parse_args()
    
    debug_print(f"Python版本: {sys.version}")
    debug_print(f"命令行参数: {sys.argv}")
    debug_print(f"librosa版本: {librosa.__version__}")
    debug_print(f"numpy版本: {np.__version__}")
    
    # 显示版本信息
    if args.version:
        print(json.dumps({
            "version": VERSION,
            "python": sys.version.split()[0],
            "librosa": librosa.__version__,
            "numpy": np.__version__
        }, ensure_ascii=False))
        sys.exit(0)
    
    # 显示更多帮助信息
    if args.help_more:
        print("""
高级声音分析脚本
===============

这个脚本使用librosa库分析音频文件，提取声音特征并进行分类。

使用方法:
  python voice_analyzer_advanced.py [音频文件路径]
  python voice_analyzer_advanced.py --version
  python voice_analyzer_advanced.py --help-more

依赖库:
  - numpy
  - librosa

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
    - 每个辅音色包含类型和百分比
    - 只包含百分比大于10%的辅音色
  - 匹配音色（综合评分最高的音色类型）
  - 音频特征数据

返回格式示例:
{
  "gender": "女",
  "mainVoice": "少女音",
  "mainPercentage": 65,
  "secondaryVoices": [
    {"type": "萝莉音", "percentage": 20},
    {"type": "御姐音", "percentage": 15}
  ],
  "matchedVoice": "少女音",
  "features": {
    "f0_mean": 220.5,
    "f0_std": 20.3,
    "spectral_centroid": 2500.3,
    "spectral_contrast": 22.5,
    "spectral_bandwidth": 1800.2,
    "hnr": 12.8,
    "duration": 15.2
  }
}
        """)
        sys.exit(0)
    
    # 检查是否提供了音频文件
    if not args.audio_file:
        print(json.dumps({'error': '需要提供音频文件路径'}), file=sys.stderr)
        sys.exit(1)
    
    audio_file = args.audio_file
    debug_print(f"音频文件: {audio_file}")
    
    try:
        result = analyze_voice(audio_file)
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)
    except Exception as e:
        debug_print(f"分析过程中出错: {str(e)}")
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main() 