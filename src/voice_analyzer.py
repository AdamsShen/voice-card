import parselmouth
import numpy as np
import librosa
import sys
import json
import random


# 加载音频文件
def load_audio(file_path):
    """加载音频文件"""
    print(f"DEBUG: 加载音频文件: {file_path}")
    try:
        # 尝试使用 parselmouth 加载
        return parselmouth.Sound(file_path)
    except Exception as e:
        print(f"DEBUG: 加载音频文件失败: {str(e)}")
        
        # 尝试使用 librosa 加载并转换为 parselmouth 格式
        try:
            import librosa
            import numpy as np
            
            # 使用 librosa 加载音频
            y, sr = librosa.load(file_path, sr=None)
            
            # 转换为 parselmouth Sound 对象
            sound = parselmouth.Sound(y, sampling_frequency=sr)
            print("DEBUG: 使用 librosa 成功加载音频")
            return sound
        except Exception as e2:
            print(f"DEBUG: 使用 librosa 加载失败: {str(e2)}")
            
            # 如果还是失败，尝试使用 soundfile
            try:
                import soundfile as sf
                
                # 使用 soundfile 加载音频
                data, samplerate = sf.read(file_path)
                
                # 确保数据是单声道的
                if len(data.shape) > 1 and data.shape[1] > 1:
                    data = data[:, 0]  # 只取第一个声道
                
                # 转换为 parselmouth Sound 对象
                sound = parselmouth.Sound(data, sampling_frequency=samplerate)
                print("DEBUG: 使用 soundfile 成功加载音频")
                return sound
            except Exception as e3:
                print(f"DEBUG: 使用 soundfile 加载失败: {str(e3)}")
                raise Exception(f"无法加载音频文件: {file_path}, 原因: {str(e)}")


# 提取基频 (F0) 和音高变化率
def extract_pitch(sound):
    print("DEBUG: 提取基频...", file=sys.stderr)
    pitch = sound.to_pitch()
    pitch_values = pitch.selected_array['frequency']
    pitch_values = pitch_values[pitch_values > 0]  # 过滤掉无声部分
    mean_pitch = np.mean(pitch_values) if len(pitch_values) > 0 else 0
    std_pitch = np.std(pitch_values) if len(pitch_values) > 0 else 0
    # 计算音高变化率
    pitch_changes = np.diff(pitch_values) if len(pitch_values) > 1 else np.array([0])
    pitch_change_rate = np.mean(np.abs(pitch_changes))
    print(f"DEBUG: 平均基频: {mean_pitch:.2f} Hz, 标准差: {std_pitch:.2f}", file=sys.stderr)
    return mean_pitch, std_pitch, pitch_change_rate


# 提取共振峰 (Formants)
def extract_formants(sound):
    print("DEBUG: 提取共振峰...", file=sys.stderr)
    formants = sound.to_formant_burg()
    f1_list, f2_list, f3_list = [], [], []
    for t in formants.ts():
        f1 = formants.get_value_at_time(1, t)  # 第一共振峰 F1
        f2 = formants.get_value_at_time(2, t)  # 第二共振峰 F2
        f3 = formants.get_value_at_time(3, t)  # 第三共振峰 F3
        if f1 > 0: f1_list.append(f1)
        if f2 > 0: f2_list.append(f2)
        if f3 > 0: f3_list.append(f3)
    
    mean_f1 = np.mean(f1_list) if len(f1_list) > 0 else 0
    mean_f2 = np.mean(f2_list) if len(f2_list) > 0 else 0
    mean_f3 = np.mean(f3_list) if len(f3_list) > 0 else 0
    
    print(f"DEBUG: 平均共振峰 - F1: {mean_f1:.2f}, F2: {mean_f2:.2f}, F3: {mean_f3:.2f}", file=sys.stderr)
    return mean_f1, mean_f2, mean_f3


