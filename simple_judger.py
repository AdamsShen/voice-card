#!/usr/bin/env python
# -*- coding: utf-8 -*-

import random
import os
import simple_logger
import simple_config
import simple_model
import simple_sound
from simple_praat import Praat
from simple_utils import delete_file

log = simple_logger.get_logger(__name__)
conf = simple_config.get_config()

class ResultRow:
    def __init__(self, model_id, name, score):
        """
        初始化结果行
        
        参数:
            model_id: 模型ID
            name: 模型名称
            score: 相似度得分
        """
        self.id = model_id
        self.name = name
        self.score = score
    
    def __repr__(self):
        return f"ResultRow(id={self.id}, name={self.name}, score={self.score})"

class VoiceResult:
    def __init__(self, result_list, gender=None):
        """
        初始化声音分析结果
        
        参数:
            result_list: 排序后的(模型,得分)元组列表
            gender: 性别 (0为男性，1为女性，None为自动判断)
        """
        # 保存性别参数
        self.gender = gender
        
        # 打印原始得分列表
        log.info("原始得分列表:")
        for i, (model, score) in enumerate(result_list):
            log.info(f"  模型 {i+1}: {model.name}, 得分: {score}")
        
        # 计算总分
        total_score = sum(score for _, score in result_list)
        log.info(f"总分: {total_score}")
        
        # 确保总分不为零
        if total_score <= 0:
            log.warning("总分为零或负数，设置为默认值 1.0")
            total_score = 1.0
        
        # 主音色 (得分最高的模型)
        main_model, main_score = result_list[0]
        
        # 计算百分比，确保不是NaN
        main_percent = 100 * main_score / total_score
        log.info(f"主音色 {main_model.name} 得分: {main_score}, 计算百分比: {main_score} / {total_score} * 100 = {main_percent:.2f}%")
        
        if main_percent != main_percent:  # 检查NaN
            log.warning("主音色百分比为NaN，设置为默认值 25.0%")
            main_percent = 25.0
        
        self.main = ResultRow(
            main_model.id, 
            main_model.name, 
            f"{main_percent:.2f}"
        )
        
        # 保存原始结果列表，用于后续查找异性音色
        self.all_results = result_list
        
        # 辅音色 (按得分从大到小排序)
        self.sub = []
        
        # 处理辅音色 (从第二个开始，因为第一个是主音色)
        log.info("处理辅音色:")
        for i in range(1, len(result_list)):
            model, score = result_list[i]
            
            # 计算百分比，确保不是NaN
            sub_percent = 100 * score / total_score
            log.info(f"辅音色 {i} {model.name} 得分: {score}, 计算百分比: {score} / {total_score} * 100 = {sub_percent:.2f}%")
            
            if sub_percent != sub_percent:  # 检查NaN
                default_percent = 25.0 / (i + 1)
                log.warning(f"辅音色 {i} 百分比为NaN，设置为默认值 {default_percent:.2f}%")
                sub_percent = default_percent
            
            # 过滤掉比例小于1%的辅音色
            if sub_percent < 1.0:
                log.info(f"辅音色 {i} {model.name} 百分比 {sub_percent:.2f}% 小于1%，不添加")
                continue
                
            mapping = simple_model.mapping_models().get(model.name, [])
            
            if mapping:
                sub_model = random.choice(mapping)
                log.info(f"辅音色 {i} 使用映射模型: {sub_model.name}")
                self.sub.append(ResultRow(
                    sub_model.id,
                    sub_model.name,
                    f"{sub_percent:.2f}"
                ))
            else:
                # 如果没有映射模型，使用原模型
                log.info(f"辅音色 {i} 没有映射模型，使用原模型: {model.name}")
                self.sub.append(ResultRow(
                    model.id,
                    model.name,
                    f"{sub_percent:.2f}"
                ))
        
        # 打印最终结果
        log.info(f"最终主音色: {self.main.name}, 百分比: {self.main.score}%")
        for i, sub in enumerate(self.sub):
            log.info(f"最终辅音色 {i+1}: {sub.name}, 百分比: {sub.score}%")
            
        self.opposite_match = self._calculate_opposite_match()
    
    def __repr__(self):
        return f"VoiceResult(main={self.main}, sub={self.sub})"
    
    def _calculate_opposite_match(self):
        """
        计算最佳匹配的异性音色（内部方法）
        
        返回:
            最佳匹配的异性音色ResultRow对象，如果没有则返回None
        """
        # 确定主音色的性别
        main_gender = None
        for model, _ in self.all_results:
            if model.name == self.main.name:
                main_gender = model.gender
                break
        
        if main_gender is None:
            log.warning("无法确定主音色的性别")
            return None
        
        # 寻找最佳匹配的异性音色
        opposite_gender = 1 if main_gender == 0 else 0
        
        # 如果指定了性别，需要额外获取异性音色的模型
        if self.gender is not None:
            # 获取异性音色的模型
            opposite_models = simple_model.male_models() if self.gender == 1 else simple_model.female_models()
            
            # 获取第一个主音色的基频分布
            main_model = None
            for model, _ in self.all_results:
                if model.name == self.main.name:
                    main_model = model
                    break
            
            if main_model is None:
                log.warning("无法找到主音色的模型")
                return None
            
            # 计算与异性音色的相似度
            opposite_results = []
            for model in opposite_models:
                similarity = simple_sound.compare_pitch_similarity(main_model.pitch_percentage, model.pitch_percentage)
                opposite_results.append((model, similarity))
                log.info(f"主音色与{model.name}的相似度: {similarity * 100:.2f}%")
            
            # 按相似度降序排序
            opposite_results.sort(key=lambda x: -x[1])
            
            # 返回最相似的异性音色
            if opposite_results:
                best_model, _ = opposite_results[0]
                return ResultRow(best_model.id, best_model.name, "")
        else:
            # 如果未指定性别，从现有结果中查找
            for model, _ in self.all_results:
                if model.gender == opposite_gender:
                    # 找到第一个异性音色
                    return ResultRow(model.id, model.name, "")
        
        log.warning("未找到匹配的异性音色")
        return None
    
    def get_opposite_gender_match(self):
        """
        获取最佳匹配的异性音色
        
        返回:
            最佳匹配的异性音色ResultRow对象，如果没有则返回None
        """
        return self.opposite_match