# 提取辅音色的高频能量（>1000 Hz）和谐波噪声比
def extract_high_frequency_energy(file_path):
    print("DEBUG: 提取高频能量和谐波噪声比...", file=sys.stderr)
    y, sr = librosa.load(file_path)
    spectrum = np.abs(librosa.stft(y))
    freqs = librosa.fft_frequencies(sr=sr)

    # 高频能量占比计算
    high_freq_energy = spectrum[freqs > 1000].sum()
    total_energy = spectrum.sum()
    high_freq_ratio = high_freq_energy / total_energy if total_energy > 0 else 0

    # 计算谐波噪声比
    hnr = librosa.effects.harmonic(y)
    harmonic_ratio = np.sum(np.abs(hnr)) / np.sum(np.abs(y)) if np.sum(np.abs(y)) > 0 else 0

    print(f"DEBUG: 高频能量比: {high_freq_ratio:.4f}, 谐波噪声比: {harmonic_ratio:.4f}", file=sys.stderr)
    return high_freq_ratio, harmonic_ratio


# 根据基频 (mean_pitch)、共振峰 (mean_f1, mean_f3)、高频能量比例和其他特征判断性别
def classify_gender(mean_pitch, mean_f1, mean_f3, high_freq_ratio, pitch_change_rate, harmonic_ratio):
    print("DEBUG: 分析性别...", file=sys.stderr)
    # 基于多个声学特征的综合评分
    female_score = 0
    
    # 基频评分（权重：2.5）
    if mean_pitch > 190:
        female_score += 2.5
    elif mean_pitch > 165:
        female_score += 1.5
    
    # 第一共振峰评分（权重：2.0）
    if mean_f1 > 580:
        female_score += 2.0
    elif mean_f1 > 480:
        female_score += 1.0
    
    # 第三共振峰评分（权重：1.5）
    if mean_f3 > 2700:
        female_score += 1.5
    elif mean_f3 > 2400:
        female_score += 0.8
    
    # 高频能量比例评分（权重：1.0）
    if high_freq_ratio > 0.32:
        female_score += 1.0
    elif high_freq_ratio > 0.25:
        female_score += 0.5

    # 音高变化率评分（权重：1.5）
    if pitch_change_rate > 30:
        female_score += 1.5
    elif pitch_change_rate > 20:
        female_score += 0.8

    # 谐波噪声比评分（权重：1.5）
    if harmonic_ratio > 0.6:
        female_score += 1.5
    elif harmonic_ratio > 0.45:
        female_score += 0.8
    
    # 总分大于5分判定为女性（调整阈值）
    gender = "女" if female_score >= 5 else "男"
    print(f"DEBUG: 性别评分: {female_score:.2f}, 判定为: {gender}", file=sys.stderr)
    return gender


# 主音色分类
def classify_voice_type(mean_pitch, mean_f1, gender, std_pitch, high_freq_ratio):
    print("DEBUG: 分析主音色...", file=sys.stderr)
    male_voices = ['正太音', '少年音', '青受音', '青年音', '青攻音', '青叔音', '大叔音']
    female_voices = ['萝莉音', '少萝音', '少女音', '少御音', '御姐音', '御妈音', '大妈音']

    # 计算主音色百分比 (50-80%)
    f0_stability = 1.0 - min(1.0, std_pitch / 50.0) if mean_pitch > 0 else 0.5
    main_percentage = 0

    if gender == "女":
        if mean_pitch > 220 and mean_f1 > 600:
            voice_type = female_voices[0]  # 萝莉音
            main_percentage = 70 + f0_stability * 10  # 70-80%
        elif mean_pitch > 200:
            voice_type = female_voices[2]  # 少女音
            main_percentage = 65 + f0_stability * 10  # 65-75%
        elif 180 <= mean_pitch <= 200:
            voice_type = female_voices[4]  # 御姐音
            main_percentage = 60 + f0_stability * 10  # 60-70%
        else:
            voice_type = female_voices[5]  # 御妈音
            main_percentage = 55 + f0_stability * 10  # 55-65%
    else:  # 男声分类
        if mean_pitch > 150 and mean_f1 > 500:
            voice_type = male_voices[0]  # 正太音
            main_percentage = 70 + f0_stability * 10  # 70-80%
        elif mean_pitch > 130:
            voice_type = male_voices[1]  # 少年音
            main_percentage = 65 + f0_stability * 10  # 65-75%
        elif mean_pitch < 110 and mean_f1 < 400:
            voice_type = male_voices[6]  # 大叔音
            main_percentage = 55 + f0_stability * 10  # 55-65%
        else:
            voice_type = male_voices[5]  # 青叔音
            main_percentage = 60 + f0_stability * 10  # 60-70%
    
    # 确保百分比在合理范围内
    main_percentage = max(50, min(80, main_percentage))
    main_percentage = round(main_percentage)
    
    print(f"DEBUG: 主音色: {voice_type}, 百分比: {main_percentage}%", file=sys.stderr)
    return voice_type, main_percentage


# 辅音色分类
def classify_secondary_voices(mean_pitch, mean_f1, mean_f3, high_freq_ratio, gender, harmonic_ratio, main_voice, main_percentage):
    print("DEBUG: 分析辅音色...", file=sys.stderr)
    male_voices = ['正太音', '少年音', '青受音', '青年音', '青攻音', '青叔音', '大叔音']
    female_voices = ['萝莉音', '少萝音', '少女音', '少御音', '御姐音', '御妈音', '大妈音']
    
    # 选择可用的音色列表
    voice_types = female_voices if gender == "女" else male_voices
    
    # 排除主音色
    available_voices = [v for v in voice_types if v != main_voice]
    
    # 计算剩余百分比
    remaining_percentage = 100 - main_percentage
    
    # 辅音色列表
    secondary_voices = []
    
    # 第一个辅音色 - 基于共振峰和高频能量
    if gender == "女":
        if mean_f3 > 2500 and high_freq_ratio > 0.35:
            first_sub_voice = female_voices[0]  # 萝莉音
        elif mean_f3 > 2300:
            first_sub_voice = female_voices[2]  # 少女音
        elif 2000 <= mean_f3 <= 2300:
            first_sub_voice = female_voices[4]  # 御姐音
        else:
            first_sub_voice = female_voices[6]  # 大妈音
    else:  # 男声分类
        if mean_f3 > 2400 and high_freq_ratio > 0.3:
            first_sub_voice = male_voices[0]  # 正太音
        elif mean_f3 > 2200:
            first_sub_voice = male_voices[2]  # 青受音
        elif mean_f3 < 2000 and high_freq_ratio < 0.2:
            first_sub_voice = male_voices[6]  # 大叔音
        else:
            first_sub_voice = male_voices[4]  # 青攻音
    
    # 确保第一辅音色与主音色不同
    if first_sub_voice == main_voice:
        first_sub_voice = available_voices[0] if available_voices else (female_voices[0] if gender == "女" else male_voices[0])
    
    # 计算第一辅音色百分比
    first_sub_percentage = min(remaining_percentage * 0.7, 30)  # 第一辅音色占剩余的70%，但不超过30%
    first_sub_percentage = round(first_sub_percentage)
    
    if first_sub_percentage > 10:  # 只添加占比>10%的辅音色
        secondary_voices.append({
            "type": first_sub_voice,
            "percentage": first_sub_percentage
        })
        remaining_percentage -= first_sub_percentage
    
    # 排除已使用的音色
    available_voices = [v for v in available_voices if v != first_sub_voice]
    
    # 如果还有足够的百分比，添加第二个辅音色
    if remaining_percentage > 10 and available_voices:
        second_sub_voice = available_voices[0]  # 选择第一个可用的音色
        second_sub_percentage = remaining_percentage
        second_sub_percentage = round(second_sub_percentage)
        
        secondary_voices.append({
            "type": second_sub_voice,
            "percentage": second_sub_percentage
        })
    
    # 按百分比降序排序
    secondary_voices.sort(key=lambda x: x["percentage"], reverse=True)
    
    print(f"DEBUG: 辅音色: {secondary_voices}", file=sys.stderr)
    return secondary_voices