def get_models_by_gender(gender):
    """
    根据性别获取模型列表
    
    参数:
        gender: 性别 (0为男性，1为女性)
    
    返回:
        相应性别的模型列表
    """
    if gender == 0:
        return simple_model.male_models()
    else:
        return simple_model.female_models()

def judge_voice(file_path, gender=None):
    """
    判断声音类型
    
    参数:
        file_path: 音频文件路径
        gender: 性别 (0为男性，1为女性，None为自动判断)
    
    返回:
        VoiceResult对象
    """
    try:
        # 从文件路径中提取文件名和扩展名
        file_name = os.path.basename(file_path)
        name, ext = os.path.splitext(file_name)
        name = name.strip('.')  # 移除可能的点号
        ext = ext.lstrip('.')   # 移除扩展名前的点号
        
        log.info(f"开始分析声音: {file_path}, 性别: {gender}")
        
        # 使用Praat提取基频特征
        script_path = os.path.join(conf.script_dir, f"{name}.praat")
        
        praat = Praat(
            script_path,
            file_path,  # 直接传递完整的文件路径
            name,
            ext,
            conf.csv_path
        )
        
        pitch_data = praat.praat()
        
        # 检查是否有有效的基频数据
        if pitch_data.empty:
            log.warning("基频数据为空，使用默认值")
            # 创建一个默认的结果
            if gender is None:
                # 如果未指定性别，同时使用男性和女性模型
                male_models = simple_model.male_models()[:2]
                female_models = simple_model.female_models()[:2]
                models = male_models + female_models
            else:
                models = get_models_by_gender(gender)[:4]
            
            results = [(model, 0.25) for model in models]
            return VoiceResult(results, gender)
        # 将基频数据输出到日志
        log.info(f"pitch_data: {pitch_data}")
        
        # 将基频数据保存到文件
        # pitch_data_file = os.path.join(conf.csv_path, f"{name}_pitch_data.csv")
        # try:
        #     pitch_data.to_csv(pitch_data_file, index=False)
        #     log.info(f"基频数据已保存到文件: {pitch_data_file}")
        # except Exception as e:
        #     log.error(f"保存基频数据到文件失败: {str(e)}")
        pitch_percentage = simple_sound.get_pitch_percentage(pitch_data)
        log.info(f"pitch_percentage: {pitch_percentage}")
        # 如果未指定性别，同时与男性和女性模型进行比较
        if gender is None:
            # 获取男性和女性模型
            male_models = simple_model.male_models()
            female_models = simple_model.female_models()
            
            # 计算与所有模型的相似度
            results = []
            
            # 与男性模型比较
            for model in male_models:
                similarity = simple_sound.compare_pitch_similarity(pitch_percentage, model.pitch_percentage)
                results.append((model, similarity))
                log.info(f"与{model.name}的相似度: {similarity * 100:.2f}%")
            
            # 与女性模型比较
            for model in female_models:
                similarity = simple_sound.compare_pitch_similarity(pitch_percentage, model.pitch_percentage)
                results.append((model, similarity))
                log.info(f"与{model.name}的相似度: {similarity * 100:.2f}%")
            
            # 按相似度降序排序
            results.sort(key=lambda x: -x[1])
            
            # 获取主音色（得分最高的）
            main_result = [results[0]]
            
            # 从剩余结果中随机选择3个辅音色
            remaining_results = results[1:]
            import random
            # 如果剩余结果不足3个，则全部使用
            if len(remaining_results) <= 3:
                secondary_results = remaining_results
            else:
                # 随机选择3个辅音色
                secondary_results = random.sample(remaining_results, 3)
            
            # 合并主音色和随机选择的辅音色
            final_results = main_result + secondary_results
            log.info("最终选择的结果:")
            for i, (model, score) in enumerate(final_results):
                log.info(f"  {i}. {model.name}: {score * 100:.2f}%")
            
            # 创建结果对象
            return VoiceResult(final_results, gender)
        else:
            # 如果指定了性别，只与相应性别的模型比较
            # 获取相应性别的模型
            models = get_models_by_gender(gender)
            
            # 计算与每个模型的相似度
            results = []
            for model in models:
                similarity = simple_sound.compare_pitch_similarity(pitch_percentage, model.pitch_percentage)
                results.append((model, similarity))
                log.info(f"与{model.name}的相似度: {similarity * 100:.2f}%")
            
            # 按相似度降序排序
            results.sort(key=lambda x: -x[1])
            
            # 获取主音色（得分最高的）
            main_result = [results[0]]
            
            # 从剩余结果中随机选择3个辅音色
            remaining_results = results[1:]
            import random
            # 如果剩余结果不足3个，则全部使用
            if len(remaining_results) <= 3:
                secondary_results = remaining_results
            else:
                # 随机选择3个辅音色
                secondary_results = random.sample(remaining_results, 3)
            
            # 合并主音色和随机选择的辅音色
            final_results = main_result + secondary_results
            log.info("最终选择的结果:")
            for i, (model, score) in enumerate(final_results):
                log.info(f"  {i}. {model.name}: {score * 100:.2f}%")
            
            # 创建结果对象
            return VoiceResult(final_results, gender)
    except Exception as e:
        log.error(f"声音分析失败: {str(e)}")
        # 创建一个默认的结果
        try:
            if gender is None:
                # 如果未指定性别，同时使用男性和女性模型
                male_models = simple_model.male_models()[:2]
                female_models = simple_model.female_models()[:2]
                models = male_models + female_models
            else:
                models = get_models_by_gender(gender)[:4]
            
            results = [(model, 0.25) for model in models]
            return VoiceResult(results, gender)
        except:
            # 如果连默认结果都无法创建，抛出异常
            raise
    finally:
        pass

def format_result(result):
    """
    格式化分析结果为易读的字符串
    
    参数:
        result: VoiceResult对象
    
    返回:
        格式化的结果字符串
    """
    output = [
        f"主音色: {result.main.name} {result.main.score}%"
    ]
    
    # 添加最佳匹配的异性音色
    opposite_match = result.get_opposite_gender_match()
    if opposite_match:
        output.append(f"最佳匹配异性音: {opposite_match.name}")
    
    output.append("辅音色:")
    for sub in result.sub:
        output.append(f"  {sub.name} {sub.score}%")
    
    return "\n".join(output) 