# 确定最佳匹配音色
def determine_matched_voice(gender, main_voice, secondary_voices, mean_pitch, mean_f1, mean_f3, high_freq_ratio, harmonic_ratio):
    print("DEBUG: 确定最佳匹配音色...", file=sys.stderr)
    male_voices = ['正太音', '少年音', '青受音', '青年音', '青攻音', '青叔音', '大叔音']
    female_voices = ['萝莉音', '少萝音', '少女音', '少御音', '御姐音', '御妈音', '大妈音']
    
    # 选择可用的音色列表
    voice_types = female_voices if gender == "女" else male_voices
    
    # 为所有可能的音色计算匹配分数
    match_scores = {}
    
    for voice in voice_types:
        score = 0
        
        # 基于基频计算分数
        if gender == "女":
            if voice == "萝莉音" and mean_pitch > 260:
                score += 5
            elif voice == "少萝音" and 220 < mean_pitch <= 260:
                score += 5
            elif voice == "少女音" and 200 < mean_pitch <= 220:
                score += 5
            elif voice == "少御音" and 180 < mean_pitch <= 200:
                score += 5
            elif voice == "御姐音" and mean_pitch <= 180:
                score += 5
        else:
            if voice == "正太音" and mean_pitch > 150:
                score += 5
            elif voice == "少年音" and 130 < mean_pitch <= 150:
                score += 5
            elif voice == "青年音" and 110 < mean_pitch <= 130:
                score += 5
            elif voice == "青叔音" and 90 < mean_pitch <= 110:
                score += 5
            elif voice == "大叔音" and mean_pitch <= 90:
                score += 5
        
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
    print(f"DEBUG: 最佳匹配音色: {matched_voice}", file=sys.stderr)
    return matched_voice


# 整体音频分析
def analyze_voice(file_path):
    try:
        print(f"DEBUG: 开始分析文件: {file_path}", file=sys.stderr)
        sound = load_audio(file_path)
        
        # 获取音频时长
        duration = sound.get_total_duration()
        print(f"DEBUG: 音频时长: {duration:.2f} 秒", file=sys.stderr)
        
        if duration < 1.0:
            print("DEBUG: 音频太短，无法分析", file=sys.stderr)
            raise ValueError("Audio file is too short")

        # 提取关键特征
        mean_pitch, std_pitch, pitch_change_rate = extract_pitch(sound)
        mean_f1, mean_f2, mean_f3 = extract_formants(sound)
        high_freq_ratio, harmonic_ratio = extract_high_frequency_energy(file_path)

        # 定义性别
        gender = classify_gender(mean_pitch, mean_f1, mean_f3, high_freq_ratio, pitch_change_rate, harmonic_ratio)

        # 主音色分类及百分比
        main_voice, main_percentage = classify_voice_type(mean_pitch, mean_f1, gender, std_pitch, high_freq_ratio)

        # 辅音色分类及百分比
        secondary_voices = classify_secondary_voices(mean_pitch, mean_f1, mean_f3, high_freq_ratio, gender, harmonic_ratio, main_voice, main_percentage)

        # 确定最佳匹配音色
        matched_voice = determine_matched_voice(gender, main_voice, secondary_voices, mean_pitch, mean_f1, mean_f3, high_freq_ratio, harmonic_ratio)

        # 返回结果 - 与voice_analyzer_advanced.py格式一致
        result = {
            "gender": gender,
            "mainVoice": {
                "type": main_voice,
                "percentage": main_percentage
            },
            "secondaryVoices": secondary_voices,
            "matchedVoice": matched_voice,
            "features": {
                "f0_mean": float(mean_pitch),
                "f0_std": float(std_pitch),
                "spectral_centroid": float(mean_f3),  # 使用F3作为频谱质心的近似
                "hnr": float(harmonic_ratio * 20),  # 转换为dB单位
                "duration": float(duration)
            }
        }
        
        print("DEBUG: 分析完成", file=sys.stderr)
        return result
    except Exception as e:
        print(f"DEBUG: 分析过程中出错: {str(e)}", file=sys.stderr)
        raise


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "未提供音频文件路径"}))
        return
    
    audio_file = sys.argv[1]
    print(f"DEBUG: 开始分析文件: {audio_file}")
    
    try:
        result = analyze_voice(audio_file)
        # 修复 print 函数的参数格式
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(f"DEBUG: 分析过程出错: {str(e)}")
        # 修复 print 函数的参数格式
        error_result = {'error': str(e)}
        print(json.dumps(error_result, ensure_ascii=False))


if __name__ == '__main__':
    main()